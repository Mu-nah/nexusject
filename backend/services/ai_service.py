"""
AI Financial Intelligence Service — Nexus One
Powers: financial analysis, forecasting, grant reports, trustee summaries
Uses Claude claude-sonnet-4-20250514 via Anthropic SDK (server-side only — key never reaches browser)
"""
import json
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the AI Financial and Operational Intelligence for Nexus One — an enterprise platform by Realtouch Global Ventures Ltd.

Organisation: {org_name}
Current date: {current_date}
Tax year: 2024-25

LIVE FINANCIAL DATA:
{financial_summary}

GRANT PORTFOLIO:
{grant_summary}

EMPLOYEE & PAYROLL:
{employee_summary}

ACCOUNTS SUMMARY:
{accounts_summary}

PENDING ITEMS:
{pending_summary}

Your capabilities:
- Provide precise financial analysis with exact figures from the live data above
- Generate professional grant reports, trustee summaries, compliance reports
- Give HR and payroll advice with legal references (HMRC, Charity Commission, UK employment law)
- Forecast cash flow with specific numbers and scenarios
- Draft formal letters, reports, and regulatory submissions
- Answer ANY question about this organisation's finances, HR, operations, or compliance

IMPORTANT: Always use the actual data provided. Give specific numbers, dates, and actionable recommendations. Write in professional UK English. For reports, use proper headings and structure. Always use GBP (£)."""


def _extract_response_text(response) -> str:
    content = getattr(response, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list) and content:
        first = content[0]
        if hasattr(first, "text"):
            return first.text
    if hasattr(response, "output_text"):
        return response.output_text
    return str(response)


def _has_real_secret(value: Optional[str]) -> bool:
    if not value:
        return False
    text = value.strip()
    if not text:
        return False
    placeholder_markers = (
        "your-",
        "sk-your-",
        "replace-me",
        "example",
        "test-key",
    )
    lowered = text.lower()
    return not any(marker in lowered for marker in placeholder_markers)


def _call_anthropic(messages: list, system: Optional[str], max_tokens: int) -> str:
    import anthropic
    from backend.core.settings import settings

    if not _has_real_secret(settings.ANTHROPIC_API_KEY):
        raise RuntimeError("Anthropic API key is missing or still set to a placeholder value")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.AI_MODEL or "claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return _extract_response_text(response)


def _call_openai(messages: list, system: Optional[str], max_tokens: int) -> str:
    from openai import OpenAI
    from backend.core.settings import settings

    if not _has_real_secret(settings.OPENAI_API_KEY):
        raise RuntimeError("OpenAI fallback API key is missing or still set to a placeholder value")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    payload_messages = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    payload_messages.extend(messages)
    response = client.chat.completions.create(
        model=settings.OPENAI_FALLBACK_MODEL,
        messages=payload_messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


def _call_llm(messages: list, system: Optional[str], max_tokens: int) -> str:
    from backend.core.settings import settings

    primary_error = None
    fallback_error = None

    if _has_real_secret(settings.ANTHROPIC_API_KEY):
        try:
            return _call_anthropic(messages, system, max_tokens)
        except Exception as exc:
            primary_error = exc
            logger.warning(f"Anthropic call failed, attempting OpenAI fallback: {exc}")
    elif settings.ANTHROPIC_API_KEY:
        logger.warning("Anthropic API key is present but appears to be a placeholder; skipping Claude")

    if settings.AI_ENABLE_OPENAI_FALLBACK and _has_real_secret(settings.OPENAI_API_KEY):
        try:
            return _call_openai(messages, system, max_tokens)
        except Exception as exc:
            fallback_error = exc
            logger.error(f"OpenAI fallback failed: {exc}")
    elif settings.AI_ENABLE_OPENAI_FALLBACK and settings.OPENAI_API_KEY:
        logger.warning("OpenAI API key is present but appears to be a placeholder; skipping fallback")

    if primary_error and fallback_error:
        raise RuntimeError(f"Claude failed: {primary_error}. OpenAI fallback failed: {fallback_error}")
    if primary_error:
        raise RuntimeError(f"Claude failed and no usable OpenAI fallback is configured: {primary_error}")
    if fallback_error:
        raise RuntimeError(f"OpenAI fallback failed: {fallback_error}")
    raise RuntimeError("No usable AI provider is configured. Set a valid ANTHROPIC_API_KEY for Claude or a valid OPENAI_API_KEY for fallback.")


async def get_financial_context(db: Session, org_id: int) -> dict:
    """Build a rich financial context snapshot for the AI."""
    try:
        from backend.models.account import Account, BankAccount
        from backend.models.grant import Grant, Programme
        from backend.models.employee import Employee, PayrollRun
        from backend.models.donor import Donation
        from backend.models.expense import Expense
        from backend.models.transaction import Transaction
        from sqlalchemy import func

        # ── Cash & Bank ──────────────────────────────────────────────────────
        bank_accounts = db.query(Account).filter(
            Account.organisation_id == org_id,
            Account.account_type == "asset",
            Account.code.like("1%")
        ).all()
        total_cash = sum(float(a.balance or 0) for a in bank_accounts)

        # All accounts for summary
        all_accounts = db.query(Account).filter(
            Account.organisation_id == org_id,
            Account.is_active == True
        ).all()

        # ── Grants ───────────────────────────────────────────────────────────
        grants = db.query(Grant).filter(
            Grant.organisation_id == org_id,
            Grant.status == "active"
        ).all()

        # ── Employees ────────────────────────────────────────────────────────
        employees = db.query(Employee).filter(
            Employee.organisation_id == org_id,
            Employee.is_active == True
        ).all()
        emp_count = len(employees)
        monthly_payroll_gross = sum(float(e.gross_salary or 0) for e in employees)
        # Estimate employer cost at ~1.138x gross (NI + pension)
        monthly_employer_cost = monthly_payroll_gross * 1.138

        # Last payroll run
        last_run = db.query(PayrollRun).filter(
            PayrollRun.organisation_id == org_id,
        ).order_by(PayrollRun.pay_date.desc()).first()

        # ── Cash runway ──────────────────────────────────────────────────────
        monthly_burn = float(last_run.total_employer_cost) if last_run else monthly_employer_cost
        cash_runway = round(total_cash / max(monthly_burn, 1), 1) if monthly_burn > 0 else None

        # ── Donations ────────────────────────────────────────────────────────
        ytd_donations = db.query(func.sum(Donation.amount)).filter(
            Donation.organisation_id == org_id,
            Donation.status == "completed"
        ).scalar() or 0

        # ── Pending expenses ─────────────────────────────────────────────────
        pending_expenses = db.query(Expense).filter(
            Expense.organisation_id == org_id,
            Expense.status == "pending"
        ).all()
        pending_exp_count = len(pending_expenses)
        pending_exp_total = sum(float(e.amount or 0) for e in pending_expenses)

        # ── Recent transactions ──────────────────────────────────────────────
        recent_txns = db.query(Transaction).filter(
            Transaction.organisation_id == org_id
        ).order_by(Transaction.date.desc()).limit(5).all()

        return {
            "total_cash": total_cash,
            "monthly_payroll_gross": monthly_payroll_gross,
            "monthly_employer_cost": monthly_burn,
            "cash_runway_months": cash_runway,
            "employee_count": emp_count,
            "ytd_donations": float(ytd_donations),
            "pending_expenses_count": pending_exp_count,
            "pending_expenses_total": pending_exp_total,
            "grants": [
                {
                    "name": g.name,
                    "funder": g.funder,
                    "reference": g.reference,
                    "awarded": float(g.amount_awarded),
                    "spent": float(g.amount_spent),
                    "remaining": float(g.amount_awarded - g.amount_spent),
                    "end_date": g.end_date.strftime("%Y-%m-%d"),
                    "next_report": g.next_report_due.strftime("%d %b %Y") if g.next_report_due else None,
                    "status": g.status,
                }
                for g in grants
            ],
            "employees": [
                {
                    "name": e.full_name,
                    "role": e.role_title,
                    "contract": e.contract_type,
                    "gross_monthly": float(e.gross_salary or 0),
                    "grant_funded": e.grant_funded,
                }
                for e in employees
            ],
            "accounts": [
                {"code": a.code, "name": a.name, "type": a.account_type, "balance": float(a.balance or 0)}
                for a in all_accounts
            ],
            "recent_transactions": [
                {
                    "date": t.date.strftime("%d %b %Y") if t.date else None,
                    "description": t.description,
                    "amount": float(t.amount),
                    "type": t.transaction_type,
                    "status": t.status,
                }
                for t in recent_txns
            ],
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error building financial context: {e}")
        return {"error": "Could not retrieve live data", "note": str(e)}


def _format_system_prompt(context: dict, org_name: str) -> str:
    """Format the system prompt with live data."""

    # Financial summary
    fin = (
        f"- Total funds: £{context.get('total_cash', 0):,.0f}\n"
        f"- Monthly payroll gross: £{context.get('monthly_payroll_gross', 0):,.0f} "
        f"({context.get('employee_count', 0)} active staff)\n"
        f"- Monthly employer cost: £{context.get('monthly_employer_cost', 0):,.0f}\n"
        f"- Cash runway estimate: {context.get('cash_runway_months', 'unknown')} months\n"
        f"- Donations YTD: £{context.get('ytd_donations', 0):,.0f}"
    )

    # Grant summary
    grants = context.get("grants", [])
    if grants:
        grant_lines = "\n".join(
            f"- {g['name']} ({g['reference']}): awarded £{g['awarded']:,.0f}, "
            f"spent £{g['spent']:,.0f}, remaining £{g['remaining']:,.0f}, "
            f"report due {g['next_report'] or 'N/A'}"
            for g in grants
        )
    else:
        grant_lines = "- No active grants"

    # Employee summary
    emps = context.get("employees", [])
    if emps:
        emp_lines = "\n".join(
            f"- {e['name']} ({e['role']}, {e['contract']}): £{e['gross_monthly']:,.0f}/mo"
            + (" [grant-funded]" if e["grant_funded"] else "")
            for e in emps
        )
    else:
        emp_lines = "- No active employees"

    # Accounts summary
    accounts = context.get("accounts", [])
    if accounts:
        acc_lines = ", ".join(
            f"{a['code']} {a['name']}: £{abs(a['balance']):,.0f}"
            for a in accounts[:10]
        )
    else:
        acc_lines = "No accounts data"

    # Pending items
    pending = (
        f"- Pending expense claims: {context.get('pending_expenses_count', 0)} "
        f"totalling £{context.get('pending_expenses_total', 0):,.2f}"
    )
    recent = context.get("recent_transactions", [])
    if recent:
        txn_lines = "; ".join(
            f"{t['date']} {'+'  if t['type']=='income' else '-'}£{t['amount']:,.0f} — {t['description']}"
            for t in recent
        )
        pending += f"\n- Recent transactions: {txn_lines}"

    return SYSTEM_PROMPT.format(
        org_name=org_name,
        current_date=datetime.now().strftime("%A, %d %B %Y"),
        financial_summary=fin,
        grant_summary=grant_lines,
        employee_summary=emp_lines,
        accounts_summary=acc_lines,
        pending_summary=pending,
    )


async def ai_assistant_chat(
    message: str,
    conversation_history: list,
    org_name: str,
    financial_context: dict,
) -> str:
    """Main AI assistant — routes message to Claude with full org context."""
    try:
        system = _format_system_prompt(financial_context, org_name)
        messages = conversation_history + [{"role": "user", "content": message}]
        return _call_llm(messages, system, 4096)

    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        raise


async def generate_grant_report(
    grant_id: int,
    period_start: datetime,
    period_end: datetime,
    db: Session,
    org_name: str,
) -> dict:
    """Generate a complete AI-powered grant report."""
    try:
        from backend.models.grant import Grant, GrantSpending

        grant = db.query(Grant).filter(Grant.id == grant_id).first()
        if not grant:
            return {"error": "Grant not found"}

        spending = db.query(GrantSpending).filter(
            GrantSpending.grant_id == grant_id,
            GrantSpending.date >= period_start,
            GrantSpending.date <= period_end,
        ).all()

        spending_summary: dict = {}
        for s in spending:
            cat = s.category or "other"
            spending_summary[cat] = spending_summary.get(cat, 0) + float(s.amount)

        prompt = f"""Generate a professional interim grant report for {org_name}.

Grant: {grant.name}
Funder: {grant.funder}
Reference: {grant.reference}
Award: £{float(grant.amount_awarded):,.2f}
Total spent to date: £{float(grant.amount_spent):,.2f}
Period: {period_start.strftime('%d %B %Y')} to {period_end.strftime('%d %B %Y')}
Spending this period: £{sum(spending_summary.values()):,.2f}
Breakdown: {json.dumps(spending_summary, indent=2)}

Write a 400–600 word report including:
1. Executive Summary
2. Activities Delivered
3. Financial Summary (with breakdown table)
4. Outcomes & Impact
5. Next Steps

Use professional charity sector language. UK English."""

        return {
            "grant_name": grant.name,
            "funder": grant.funder,
            "period": f"{period_start.strftime('%d %b %Y')} – {period_end.strftime('%d %b %Y')}",
            "narrative": _call_llm([{"role": "user", "content": prompt}], None, 2000),
            "financial_summary": spending_summary,
            "total_spent": sum(spending_summary.values()),
            "generated_at": datetime.utcnow().isoformat(),
            "ai_generated": True,
        }

    except Exception as e:
        logger.error(f"Grant report error: {e}")
        return {"error": str(e)}


async def generate_cashflow_forecast(
    months_ahead: int,
    db: Session,
    org_id: int,
    org_name: str,
) -> dict:
    """AI-powered cashflow forecast."""
    try:
        context = await get_financial_context(db, org_id)
        system = _format_system_prompt(context, org_name)
        prompt = f"""Generate a detailed {months_ahead}-month cash flow forecast for {org_name}.

Using the live financial data in your context, provide:
1. Monthly income projections (grants, donations, contracts) with amounts
2. Monthly expenditure projections (payroll, programme costs, overheads) with amounts
3. Net cash position each month and cumulative balance
4. Risk scenarios — pessimistic (−20%) and optimistic (+15%)
5. Key assumptions underpinning the forecast
6. Recommendations to extend cash runway if needed

Be specific with £ amounts. Present in a clear table format."""

        return {
            "forecast_months": months_ahead,
            "narrative": _call_llm([{"role": "user", "content": prompt}], system, 3000),
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Forecast error: {e}")
        return {"error": str(e)}
