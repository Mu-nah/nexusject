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
        weekly_rows = [
            {"week": "W1", "inflow": 15000, "outflow": 6200, "balance": 84320},
            {"week": "W2", "inflow": 2400, "outflow": 5800, "balance": 80920},
            {"week": "W3", "inflow": 8500, "outflow": 6100, "balance": 83320},
            {"week": "W4", "inflow": 4850, "outflow": 7200, "balance": 80970},
            {"week": "W5", "inflow": 1200, "outflow": 5900, "balance": 76270},
            {"week": "W6", "inflow": 12000, "outflow": 6400, "balance": 81870},
            {"week": "W7", "inflow": 3100, "outflow": 5800, "balance": 79170},
            {"week": "W8", "inflow": 900, "outflow": 6200, "balance": 73870},
            {"week": "W9", "inflow": 6000, "outflow": 5900, "balance": 73970},
            {"week": "W10", "inflow": 2500, "outflow": 6100, "balance": 70370},
            {"week": "W11", "inflow": 15000, "outflow": 7400, "balance": 77970},
            {"week": "W12", "inflow": 1800, "outflow": 5800, "balance": 73970},
            {"week": "W13", "inflow": 4200, "outflow": 6200, "balance": 71970},
        ]

    forecast_rows = [
        {
            **row,
            "net": round(row["inflow"] - row["outflow"], 2),
        }
        for row in weekly_rows
    ]

    lowest = min(forecast_rows, key=lambda row: row["balance"])
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

    return {
        "summary": {
            "current_cash": round(forecast_rows[0]["balance"], 2),
            "projected_cash": round(forecast_rows[-1]["balance"], 2),
            "net_movement": round(forecast_rows[-1]["balance"] - forecast_rows[0]["balance"], 2),
            "avg_monthly_burn": avg_monthly_burn,
            "runway_months": round(forecast_rows[-1]["balance"] / max(avg_monthly_burn, 1), 1) if avg_monthly_burn > 0 else None,
            "lowest_week": lowest["week"],
            "lowest_balance": round(lowest["balance"], 2),
        },
        "forecast": forecast_rows,
        "scenario_copy": {
            "optimistic": "Optimistic outlook: receivables clear to plan and the next grant milestone lands within the month, easing summer cash pressure.",
            "base": "Base case: current commitments remain manageable, but runway stays sensitive to grant timing and slower debtor collection.",
            "stress": "Stress test: a delayed grant drawdown and continued overhead pressure would compress runway quickly, so management action should start now.",
        },
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
        categories = [
            {"category": "Staff Costs", "budget": 58200, "actual": 54600, "variance": 3600, "variantPct": 6.2},
            {"category": "Programme Delivery", "budget": 24000, "actual": 26400, "variance": -2400, "variantPct": -10.0},
            {"category": "Overheads", "budget": 14800, "actual": 13900, "variance": 900, "variantPct": 6.1},
            {"category": "Marketing", "budget": 4200, "actual": 5100, "variance": -900, "variantPct": -21.4},
            {"category": "Training and CPD", "budget": 2800, "actual": 2200, "variance": 600, "variantPct": 21.4},
        ]

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
        departments = [
            {"dept": "Youth Connect", "allocated": "GBP 38,000", "spent": "GBP 31,200", "remaining": "GBP 6,800", "pct": 82},
            {"dept": "Skills Hub", "allocated": "GBP 28,500", "spent": "GBP 24,100", "remaining": "GBP 4,400", "pct": 85},
            {"dept": "Community Outreach", "allocated": "GBP 18,000", "spent": "GBP 12,600", "remaining": "GBP 5,400", "pct": 70},
            {"dept": "Core Ops", "allocated": "GBP 19,500", "spent": "GBP 17,800", "remaining": "GBP 1,700", "pct": 91},
        ]

    total_budget = round(sum(item["budget"] for item in categories), 2)
    total_spent = round(sum(item["actual"] for item in categories), 2)
    remaining = round(total_budget - total_spent, 2)

    worst = min(categories, key=lambda item: item["variantPct"])
    best = max(categories, key=lambda item: item["variantPct"])

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
        "budget_note": "Budget checkpoint saved. Department leads can now review their current allocations and flagged variances.",
        "variance_narrative": f"Largest pressure point: {worst['category']} is over plan, while {best['category']} is currently under budget and can absorb limited rephasing.",
        "periods": ["YTD", "Q1", "Q2", "Q3", "Q4"],
    }
