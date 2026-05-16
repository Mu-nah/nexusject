import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user, hash_password, require_any, require_finance
from backend.models.employee import Employee, PayrollRecord, PayrollRun
from backend.models.ops import HrLeaveRequest
from backend.models.platform import ApiKey, EmployeeNotification, RegulatoryFramework, WebhookSubscription
from backend.models.user import Organisation, User

router = APIRouter(prefix="/platform", tags=["Platform"])
employee_router = APIRouter(prefix="/employee-portal", tags=["Employee Portal"])


UK_FRAMEWORK = {
    "tax_rules": {"jurisdiction": "UK", "default_tax_year": "2024-25", "supports_scotland": True},
    "payroll_rules": {"currency": "GBP", "rti_required": True, "bacs_standard": "18"},
    "leave_entitlements": {"annual_leave_days": 28, "sick_pay": "SSP", "parental_pay": ["SMP", "SPP", "SAP"]},
    "filing_deadlines": {"fps": "on-or-before-payday", "eps": "19th-of-following-month", "p60": "31 May"},
    "pension_rules": {"auto_enrolment": True, "default_provider": "NEST"},
}

STUB_FRAMEWORKS = {
    "Ireland": {},
    "Nigeria": {},
    "Ghana": {},
    "Kenya": {},
}


class WorkspaceRegulatoryUpdate(BaseModel):
    countries_of_operation: list[str]
    active_regulatory_framework: str = "UK"


class ApiKeyCreate(BaseModel):
    name: str
    scopes: list[str]
    expires_in_days: Optional[int] = 365


class WebhookCreate(BaseModel):
    target_url: str
    events: list[str]


class EmployeePortalLogin(BaseModel):
    email: str
    password: str


class EmployeeNotificationCreate(BaseModel):
    employee_id: int
    title: str
    message: str
    category: str = "general"
    action_url: Optional[str] = None


def _ensure_frameworks(db: Session, organisation_id: int):
    existing = {
        item.jurisdiction: item
        for item in db.query(RegulatoryFramework).filter(
            (RegulatoryFramework.organisation_id == organisation_id) | (RegulatoryFramework.organisation_id.is_(None))
        ).all()
    }
    if "UK" not in existing:
        db.add(
            RegulatoryFramework(
                organisation_id=organisation_id,
                jurisdiction="UK",
                is_active=True,
                **UK_FRAMEWORK,
            )
        )
    for jurisdiction in STUB_FRAMEWORKS:
        if jurisdiction not in existing:
            db.add(
                RegulatoryFramework(
                    organisation_id=organisation_id,
                    jurisdiction=jurisdiction,
                    is_active=False,
                    tax_rules={},
                    payroll_rules={},
                    leave_entitlements={},
                    filing_deadlines={},
                    pension_rules={},
                )
            )


def _get_employee_for_user(db: Session, user: User) -> Employee:
    employee = db.query(Employee).filter(
        Employee.organisation_id == user.organisation_id,
        Employee.user_id == user.id,
    ).first()
    if not employee:
        raise HTTPException(status_code=403, detail="Employee portal access is not enabled for this user")
    return employee


@router.get("/regulatory-frameworks")
async def list_regulatory_frameworks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_frameworks(db, current_user.organisation_id)
    db.commit()
    frameworks = db.query(RegulatoryFramework).filter(
        RegulatoryFramework.organisation_id == current_user.organisation_id
    ).order_by(RegulatoryFramework.jurisdiction.asc()).all()
    return [
        {
            "id": framework.id,
            "jurisdiction": framework.jurisdiction,
            "is_active": framework.is_active,
            "tax_rules": framework.tax_rules or {},
            "payroll_rules": framework.payroll_rules or {},
            "leave_entitlements": framework.leave_entitlements or {},
            "filing_deadlines": framework.filing_deadlines or {},
            "pension_rules": framework.pension_rules or {},
        }
        for framework in frameworks
    ]


@router.post("/workspace/regulatory")
async def update_workspace_regulatory_settings(
    payload: WorkspaceRegulatoryUpdate,
    current_user: User = Depends(require_any),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    _ensure_frameworks(db, current_user.organisation_id)
    org.countries_of_operation = ",".join(payload.countries_of_operation)
    org.active_regulatory_framework = payload.active_regulatory_framework

    frameworks = db.query(RegulatoryFramework).filter(
        RegulatoryFramework.organisation_id == current_user.organisation_id
    ).all()
    for framework in frameworks:
        framework.is_active = framework.jurisdiction.upper() == payload.active_regulatory_framework.upper()

    db.commit()
    return {
        "countries_of_operation": payload.countries_of_operation,
        "active_regulatory_framework": payload.active_regulatory_framework,
    }


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    keys = db.query(ApiKey).filter(ApiKey.organisation_id == current_user.organisation_id).order_by(ApiKey.created_at.desc()).all()
    return [
        {
            "id": key.id,
            "name": key.name,
            "key_prefix": key.key_prefix,
            "scopes": key.scopes or [],
            "is_active": key.is_active,
            "expires_at": key.expires_at.isoformat() if key.expires_at else None,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
        }
        for key in keys
    ]


@router.post("/api-keys", status_code=201)
async def create_api_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    raw_key = f"nx1_{secrets.token_urlsafe(24)}"
    prefix = raw_key[:12]
    expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days or 365)
    key = ApiKey(
        organisation_id=current_user.organisation_id,
        name=payload.name,
        key_prefix=prefix,
        hashed_key=hash_password(raw_key),
        scopes=payload.scopes,
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return {
        "id": key.id,
        "name": key.name,
        "api_key": raw_key,
        "key_prefix": key.key_prefix,
        "scopes": key.scopes or [],
        "expires_at": key.expires_at.isoformat() if key.expires_at else None,
    }


@router.get("/webhooks")
async def list_webhooks(
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    hooks = db.query(WebhookSubscription).filter(
        WebhookSubscription.organisation_id == current_user.organisation_id
    ).order_by(WebhookSubscription.created_at.desc()).all()
    return [
        {
            "id": hook.id,
            "target_url": hook.target_url,
            "events": hook.events or [],
            "is_active": hook.is_active,
            "last_delivery_at": hook.last_delivery_at.isoformat() if hook.last_delivery_at else None,
        }
        for hook in hooks
    ]


@router.post("/webhooks", status_code=201)
async def create_webhook(
    payload: WebhookCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    signing_secret = secrets.token_urlsafe(24)
    hook = WebhookSubscription(
        organisation_id=current_user.organisation_id,
        target_url=payload.target_url,
        events=payload.events,
        signing_secret=signing_secret,
        created_by=current_user.id,
    )
    db.add(hook)
    db.commit()
    db.refresh(hook)
    return {
        "id": hook.id,
        "target_url": hook.target_url,
        "events": hook.events,
        "signing_secret": signing_secret,
    }


@router.post("/employee-notifications", status_code=201)
async def create_employee_notification(
    payload: EmployeeNotificationCreate,
    current_user: User = Depends(require_any),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == payload.employee_id,
        Employee.organisation_id == current_user.organisation_id,
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    notification = EmployeeNotification(
        organisation_id=current_user.organisation_id,
        employee_id=payload.employee_id,
        title=payload.title,
        message=payload.message,
        category=payload.category,
        action_url=payload.action_url,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return {"id": notification.id, "title": notification.title}


@employee_router.post("/login")
async def employee_portal_login(
    payload: EmployeePortalLogin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # This endpoint intentionally reuses the primary JWT session and validates
    # that the authenticated user is linked to an employee record.
    if current_user.email.lower() != payload.email.lower():
        raise HTTPException(status_code=403, detail="Employee portal login must match the authenticated user")
    employee = _get_employee_for_user(db, current_user)
    return {
        "employee_id": employee.id,
        "user_id": current_user.id,
        "role": current_user.role,
        "portal": "employee",
    }


@employee_router.get("/me")
async def employee_portal_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = _get_employee_for_user(db, current_user)
    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "full_name": employee.full_name,
        "email": employee.email,
        "role_title": employee.role_title,
        "start_date": employee.start_date.isoformat() if employee.start_date else None,
        "visa_status": None,
        "contract_type": employee.contract_type,
    }


@employee_router.get("/notifications")
async def employee_portal_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = _get_employee_for_user(db, current_user)
    notifications = db.query(EmployeeNotification).filter(
        EmployeeNotification.organisation_id == current_user.organisation_id,
        EmployeeNotification.employee_id == employee.id,
    ).order_by(EmployeeNotification.created_at.desc()).limit(50).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "message": item.message,
            "category": item.category,
            "action_url": item.action_url,
            "read_at": item.read_at.isoformat() if item.read_at else None,
            "created_at": item.created_at.isoformat(),
        }
        for item in notifications
    ]


@employee_router.get("/payslips")
async def employee_portal_payslips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = _get_employee_for_user(db, current_user)
    records = db.query(PayrollRecord).join(PayrollRun).filter(
        PayrollRecord.employee_id == employee.id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).order_by(PayrollRun.pay_date.desc()).limit(24).all()
    return [
        {
            "run_id": record.payroll_run_id,
            "period": record.payroll_run.period_start.strftime("%B %Y") if record.payroll_run else None,
            "gross_pay": float(record.gross_pay or 0),
            "net_pay": float(record.net_pay or 0),
            "pay_date": record.payroll_run.pay_date.isoformat() if record.payroll_run else None,
        }
        for record in records
    ]


@employee_router.get("/leave")
async def employee_portal_leave(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = _get_employee_for_user(db, current_user)
    requests = db.query(HrLeaveRequest).filter(
        HrLeaveRequest.organisation_id == current_user.organisation_id,
        HrLeaveRequest.name == employee.full_name,
    ).order_by(HrLeaveRequest.created_at.desc()).all()
    return [
        {
            "id": item.id,
            "leave_type": item.leave_type,
            "date_from": item.date_from,
            "date_to": item.date_to,
            "days": item.days,
            "status": item.status,
        }
        for item in requests
    ]

