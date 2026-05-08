from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
import os, uuid, aiofiles

from backend.core.database import get_db
from backend.core.security import get_current_user, require_finance
from backend.models.expense import Expense, Receipt, ExpenseApproval, ExpenseCategory
from backend.models.user import User
from backend.services.ocr_service import extract_receipt_data_with_ocr, extract_receipt_data_with_ai

router = APIRouter(prefix="/expenses", tags=["Expenses"])

UPLOAD_DIR = "/tmp/receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ExpenseCreate(BaseModel):
    description: str
    amount: float
    expense_date: datetime
    category_id: Optional[int] = None
    grant_id: Optional[int] = None
    programme_id: Optional[int] = None
    payment_method: Optional[str] = "card"
    notes: Optional[str] = None
    receipt_id: Optional[int] = None


class ApprovalCreate(BaseModel):
    decision: str  # approved / rejected
    notes: Optional[str] = None


# ── Receipt Upload & OCR ──────────────────────────────────────────────────────

@router.post("/receipts/upload", status_code=201)
async def upload_receipt(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed_types = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File must be JPEG, PNG or PDF")

    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Save file
    ext = file.filename.split(".")[-1].lower()
    unique_name = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    receipt = Receipt(
        organisation_id=current_user.organisation_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        storage_path=file_path,
        file_type=ext,
        ocr_status="pending",
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    # Kick off OCR in background
    background_tasks.add_task(_process_receipt_ocr, receipt.id, file_path)

    return {
        "id": receipt.id,
        "filename": receipt.filename,
        "status": "uploaded",
        "message": "OCR extraction queued",
    }


async def _process_receipt_ocr(receipt_id: int, file_path: str):
    """Background task: run OCR and AI extraction on a receipt."""
    from backend.core.database import SessionLocal
    db = SessionLocal()
    try:
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return
        receipt.ocr_status = "processing"
        db.commit()

        ocr_data = await extract_receipt_data_with_ocr(file_path)

        # Try AI enhancement if API key set
        try:
            from backend.core.settings import settings
            if settings.ANTHROPIC_API_KEY and ocr_data.get("raw_text"):
                ai_data = await extract_receipt_data_with_ai(file_path, ocr_data["raw_text"])
                if ai_data and not ai_data.get("error"):
                    ocr_data.update(ai_data)
        except Exception:
            pass

        receipt.ocr_raw = ocr_data.get("raw_text", "")
        receipt.ocr_merchant = ocr_data.get("merchant")
        receipt.ocr_amount = Decimal(str(ocr_data["amount"])) if ocr_data.get("amount") else None
        receipt.ocr_date = ocr_data.get("date")
        receipt.ocr_vat = Decimal(str(ocr_data["vat"])) if ocr_data.get("vat") else None
        receipt.ocr_category = ocr_data.get("category")
        receipt.ocr_confidence = Decimal(str(ocr_data.get("confidence", 0)))
        receipt.ocr_status = "done"
        db.commit()
    except Exception as e:
        db.query(Receipt).filter(Receipt.id == receipt_id).update({"ocr_status": "failed"})
        db.commit()
    finally:
        db.close()


@router.get("/receipts")
async def list_receipts(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Receipt).filter(Receipt.organisation_id == current_user.organisation_id)
    if status:
        q = q.filter(Receipt.ocr_status == status)
    receipts = q.order_by(desc(Receipt.created_at)).limit(100).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "ocr_status": r.ocr_status,
            "merchant": r.ocr_merchant,
            "amount": float(r.ocr_amount) if r.ocr_amount else None,
            "date": r.ocr_date.isoformat() if r.ocr_date else None,
            "category": r.ocr_category,
            "confidence": float(r.ocr_confidence) if r.ocr_confidence else None,
            "expense_id": r.expense_id,
            "created_at": r.created_at.isoformat(),
        }
        for r in receipts
    ]


@router.get("/receipts/{receipt_id}")
async def get_receipt(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {
        "id": r.id, "filename": r.filename, "ocr_status": r.ocr_status,
        "ocr_raw": r.ocr_raw, "merchant": r.ocr_merchant,
        "amount": float(r.ocr_amount) if r.ocr_amount else None,
        "date": r.ocr_date.isoformat() if r.ocr_date else None,
        "vat": float(r.ocr_vat) if r.ocr_vat else None,
        "category": r.ocr_category,
        "confidence": float(r.ocr_confidence) if r.ocr_confidence else None,
    }


# ── Expense Claims ────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = Expense(
        organisation_id=current_user.organisation_id,
        claimant_id=current_user.id,
        description=data.description,
        amount=Decimal(str(data.amount)),
        expense_date=data.expense_date,
        category_id=data.category_id,
        grant_id=data.grant_id,
        programme_id=data.programme_id,
        payment_method=data.payment_method,
        notes=data.notes,
        status="pending",
    )
    db.add(expense)
    db.flush()

    if data.receipt_id:
        receipt = db.query(Receipt).filter(Receipt.id == data.receipt_id).first()
        if receipt:
            receipt.expense_id = expense.id

    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "status": expense.status, "amount": float(expense.amount)}


@router.get("")
async def list_expenses(
    status: Optional[str] = None,
    claimant_id: Optional[int] = None,
    grant_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Expense).filter(Expense.organisation_id == current_user.organisation_id)
    if status:
        q = q.filter(Expense.status == status)
    if claimant_id:
        q = q.filter(Expense.claimant_id == claimant_id)
    if grant_id:
        q = q.filter(Expense.grant_id == grant_id)

    total = q.count()
    expenses = q.order_by(desc(Expense.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "pending_count": db.query(Expense).filter(
            Expense.organisation_id == current_user.organisation_id,
            Expense.status == "pending"
        ).count(),
        "items": [
            {
                "id": e.id,
                "description": e.description,
                "amount": float(e.amount),
                "expense_date": e.expense_date.isoformat(),
                "status": e.status,
                "claimant": e.claimant.full_name if e.claimant else None,
                "grant_id": e.grant_id,
                "programme_id": e.programme_id,
                "receipt_count": len(e.receipts),
            }
            for e in expenses
        ],
    }


@router.post("/{expense_id}/approve")
async def approve_expense(
    expense_id: int,
    data: ApprovalCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.organisation_id == current_user.organisation_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.status != "pending":
        raise HTTPException(status_code=400, detail=f"Expense already {expense.status}")
    if expense.claimant_id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot approve your own expense")

    expense.status = data.decision
    approval = ExpenseApproval(
        expense_id=expense_id,
        approver_id=current_user.id,
        decision=data.decision,
        notes=data.notes,
    )
    db.add(approval)

    if data.decision == "approved" and expense.grant_id:
        from backend.models.grant import Grant, GrantSpending
        grant = db.query(Grant).filter(Grant.id == expense.grant_id).first()
        if grant:
            grant.amount_spent = (grant.amount_spent or Decimal("0")) + expense.amount
            spending = GrantSpending(
                grant_id=expense.grant_id,
                expense_id=expense_id,
                amount=expense.amount,
                description=expense.description,
                date=expense.expense_date,
            )
            db.add(spending)

    db.commit()
    return {"message": f"Expense {data.decision}", "expense_id": expense_id}


@router.get("/categories")
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cats = db.query(ExpenseCategory).filter(
        ExpenseCategory.organisation_id == current_user.organisation_id,
        ExpenseCategory.is_active == True,
    ).all()
    return [{"id": c.id, "name": c.name, "code": c.code} for c in cats]


@router.get("/summary")
async def expense_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    total = db.query(func.sum(Expense.amount)).filter(
        Expense.organisation_id == org_id,
        Expense.status.in_(["approved", "paid"])
    ).scalar() or 0
    pending_count = db.query(func.count(Expense.id)).filter(
        Expense.organisation_id == org_id, Expense.status == "pending"
    ).scalar() or 0
    pending_amount = db.query(func.sum(Expense.amount)).filter(
        Expense.organisation_id == org_id, Expense.status == "pending"
    ).scalar() or 0
    return {
        "total_approved_ytd": float(total),
        "pending_count": pending_count,
        "pending_amount": float(pending_amount),
    }
