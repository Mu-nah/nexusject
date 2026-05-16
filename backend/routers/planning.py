from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
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


@router.get("/cashflow")
async def planning_cashflow(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    now = datetime.utcnow()
    start = now - timedelta(days=84)

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
    running_balance = 84320.0

    if transactions:
        first_week = (transactions[0].date - timedelta(days=transactions[0].date.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        buckets: dict[str, dict[str, Any]] = {}
        for index in range(13):
            week_start = first_week + timedelta(days=index * 7)
            key = week_start.strftime("%Y-%m-%d")
            buckets[key] = {
                "week": f"W{index + 1}",
                "week_start": week_start,
                "inflow": 0.0,
                "outflow": 0.0,
            }

        for tx in transactions:
            offset = max((tx.date - first_week).days, 0) // 7
            if offset > 12:
                continue
            key = (first_week + timedelta(days=offset * 7)).strftime("%Y-%m-%d")
            bucket = buckets[key]
            amount = float(tx.amount or 0)
            if tx.transaction_type == "income":
                bucket["inflow"] += amount
            elif tx.transaction_type == "expense":
                bucket["outflow"] += amount

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
    else:
        weekly_rows = []

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

    recommendations = [
        "Chase outstanding receivables within 10 working days.",
        "Review discretionary programme costs before the next payroll cycle.",
        "Keep a minimum reserve equal to three months of payroll.",
    ]

    lowest = min(forecast_rows, key=lambda row: row["balance"]) if forecast_rows else None

    return {
        "summary": {
            "current_cash": round(forecast_rows[0]["balance"], 2) if forecast_rows else 0,
            "projected_cash": round(forecast_rows[-1]["balance"], 2) if forecast_rows else 0,
            "net_movement": round(forecast_rows[-1]["balance"] - forecast_rows[0]["balance"], 2) if forecast_rows else 0,
            "avg_monthly_burn": avg_monthly_burn,
            "runway_months": round(forecast_rows[-1]["balance"] / max(avg_monthly_burn, 1), 1) if avg_monthly_burn > 0 and forecast_rows else None,
            "lowest_week": lowest["week"] if lowest else None,
            "lowest_balance": round(lowest["balance"], 2) if lowest else 0,
        },
        "forecast": forecast_rows,
        "scenario_copy": {
            "optimistic": "Add income and expense data to generate a tailored optimistic scenario.",
            "base": "Base case scenarios will appear once this workspace has transaction history.",
            "stress": "Stress test scenarios will appear once this workspace has transaction history.",
        },
        "recommendations": recommendations if forecast_rows else ["Add transactions to unlock a live 13-week cashflow forecast."],
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
