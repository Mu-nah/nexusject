from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user, require_finance
from backend.services.report_service import save_workspace_report, serialize_report
from backend.models.grant import Grant, GrantAllocation, GrantSpending, GrantReport, Programme
from backend.models.user import User

router = APIRouter(prefix="/grants", tags=["Grants"])


class GrantCreate(BaseModel):
    reference: str
    name: str
    funder: str
    amount_awarded: float
    start_date: datetime
    end_date: datetime
    reporting_frequency: str = "quarterly"
    next_report_due: Optional[datetime] = None
    conditions: Optional[str] = None
    objectives: Optional[list] = None
    notes: Optional[str] = None


class AllocationCreate(BaseModel):
    programme_id: Optional[int] = None
    activity: Optional[str] = None
    allocated_amount: float
    notes: Optional[str] = None


class ProgrammeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    lead_grant_id: Optional[int] = None
    total_budget: float = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_participants: int = 0


# ── STATIC ROUTES (must be registered before /{grant_id}) ─────────────────────

@router.get("/summary")
async def grants_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    grants = db.query(Grant).filter(
        Grant.organisation_id == org_id, Grant.status == "active"
    ).all()
    total_awarded = sum(float(g.amount_awarded) for g in grants)
    total_spent = sum(float(g.amount_spent or 0) for g in grants)
    return {
        "active_grants": len(grants),
        "total_awarded": total_awarded,
        "total_spent": total_spent,
        "total_remaining": total_awarded - total_spent,
        "overall_utilisation_pct": round(total_spent / max(total_awarded, 1) * 100, 1),
    }


@router.get("/programmes/list")
async def list_programmes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    programmes = db.query(Programme).filter(
        Programme.organisation_id == current_user.organisation_id,
        Programme.is_active == True,
    ).all()
    return [
        {
            "id": p.id, "name": p.name,
            "total_budget": float(p.total_budget or 0),
            "spent": float(p.spent or 0),
            "remaining": float((p.total_budget or 0) - (p.spent or 0)),
            "utilisation_pct": round(float((p.spent or 0) / max(float(p.total_budget or 1), 1) * 100), 1),
            "actual_participants": p.actual_participants,
            "target_participants": p.target_participants,
            "cost_per_beneficiary": float(p.cost_per_beneficiary) if p.cost_per_beneficiary else None,
            "volunteer_hours": float(p.volunteer_hours or 0),
            "status": p.status,
        }
        for p in programmes
    ]


@router.post("/programmes", status_code=201)
async def create_programme(
    data: ProgrammeCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    prog = Programme(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return {"id": prog.id, "name": prog.name}


# ── COLLECTION ROUTES ──────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_grant(
    data: GrantCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    grant = Grant(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return {"id": grant.id, "reference": grant.reference, "name": grant.name}


@router.get("")
async def list_grants(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Grant).filter(Grant.organisation_id == current_user.organisation_id)
    if status:
        q = q.filter(Grant.status == status)
    grants = q.order_by(desc(Grant.start_date)).all()
    return [
        {
            "id": g.id, "reference": g.reference, "name": g.name, "funder": g.funder,
            "amount_awarded": float(g.amount_awarded),
            "amount_spent": float(g.amount_spent or 0),
            "amount_remaining": float(g.amount_awarded - (g.amount_spent or 0)),
            "utilisation_pct": round(float((g.amount_spent or 0) / g.amount_awarded * 100), 1),
            "start_date": g.start_date.isoformat(), "end_date": g.end_date.isoformat(),
            "next_report_due": g.next_report_due.isoformat() if g.next_report_due else None,
            "status": g.status, "reporting_frequency": g.reporting_frequency,
        }
        for g in grants
    ]


# ── PARAMETERISED ROUTES — always AFTER static routes ─────────────────────────

@router.get("/{grant_id}")
async def get_grant(
    grant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Grant).filter(
        Grant.id == grant_id,
        Grant.organisation_id == current_user.organisation_id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grant not found")
    return {
        "id": g.id, "reference": g.reference, "name": g.name, "funder": g.funder,
        "amount_awarded": float(g.amount_awarded), "amount_spent": float(g.amount_spent or 0),
        "amount_remaining": float(g.amount_awarded - (g.amount_spent or 0)),
        "start_date": g.start_date.isoformat(), "end_date": g.end_date.isoformat(),
        "next_report_due": g.next_report_due.isoformat() if g.next_report_due else None,
        "status": g.status, "conditions": g.conditions, "objectives": g.objectives,
    }


@router.post("/{grant_id}/allocate", status_code=201)
async def allocate_grant(
    grant_id: int,
    data: AllocationCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    grant = db.query(Grant).filter(
        Grant.id == grant_id,
        Grant.organisation_id == current_user.organisation_id
    ).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    existing = db.query(func.sum(GrantAllocation.allocated_amount)).filter(
        GrantAllocation.grant_id == grant_id
    ).scalar() or 0

    if existing + data.allocated_amount > float(grant.amount_awarded):
        raise HTTPException(
            status_code=400,
            detail=f"Allocation exceeds remaining grant balance (available: £{float(grant.amount_awarded) - existing:,.2f})"
        )

    allocation = GrantAllocation(
        grant_id=grant_id, programme_id=data.programme_id,
        activity=data.activity,
        allocated_amount=Decimal(str(data.allocated_amount)),
        notes=data.notes,
    )
    db.add(allocation)
    db.commit()
    return {"id": allocation.id, "allocated_amount": float(allocation.allocated_amount)}


@router.get("/{grant_id}/spending")
async def get_grant_spending(
    grant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grant = db.query(Grant).filter(
        Grant.id == grant_id,
        Grant.organisation_id == current_user.organisation_id
    ).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    spending = db.query(GrantSpending).filter(
        GrantSpending.grant_id == grant_id
    ).order_by(desc(GrantSpending.date)).all()

    by_category: dict = {}
    for s in spending:
        cat = s.category or "other"
        by_category[cat] = by_category.get(cat, 0) + float(s.amount)

    return {
        "grant_id": grant_id, "grant_name": grant.name,
        "amount_awarded": float(grant.amount_awarded),
        "amount_spent": float(grant.amount_spent or 0),
        "amount_remaining": float(grant.amount_awarded - (grant.amount_spent or 0)),
        "by_category": by_category,
        "transactions": [
            {"id": s.id, "date": s.date.isoformat(), "description": s.description,
             "amount": float(s.amount), "category": s.category}
            for s in spending
        ],
    }


@router.post("/{grant_id}/ai-report")
async def generate_ai_grant_report(
    grant_id: int,
    period_start: datetime,
    period_end: datetime,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    from backend.models.user import Organisation
    grant = db.query(Grant).filter(
        Grant.id == grant_id,
        Grant.organisation_id == current_user.organisation_id
    ).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    from backend.services.ai_service import generate_grant_report
    result = await generate_grant_report(grant_id, period_start, period_end, db,
                                         org.name if org else "Harvest Touch CIC")
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    report = GrantReport(
        grant_id=grant_id, report_period_start=period_start, report_period_end=period_end,
        narrative=result.get("narrative"), financial_summary=result.get("financial_summary"),
        ai_generated=True, status="draft",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    result["report_id"] = report.id
    saved_report = save_workspace_report(
        db,
        organisation_id=current_user.organisation_id,
        created_by=current_user.id,
        title=f"{grant.name} Grant Report",
        report_type="grant",
        period_label=result.get("period"),
        narrative=result.get("narrative", ""),
    )
    result["workspace_report"] = serialize_report(saved_report)
    return result
