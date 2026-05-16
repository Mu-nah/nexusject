from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User, Organisation
from backend.services.ai_service import (
    ai_assistant_chat,
    get_financial_context,
    generate_grant_report,
    generate_cashflow_forecast,
)
from backend.services.report_service import save_workspace_report, serialize_report

router = APIRouter(prefix="/ai", tags=["AI Financial Intelligence"])


class ChatMessage(BaseModel):
    role: str  # user / assistant
    content: str


class AssistantRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []


class ForecastRequest(BaseModel):
    months_ahead: int = 6


class GrantReportRequest(BaseModel):
    grant_id: int
    period_start: datetime
    period_end: datetime


class ProgrammeCostRequest(BaseModel):
    programme_id: int


class FinancialAnalysisRequest(BaseModel):
    focus: str = "general"  # general, cash_flow, grants, payroll, donations
    period: Optional[str] = None


# ── AI Assistant Chat ─────────────────────────────────────────────────────────

@router.post("/assistant")
async def assistant_chat(
    data: AssistantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    org_name = org.name if org and org.name else "Current workspace"

    context = await get_financial_context(db, current_user.organisation_id)

    history = [{"role": m.role, "content": m.content} for m in data.conversation_history[-10:]]

    response = await ai_assistant_chat(
        message=data.message,
        conversation_history=history,
        org_name=org_name,
        financial_context=context,
    )

    return {
        "response": response,
        "context_used": list(context.keys()),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Financial Analysis ────────────────────────────────────────────────────────

@router.post("/financial-analysis")
async def financial_analysis(
    data: FinancialAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    org_name = org.name if org and org.name else "Current workspace"
    context = await get_financial_context(db, current_user.organisation_id)

    prompts = {
        "general": f"Provide a comprehensive financial health analysis for {org_name}. Highlight key strengths, risks, and 3 actionable recommendations.",
        "cash_flow": f"Analyse the cash flow position for {org_name}. Assess sustainability, identify risks to cash runway, and recommend mitigation steps.",
        "grants": f"Review the grant portfolio for {org_name}. Assess utilisation rates, compliance risks, and recommend optimisation strategies.",
        "payroll": f"Analyse payroll costs for {org_name}. Assess affordability, grant-funding ratios, and staffing sustainability.",
        "donations": f"Analyse the fundraising performance for {org_name}. Identify trends, donor retention opportunities, and income diversification recommendations.",
    }

    prompt = prompts.get(data.focus, prompts["general"])
    if data.period:
        prompt += f" Focus on the period: {data.period}."

    response = await ai_assistant_chat(
        message=prompt,
        conversation_history=[],
        org_name=org_name,
        financial_context=context,
    )

    report_title = {
        "general": "Management Accounts Overview",
        "cash_flow": "Cash Flow Analysis",
        "grants": "Grant Portfolio Analysis",
        "payroll": "Payroll Sustainability Review",
        "donations": "Fundraising Performance Review",
    }.get(data.focus, "Financial Analysis")

    saved_report = save_workspace_report(
        db,
        organisation_id=current_user.organisation_id,
        created_by=current_user.id,
        title=report_title,
        report_type="management_accounts" if data.focus == "general" else data.focus,
        period_label=data.period,
        narrative=response,
    )

    return {
        "focus": data.focus,
        "analysis": response,
        "generated_at": datetime.utcnow().isoformat(),
        "report": serialize_report(saved_report),
    }


# ── Cashflow Forecast ─────────────────────────────────────────────────────────

@router.post("/cashflow-forecast")
async def cashflow_forecast(
    data: ForecastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.months_ahead < 1 or data.months_ahead > 24:
        raise HTTPException(status_code=400, detail="months_ahead must be between 1 and 24")

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    result = await generate_cashflow_forecast(
        months_ahead=data.months_ahead,
        db=db,
        org_id=current_user.organisation_id,
        org_name=org.name if org and org.name else "Current workspace",
    )
    return result


# ── Grant Report Generation ───────────────────────────────────────────────────

@router.post("/grant-report")
async def grant_report(
    data: GrantReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.models.grant import Grant
    grant = db.query(Grant).filter(
        Grant.id == data.grant_id,
        Grant.organisation_id == current_user.organisation_id
    ).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    result = await generate_grant_report(
        grant_id=data.grant_id,
        period_start=data.period_start,
        period_end=data.period_end,
        db=db,
        org_name=org.name if org and org.name else "Current workspace",
    )
    if "narrative" in result:
        saved_report = save_workspace_report(
            db,
            organisation_id=current_user.organisation_id,
            created_by=current_user.id,
            title=f"{grant.name} Grant Report",
            report_type="grant",
            period_label=result.get("period"),
            narrative=result["narrative"],
        )
        result["report"] = serialize_report(saved_report)
    return result


# ── Programme Cost Analysis ───────────────────────────────────────────────────

@router.post("/programme-cost-analysis")
async def programme_cost_analysis(
    data: ProgrammeCostRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.models.grant import Programme
    prog = db.query(Programme).filter(
        Programme.id == data.programme_id,
        Programme.organisation_id == current_user.organisation_id
    ).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Programme not found")

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    context = await get_financial_context(db, current_user.organisation_id)

    prompt = f"""Analyse the cost-effectiveness of the '{prog.name}' programme for {org.name if org else 'the organisation'}.

Programme data:
- Total budget: £{float(prog.total_budget or 0):,.2f}
- Amount spent: £{float(prog.spent or 0):,.2f}
- Participants: {prog.actual_participants} (target: {prog.target_participants})
- Cost per beneficiary: £{float(prog.spent or 0) / max(prog.actual_participants, 1):,.2f}
- Volunteer hours: {float(prog.volunteer_hours or 0):,.0f}

Provide:
1. Value for money assessment
2. Comparison with sector benchmarks
3. Efficiency recommendations
4. Grant reporting narrative points
"""

    response = await ai_assistant_chat(
        message=prompt,
        conversation_history=[],
        org_name=org.name if org and org.name else "Current workspace",
        financial_context=context,
    )

    return {
        "programme_id": data.programme_id,
        "programme_name": prog.name,
        "analysis": response,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Trustee Report ────────────────────────────────────────────────────────────

@router.post("/trustee-report")
async def generate_trustee_report(
    quarter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    context = await get_financial_context(db, current_user.organisation_id)
    org_name = org.name if org and org.name else "Current workspace"

    period = quarter or datetime.utcnow().strftime("Q ending %B %Y")
    prompt = f"""Generate a professional Trustee Financial Report for {org_name} for {period}.

Format:
1. Financial Overview (3-4 sentences)
2. Income Summary (grants, donations, SLA contracts)
3. Expenditure Summary (staffing, programmes, overheads)
4. Grant Portfolio Status
5. Reserves Position & Cash Runway
6. Key Risks & Mitigations
7. Recommendations for Board Action

Use formal charity sector language. Suitable for a board meeting agenda pack."""

    response = await ai_assistant_chat(
        message=prompt,
        conversation_history=[],
        org_name=org_name,
        financial_context=context,
    )

    saved_report = save_workspace_report(
        db,
        organisation_id=current_user.organisation_id,
        created_by=current_user.id,
        title="Trustee Financial Report",
        report_type="trustee",
        period_label=period,
        narrative=response,
    )

    return {
        "report_type": "trustee_financial_report",
        "period": period,
        "narrative": response,
        "generated_at": datetime.utcnow().isoformat(),
        "ai_generated": True,
        "report": serialize_report(saved_report),
    }
