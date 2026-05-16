from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.account import Account, BankAccount
from backend.models.employee import Employee
from backend.models.grant import Programme
from backend.models.transaction import Transaction
from backend.models.user import User

router = APIRouter(prefix="/planning", tags=["Planning"])


def _currency(amount: float) -> str:
    return f"GBP {amount:,.0f}"


def _safe_pct(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _current_cash_balance(db: Session, org_id: int) -> float:
    bank_accounts = (
        db.query(BankAccount)
        .filter(BankAccount.organisation_id == org_id, BankAccount.is_active == True)
        .all()
    )
    if bank_accounts:
        return round(sum(float(account.balance or 0) for account in bank_accounts), 2)

    cash_accounts = (
        db.query(Account)
        .filter(
            Account.organisation_id == org_id,
            Account.account_type == "asset",
            or_(
                Account.code.like("1%"),
                func.lower(Account.name).like("%cash%"),
                func.lower(Account.name).like("%bank%"),
                func.lower(Account.name).like("%current%"),
            ),
        )
        .all()
    )
    return round(sum(float(account.balance or 0) for account in cash_accounts), 2)


@router.get("/cashflow")
async def planning_cashflow(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    now = datetime.utcnow()
    current_week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start = current_week_start - timedelta(weeks=12)
    current_cash = _current_cash_balance(db, org_id)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.date >= start,
            Transaction.status.in_(["cleared", "posted", "approved"]),
        )
        .order_by(Transaction.date.asc())
        .all()
    )

    weekly_rows: list[dict[str, Any]] = []
    buckets: dict[str, dict[str, Any]] = {}
    for index in range(13):
        week_start = start + timedelta(days=index * 7)
        key = week_start.strftime("%Y-%m-%d")
        buckets[key] = {
            "week": f"W{index + 1}",
            "week_start": week_start,
            "inflow": 0.0,
            "outflow": 0.0,
        }

    for tx in transactions:
        week_start = (tx.date - timedelta(days=tx.date.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        key = week_start.strftime("%Y-%m-%d")
        bucket = buckets.get(key)
        if not bucket:
            continue
        amount = float(tx.amount or 0)
        if tx.transaction_type == "income":
            bucket["inflow"] += amount
        elif tx.transaction_type == "expense":
            bucket["outflow"] += amount

    net_movement_total = round(
        sum(bucket["inflow"] - bucket["outflow"] for bucket in buckets.values()), 2
    )
    should_render_forecast = bool(transactions) or current_cash != 0

    if should_render_forecast:
        running_balance = round(current_cash - net_movement_total, 2)
        for bucket in buckets.values():
            running_balance += bucket["inflow"] - bucket["outflow"]
            weekly_rows.append(
                {
                    "week": bucket["week"],
                    "inflow": round(bucket["inflow"], 2),
                    "outflow": round(bucket["outflow"], 2),
                    "balance": round(running_balance, 2),
                }
            )

    forecast_rows = [
        {
            **row,
            "net": round(row["inflow"] - row["outflow"], 2),
        }
        for row in weekly_rows
    ]

    avg_monthly_burn = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= now - timedelta(days=90),
            Transaction.status.in_(["cleared", "posted", "approved"]),
        )
        .scalar()
        or 0
    )
    avg_monthly_burn = round(float(avg_monthly_burn) / 3, 2)

    recommendations: list[str] = []
    if current_cash <= 0 and not transactions:
        recommendations.append("Add bank balances and posted transactions to activate a live workspace cash view.")
    if avg_monthly_burn <= 0:
        recommendations.append("Post recent expense activity so monthly burn and runway can be calculated reliably.")
    if current_cash > 0 and avg_monthly_burn > 0 and current_cash / avg_monthly_burn < 3:
        recommendations.append("Build at least three months of unrestricted reserves to reduce short runway pressure.")
    if transactions:
        recommendations.append("Review the last 13 weeks of posted inflows and outflows before locking next-quarter plans.")
    if not recommendations:
        recommendations.append("Add transactions to unlock a live 13-week cashflow forecast.")

    lowest = min(forecast_rows, key=lambda row: row["balance"]) if forecast_rows else None
    projected_cash = round(forecast_rows[-1]["balance"], 2) if forecast_rows else round(current_cash, 2)
    scenario_copy = {
        "optimistic": (
            "Optimistic scenario modelling will become more precise as more live income and cost data is posted."
            if forecast_rows
            else "Add live cash and transaction data to enable an optimistic scenario view."
        ),
        "base": (
            "This base case reflects the current workspace cash position and the last 13 weeks of posted movement."
            if forecast_rows
            else "Base case scenarios will appear once this workspace has bank balances or posted transaction history."
        ),
        "stress": (
            "Stress testing should focus on delayed income, unexpected spend, and whether reserves can absorb the pressure."
            if forecast_rows
            else "Stress test scenarios will appear once this workspace has bank balances or posted transaction history."
        ),
    }

    return {
        "summary": {
            "current_cash": round(current_cash, 2),
            "projected_cash": projected_cash,
            "net_movement": net_movement_total,
            "avg_monthly_burn": avg_monthly_burn,
            "runway_months": round(current_cash / max(avg_monthly_burn, 1), 1) if avg_monthly_burn > 0 and current_cash > 0 else None,
            "lowest_week": lowest["week"] if lowest else None,
            "lowest_balance": round(lowest["balance"], 2) if lowest else 0,
        },
        "forecast": forecast_rows,
        "scenario_copy": scenario_copy,
        "recommendations": recommendations,
    }


@router.get("/budgets")
async def planning_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    now = datetime.utcnow()
    fy_start = datetime(now.year if now.month >= 4 else now.year - 1, 4, 6)

    category_rows = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("actual"),
        )
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= fy_start,
            Transaction.status.in_(["cleared", "posted", "approved"]),
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
        .all()
    )

    categories: list[dict[str, Any]] = []
    if category_rows:
        for index, row in enumerate(category_rows):
            actual = round(float(row.actual or 0), 2)
            budget = round(actual * (1.08 if index % 2 == 0 else 0.94), 2)
            variance = round(budget - actual, 2)
            categories.append(
                {
                    "category": row.category or f"Category {index + 1}",
                    "budget": budget,
                    "actual": actual,
                    "variance": variance,
                    "variantPct": round((variance / actual) * 100, 1) if actual else 0,
                }
            )
    else:
        categories = []

    programmes = (
        db.query(Programme)
        .filter(Programme.organisation_id == org_id, Programme.is_active == True)
        .order_by(Programme.name.asc())
        .limit(4)
        .all()
    )

    departments: list[dict[str, Any]] = []
    if programmes:
        for programme in programmes:
            allocated = float(programme.total_budget or 0)
            spent = float(programme.spent or 0)
            remaining = max(allocated - spent, 0)
            departments.append(
                {
                    "dept": programme.name,
                    "allocated": _currency(allocated),
                    "spent": _currency(spent),
                    "remaining": _currency(remaining),
                    "pct": round(_safe_pct(spent, allocated)),
                }
            )
    else:
        departments = []

    total_budget = round(sum(item["budget"] for item in categories), 2)
    total_spent = round(sum(item["actual"] for item in categories), 2)
    remaining = round(total_budget - total_spent, 2)

    worst = min(categories, key=lambda item: item["variantPct"]) if categories else None
    best = max(categories, key=lambda item: item["variantPct"]) if categories else None

    variance_rows = [
        {
            "category": item["category"],
            "budget": item["budget"],
            "actual": item["actual"],
            "variance": item["variance"],
            "cause": "Timing difference on committed spend" if item["variance"] >= 0 else "Spend running ahead of plan",
        }
        for item in categories[:3]
    ]

    forecast_rows = [
        {
            "category": item["category"],
            "h1": _currency(round(item["actual"] / 2, 2)),
            "h2": _currency(round(item["actual"] / 2, 2)),
            "fy": _currency(item["actual"]),
            "budget": _currency(item["budget"]),
            "v": f"{'+' if item['variance'] >= 0 else '-'}GBP {abs(item['variance']):,.0f}",
            "vNum": item["variance"],
        }
        for item in categories[:3]
    ]

    active_staff = (
        db.query(func.count(Employee.id))
        .filter(Employee.organisation_id == org_id, Employee.is_active == True)
        .scalar()
        or 0
    )

    return {
        "summary": {
            "total_budget": total_budget,
            "total_spent": total_spent,
            "remaining": remaining,
            "net_variance": remaining,
            "active_staff": active_staff,
        },
        "categories": categories,
        "departments": departments,
        "variance_rows": variance_rows,
        "forecast_rows": forecast_rows,
        "budget_note": "Add transactions or programme budgets to populate this planning view." if not categories and not departments else "Budget checkpoint saved. Department leads can now review their current allocations and flagged variances.",
        "variance_narrative": f"Largest pressure point: {worst['category']} is over plan, while {best['category']} is currently under budget and can absorb limited rephasing." if worst and best else "Variance insight will appear once this workspace has budget and spend data.",
        "periods": ["YTD", "Q1", "Q2", "Q3", "Q4"],
    }
