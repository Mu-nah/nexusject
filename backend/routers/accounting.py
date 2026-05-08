from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user, require_finance
from backend.models.account import Account, JournalEntry, JournalLine, BankAccount, BankTransaction
from backend.models.transaction import Transaction
from backend.models.user import User

router = APIRouter(prefix="/accounting", tags=["Accounting"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str  # asset, liability, equity, income, expense
    parent_id: Optional[int] = None
    description: Optional[str] = None


class JournalLineCreate(BaseModel):
    account_id: int
    description: Optional[str] = None
    debit: float = 0
    credit: float = 0
    grant_id: Optional[int] = None
    programme_id: Optional[int] = None


class JournalEntryCreate(BaseModel):
    description: str
    date: datetime
    lines: List[JournalLineCreate]
    source: Optional[str] = "manual"


class TransactionCreate(BaseModel):
    date: datetime
    description: str
    amount: float
    transaction_type: str  # income / expense
    category: Optional[str] = None
    account_id: Optional[int] = None
    grant_id: Optional[int] = None
    programme_id: Optional[int] = None
    source: Optional[str] = "manual"


# ── Accounts ─────────────────────────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(
    account_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Account).filter(Account.organisation_id == current_user.organisation_id)
    if account_type:
        q = q.filter(Account.account_type == account_type)
    accounts = q.order_by(Account.code).all()
    return [
        {
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "account_type": a.account_type,
            "balance": float(a.balance or 0),
            "is_active": a.is_active,
            "parent_id": a.parent_id,
        }
        for a in accounts
    ]


@router.post("/accounts", status_code=201)
async def create_account(
    data: AccountCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    existing = db.query(Account).filter(
        Account.organisation_id == current_user.organisation_id,
        Account.code == data.code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Account code {data.code} already exists")

    account = Account(
        organisation_id=current_user.organisation_id,
        **data.model_dump()
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return {"id": account.id, "code": account.code, "name": account.name}


# ── Journal Entries ──────────────────────────────────────────────────────────

@router.get("/journal-entries")
async def list_journal_entries(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(JournalEntry).filter(
        JournalEntry.organisation_id == current_user.organisation_id
    )
    if status:
        q = q.filter(JournalEntry.status == status)
    if date_from:
        q = q.filter(JournalEntry.date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.date <= date_to)

    total = q.count()
    entries = q.order_by(desc(JournalEntry.date)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": e.id,
                "reference": e.reference,
                "description": e.description,
                "date": e.date.isoformat(),
                "total_debit": float(e.total_debit),
                "total_credit": float(e.total_credit),
                "status": e.status,
                "source": e.source,
                "line_count": len(e.lines),
            }
            for e in entries
        ],
    }


@router.post("/journal-entry", status_code=201)
async def create_journal_entry(
    data: JournalEntryCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    # Validate double-entry: debits must equal credits
    total_debit = sum(l.debit for l in data.lines)
    total_credit = sum(l.credit for l in data.lines)
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Journal entry not balanced: debit={total_debit:.2f} credit={total_credit:.2f}"
        )

    # Generate reference
    count = db.query(JournalEntry).filter(
        JournalEntry.organisation_id == current_user.organisation_id
    ).count()
    year = datetime.now().year
    reference = f"JE-{year}-{str(count + 1).zfill(4)}"

    entry = JournalEntry(
        organisation_id=current_user.organisation_id,
        reference=reference,
        description=data.description,
        date=data.date,
        total_debit=Decimal(str(total_debit)),
        total_credit=Decimal(str(total_credit)),
        source=data.source,
        status="posted",
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()

    for line_data in data.lines:
        line = JournalLine(
            journal_entry_id=entry.id,
            account_id=line_data.account_id,
            description=line_data.description,
            debit=Decimal(str(line_data.debit)),
            credit=Decimal(str(line_data.credit)),
            grant_id=line_data.grant_id,
            programme_id=line_data.programme_id,
        )
        db.add(line)
        # Update account balance
        account = db.query(Account).filter(Account.id == line_data.account_id).first()
        if account:
            account.balance = (account.balance or Decimal("0")) + Decimal(str(line_data.debit)) - Decimal(str(line_data.credit))

    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "reference": entry.reference, "status": entry.status}


# ── Transactions ─────────────────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    skip: int = 0,
    limit: int = 50,
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    grant_id: Optional[int] = None,
    programme_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.organisation_id == current_user.organisation_id)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    if status:
        q = q.filter(Transaction.status == status)
    if grant_id:
        q = q.filter(Transaction.grant_id == grant_id)
    if programme_id:
        q = q.filter(Transaction.programme_id == programme_id)
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)

    total = q.count()
    txns = q.order_by(desc(Transaction.date)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": t.id,
                "reference": t.reference,
                "date": t.date.isoformat(),
                "description": t.description,
                "amount": float(t.amount),
                "transaction_type": t.transaction_type,
                "category": t.category,
                "status": t.status,
                "source": t.source,
                "grant_id": t.grant_id,
                "programme_id": t.programme_id,
            }
            for t in txns
        ],
    }


@router.post("/transactions", status_code=201)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    count = db.query(Transaction).filter(
        Transaction.organisation_id == current_user.organisation_id
    ).count()
    year = datetime.now().year
    reference = f"TXN-{year}-{str(count + 1).zfill(5)}"

    txn = Transaction(
        organisation_id=current_user.organisation_id,
        reference=reference,
        date=data.date,
        description=data.description,
        amount=Decimal(str(data.amount)),
        transaction_type=data.transaction_type,
        category=data.category,
        account_id=data.account_id,
        grant_id=data.grant_id,
        programme_id=data.programme_id,
        source=data.source,
        status="pending",
        created_by=current_user.id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {"id": txn.id, "reference": txn.reference}


# ── Bank Accounts & Reconciliation ───────────────────────────────────────────

@router.get("/bank-accounts")
async def list_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(BankAccount).filter(
        BankAccount.organisation_id == current_user.organisation_id,
        BankAccount.is_active == True,
    ).all()
    return [
        {
            "id": a.id,
            "bank_name": a.bank_name,
            "account_name": a.account_name,
            "balance": float(a.balance or 0),
            "last_synced": a.last_synced.isoformat() if a.last_synced else None,
        }
        for a in accounts
    ]


@router.get("/bank-accounts/{bank_id}/transactions")
async def get_bank_transactions(
    bank_id: int,
    reconciled: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(BankTransaction).filter(BankTransaction.bank_account_id == bank_id)
    if reconciled is not None:
        q = q.filter(BankTransaction.is_reconciled == reconciled)
    txns = q.order_by(desc(BankTransaction.date)).limit(100).all()
    return [
        {
            "id": t.id,
            "date": t.date.isoformat(),
            "description": t.description,
            "amount": float(t.amount),
            "type": t.transaction_type,
            "is_reconciled": t.is_reconciled,
            "reference": t.reference,
        }
        for t in txns
    ]


@router.post("/bank-accounts/{bank_id}/transactions/{txn_id}/reconcile")
async def reconcile_transaction(
    bank_id: int,
    txn_id: int,
    journal_entry_id: int,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    txn = db.query(BankTransaction).filter(
        BankTransaction.id == txn_id,
        BankTransaction.bank_account_id == bank_id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    txn.is_reconciled = True
    txn.journal_entry_id = journal_entry_id
    db.commit()
    return {"message": "Transaction reconciled", "id": txn_id}


# ── Financial Summary ─────────────────────────────────────────────────────────

@router.get("/summary")
async def financial_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_id == org_id,
        Transaction.transaction_type == "income",
        Transaction.status == "cleared",
    ).scalar() or 0

    expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_id == org_id,
        Transaction.transaction_type == "expense",
        Transaction.status == "cleared",
    ).scalar() or 0

    cash_accounts = db.query(Account).filter(
        Account.organisation_id == org_id,
        Account.account_type == "asset",
        Account.code.like("1%"),
    ).all()
    total_cash = sum(float(a.balance or 0) for a in cash_accounts)

    return {
        "total_income_ytd": float(income),
        "total_expenses_ytd": float(expenses),
        "net_surplus": float(income) - float(expenses),
        "total_cash": total_cash,
    }
