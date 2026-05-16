from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional
from collections import defaultdict

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.account import Account, BankAccount
from backend.models.transaction import Transaction
from backend.models.expense import Expense
from backend.models.grant import Grant, Programme
from backend.models.employee import Employee, PayrollRun
from backend.models.donor import Donation, DonationCampaign
from backend.models.user import User, Organisation

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _resolve_period_window(period_mode: str, now: datetime) -> tuple[str, datetime, str]:
    mode = (period_mode or "normal").lower()
    fy_start = datetime(now.year if now.month >= 4 else now.year - 1, 4, 6)

    if mode == "wtd":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        return "wtd", start, "Week to Date"
    if mode == "qtd":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start = datetime(now.year, quarter_month, 1)
        return "qtd", start, "Quarter to Date"
    if mode == "ytd":
        return "ytd", fy_start, "Year to Date"
    return "normal", fy_start, "Normal"


@router.get("/financial-summary")
async def financial_summary(
    period_mode: str = "normal",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    now = datetime.utcnow()
    resolved_mode, period_start, period_label = _resolve_period_window(period_mode, now)

    # Cash
    bank_accounts = db.query(BankAccount).filter(
        BankAccount.organisation_id == org_id, BankAccount.is_active == True
    ).all()
    total_cash = sum(float(b.balance or 0) for b in bank_accounts)

    # Income YTD
    period_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_id == org_id,
        Transaction.transaction_type == "income",
        Transaction.date >= period_start,
        Transaction.status == "cleared",
    ).scalar() or 0

    period_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_id == org_id,
        Transaction.transaction_type == "expense",
        Transaction.date >= period_start,
        Transaction.status == "cleared",
    ).scalar() or 0

    if resolved_mode == "wtd":
        burn_window_start = period_start
        burn_label = "Week Spend"
        period_burn = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= burn_window_start,
        ).scalar() or 0
        avg_burn_value = float(period_burn)
    elif resolved_mode == "qtd":
        burn_label = "Quarter Spend"
        period_burn = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= period_start,
        ).scalar() or 0
        avg_burn_value = float(period_burn)
    elif resolved_mode == "ytd":
        burn_label = "Year Spend"
        period_burn = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= period_start,
        ).scalar() or 0
        avg_burn_value = float(period_burn)
    else:
        burn_label = "Monthly Burn"
        three_months_ago = now - timedelta(days=90)
        monthly_expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= three_months_ago,
        ).scalar() or 0
        avg_burn_value = float(monthly_expenses) / 3

    cash_runway = round(total_cash / max(avg_burn_value, 1), 1) if avg_burn_value > 0 else None

    # Active grants
    grants = db.query(Grant).filter(
        Grant.organisation_id == org_id, Grant.status == "active"
    ).all()
    total_grants_awarded = sum(float(g.amount_awarded) for g in grants)
    total_grants_remaining = sum(float(g.amount_awarded - (g.amount_spent or 0)) for g in grants)

    period_donations = db.query(func.sum(Donation.amount)).filter(
        Donation.organisation_id == org_id,
        Donation.donation_date >= period_start,
        Donation.status == "completed",
    ).scalar() or 0

    pending_expenses = db.query(func.count(Expense.id)).filter(
        Expense.organisation_id == org_id, Expense.status == "pending"
    ).scalar() or 0
    pending_expense_amount = db.query(func.sum(Expense.amount)).filter(
        Expense.organisation_id == org_id, Expense.status == "pending"
    ).scalar() or 0

    next_payroll_run = db.query(PayrollRun).filter(
        PayrollRun.organisation_id == org_id,
        PayrollRun.status.in_(["draft", "locked"]),
    ).order_by(PayrollRun.pay_date).first()

    return {
        "period_mode": resolved_mode,
        "period_label": period_label,
        "total_cash": total_cash,
        "income_ytd": float(period_income),
        "expenses_ytd": float(period_expenses),
        "net_surplus_ytd": float(period_income) - float(period_expenses),
        "avg_monthly_burn": round(avg_burn_value, 2),
        "burn_label": burn_label,
        "cash_runway_months": cash_runway,
        "active_grants_count": len(grants),
        "total_grants_awarded": total_grants_awarded,
        "total_grants_remaining": total_grants_remaining,
        "donations_ytd": float(period_donations),
        "pending_expenses_count": pending_expenses,
        "pending_expenses_amount": float(pending_expense_amount or 0),
        "next_payroll_date": next_payroll_run.pay_date.isoformat() if next_payroll_run else None,
    }


@router.get("/cashflow")
async def cashflow_chart(
    months: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Monthly income vs expenses for chart rendering."""
    org_id = current_user.organisation_id
    now = datetime.utcnow()

    monthly_data = []
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=30 * i)
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "income",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        ).scalar() or 0

        expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        ).scalar() or 0

        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "month_short": month_start.strftime("%b"),
            "income": float(income),
            "expenses": float(expenses),
            "net": float(income) - float(expenses),
        })

    return {"months": months, "data": monthly_data}


@router.get("/grants")
async def grants_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    grants = db.query(Grant).filter(
        Grant.organisation_id == org_id, Grant.status == "active"
    ).order_by(desc(Grant.amount_awarded)).all()

    now = datetime.utcnow()
    return {
        "grants": [
            {
                "id": g.id,
                "name": g.name,
                "funder": g.funder,
                "reference": g.reference,
                "awarded": float(g.amount_awarded),
                "spent": float(g.amount_spent or 0),
                "remaining": float(g.amount_awarded - (g.amount_spent or 0)),
                "utilisation_pct": round(float(g.amount_spent or 0) / float(g.amount_awarded) * 100, 1),
                "end_date": g.end_date.isoformat(),
                "days_remaining": (g.end_date - now).days,
                "next_report_due": g.next_report_due.isoformat() if g.next_report_due else None,
                "report_days_remaining": (g.next_report_due - now).days if g.next_report_due else None,
            }
            for g in grants
        ]
    }


@router.get("/programme-cost")
async def programme_cost_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    programmes = db.query(Programme).filter(
        Programme.organisation_id == org_id, Programme.is_active == True
    ).all()

    # Volunteer time valuation (NCVO rate £15.60/hr for 2024)
    volunteer_hourly_rate = 15.60

    return {
        "programmes": [
            {
                "id": p.id,
                "name": p.name,
                "total_budget": float(p.total_budget or 0),
                "spent": float(p.spent or 0),
                "remaining": float((p.total_budget or 0) - (p.spent or 0)),
                "utilisation_pct": round(float(p.spent or 0) / max(float(p.total_budget or 1), 1) * 100, 1),
                "participants": p.actual_participants,
                "target_participants": p.target_participants,
                "cost_per_beneficiary": round(float(p.spent or 0) / max(p.actual_participants, 1), 2),
                "volunteer_hours": float(p.volunteer_hours or 0),
                "volunteer_value": round(float(p.volunteer_hours or 0) * volunteer_hourly_rate, 2),
                "status": p.status,
            }
            for p in programmes
        ]
    }


@router.get("/donations")
async def donations_dashboard(
    period_mode: str = "normal",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    now = datetime.utcnow()
    resolved_mode, period_start, period_label = _resolve_period_window(period_mode, now)

    ytd = db.query(func.sum(Donation.amount)).filter(
        Donation.organisation_id == org_id,
        Donation.donation_date >= period_start,
        Donation.status == "completed",
    ).scalar() or 0

    gift_aid = db.query(func.sum(Donation.gift_aid_amount)).filter(
        Donation.organisation_id == org_id,
        Donation.status == "completed",
        Donation.gift_aid_amount > 0,
    ).scalar() or 0

    unique_donors = db.query(func.count(func.distinct(Donation.donor_id))).filter(
        Donation.organisation_id == org_id,
        Donation.status == "completed",
    ).scalar() or 0

    recurring = db.query(func.count(Donation.id)).filter(
        Donation.organisation_id == org_id,
        Donation.is_recurring == True,
        Donation.status == "completed",
    ).scalar() or 0

    # Trend adjusts based on selected period
    monthly_trend = []
    if resolved_mode == "wtd":
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            total = db.query(func.sum(Donation.amount)).filter(
                Donation.organisation_id == org_id,
                Donation.donation_date >= day_start,
                Donation.donation_date < day_end,
                Donation.status == "completed",
            ).scalar() or 0
            monthly_trend.append({"month": day_start.strftime("%a"), "amount": float(total)})
    else:
        span = 2 if resolved_mode == "qtd" else 5
        for i in range(span, -1, -1):
            target = now - timedelta(days=30 * i)
            month_start = target.replace(day=1, hour=0, minute=0, second=0)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            total = db.query(func.sum(Donation.amount)).filter(
                Donation.organisation_id == org_id,
                Donation.donation_date >= month_start,
                Donation.donation_date < month_end,
                Donation.status == "completed",
            ).scalar() or 0
            monthly_trend.append({"month": month_start.strftime("%b"), "amount": float(total)})

    return {
        "period_mode": resolved_mode,
        "period_label": period_label,
        "ytd_total": float(ytd),
        "gift_aid_claimable": float(gift_aid),
        "unique_donors": unique_donors,
        "recurring_count": recurring,
        "monthly_trend": monthly_trend,
    }
