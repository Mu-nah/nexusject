"""
Admin Router — Multi-tenancy management
Provides organisation administration, user management, and platform oversight.
Only accessible to users with role='admin'.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
from backend.core.security import get_current_user, require_role
from backend.models.employee import Employee
from backend.models.invite import WorkspaceInvite
from backend.models.ops import (
    HrContractDocument,
    HrDbsRecord,
    HrLeaveRequest,
    HrPerformanceReview,
    HrRightToWorkRecord,
    Trustee,
    UkviCosRecord,
    UkviDuty,
    UkviWorker,
    Volunteer,
    VolunteerAgreement,
    VolunteerHour,
)
from backend.models.user import User, Organisation
from backend.services.email_service import send_workspace_invite_email

router = APIRouter(prefix="/admin", tags=["Admin"])

require_admin = require_role("owner", "admin")
DEFAULT_MODULE_ACCESS = ["finance", "operations", "people_hr", "compliance"]
AVAILABLE_MODULE_ACCESS = set(DEFAULT_MODULE_ACCESS)


def _normalise_module_access(values: Optional[List[str]]) -> list[str]:
    if values == []:
        return []
    cleaned = []
    source = DEFAULT_MODULE_ACCESS if values is None else values
    for value in source:
        token = value.strip().lower()
        if token in AVAILABLE_MODULE_ACCESS and token not in cleaned:
            cleaned.append(token)
    return cleaned


def _module_access_string(values: Optional[List[str]]) -> str:
    return ",".join(_normalise_module_access(values))


def _module_access_list(raw: Optional[str]) -> list[str]:
    if raw == "":
        return []
    return _normalise_module_access(raw.split(",") if raw else DEFAULT_MODULE_ACCESS)


def _normalise_role(role: Optional[str]) -> str:
    cleaned = (role or "").strip().lower().replace(" ", "_")
    if not cleaned:
        raise HTTPException(status_code=400, detail="Role is required")
    return cleaned


def _user_name_map(db: Session, organisation_id: int) -> dict[int, str]:
    return {
        user.id: user.full_name
        for user in db.query(User).filter(User.organisation_id == organisation_id).all()
    }


class OrgCreate(BaseModel):
    slug: str
    name: str
    legal_type: str = "CIC"
    charity_number: Optional[str] = None
    companies_house_number: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    currency: str = "GBP"


class UserInvite(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "viewer"
    module_access: List[str] = DEFAULT_MODULE_ACCESS.copy()


class UserAccessUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    module_access: Optional[List[str]] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    legal_type: Optional[str] = None
    charity_number: Optional[str] = None
    companies_house_number: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


# ── Organisations ─────────────────────────────────────────────────────────────

@router.get("/organisations")
async def list_organisations(
    active_only: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all tenant organisations."""
    q = db.query(Organisation)
    if active_only:
        q = q.filter(Organisation.is_active == True)
    orgs = q.order_by(Organisation.name).all()
    return [
        {
            "id": o.id,
            "slug": o.slug,
            "name": o.name,
            "legal_type": o.legal_type,
            "currency": o.currency,
            "is_active": o.is_active,
            "user_count": db.query(func.count(User.id))
                .filter(User.organisation_id == o.id).scalar(),
            "created_at": o.created_at.isoformat(),
        }
        for o in orgs
    ]


@router.get("/workspace")
async def get_workspace(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    return {
        "id": org.id,
        "slug": org.slug,
        "name": org.name,
        "legal_type": org.legal_type,
        "charity_number": org.charity_number,
        "companies_house_number": org.companies_house_number,
        "address": org.address,
        "email": org.email,
        "phone": org.phone,
        "country": org.country,
        "currency": org.currency,
        "is_active": org.is_active,
        "created_at": org.created_at.isoformat(),
        "updated_at": org.updated_at.isoformat() if org.updated_at else None,
    }


@router.post("/workspace/cleanup-demo-data")
async def cleanup_workspace_demo_data(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    deleted: dict[str, int] = {}

    volunteer_names = ["Sarah Adebayo", "Michael Osei", "Fatima Al-Hassan", "Peter Nwosu"]
    trustee_names = ["Dominic Ogbuagu", "Grace Okafor", "Ahmed Al-Rashid"]
    employee_names = ["Dominic Ogbuagu", "Aisha Ibrahim", "Kwame Okafor", "Jamilu Musa"]

    deleted["volunteers"] = db.query(Volunteer).filter(
        Volunteer.organisation_id == org_id,
        Volunteer.name.in_(volunteer_names),
    ).delete(synchronize_session=False)
    deleted["volunteer_hours"] = db.query(VolunteerHour).filter(
        VolunteerHour.organisation_id == org_id,
        VolunteerHour.volunteer_name.in_(volunteer_names),
    ).delete(synchronize_session=False)
    deleted["volunteer_agreements"] = db.query(VolunteerAgreement).filter(
        VolunteerAgreement.organisation_id == org_id,
        VolunteerAgreement.name.in_(volunteer_names),
    ).delete(synchronize_session=False)
    deleted["trustees"] = db.query(Trustee).filter(
        Trustee.organisation_id == org_id,
        Trustee.name.in_(trustee_names),
    ).delete(synchronize_session=False)
    deleted["ukvi_workers"] = db.query(UkviWorker).filter(
        UkviWorker.organisation_id == org_id,
        UkviWorker.name == "Kwame Okafor",
        UkviWorker.cos == "CoS-2023-0041",
    ).delete(synchronize_session=False)
    deleted["ukvi_cos_records"] = db.query(UkviCosRecord).filter(
        UkviCosRecord.organisation_id == org_id,
        UkviCosRecord.cos_ref.in_(["CoS-2023-0041", "CoS-2024-0012"]),
    ).delete(synchronize_session=False)
    deleted["ukvi_duties"] = db.query(UkviDuty).filter(
        UkviDuty.organisation_id == org_id,
        UkviDuty.duty.in_(["RTW Check Renewal", "Absence Report", "Annual Confirmation of Accuracy"]),
    ).delete(synchronize_session=False)
    deleted["hr_rtw_records"] = db.query(HrRightToWorkRecord).filter(
        HrRightToWorkRecord.organisation_id == org_id,
        HrRightToWorkRecord.name.in_(employee_names),
    ).delete(synchronize_session=False)
    deleted["hr_dbs_records"] = db.query(HrDbsRecord).filter(
        HrDbsRecord.organisation_id == org_id,
        HrDbsRecord.name.in_(employee_names),
    ).delete(synchronize_session=False)
    deleted["hr_leave_requests"] = db.query(HrLeaveRequest).filter(
        HrLeaveRequest.organisation_id == org_id,
        HrLeaveRequest.name.in_(["Kwame Okafor", "Aisha Ibrahim"]),
    ).delete(synchronize_session=False)
    deleted["hr_performance_reviews"] = db.query(HrPerformanceReview).filter(
        HrPerformanceReview.organisation_id == org_id,
        HrPerformanceReview.name.in_(["Aisha Ibrahim", "Kwame Okafor", "Jamilu Musa"]),
    ).delete(synchronize_session=False)
    deleted["hr_contract_documents"] = db.query(HrContractDocument).filter(
        HrContractDocument.organisation_id == org_id,
        HrContractDocument.name.in_(["Dominic Ogbuagu", "Aisha Ibrahim", "Kwame Okafor"]),
    ).delete(synchronize_session=False)
    deleted["employees"] = db.query(Employee).filter(
        Employee.organisation_id == org_id,
        Employee.employee_number.in_(["EMP-0001", "EMP-0002", "EMP-0003", "EMP-0004"]),
        Employee.full_name.in_(employee_names),
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "workspace_id": org_id,
        "deleted": deleted,
        "total_deleted": sum(deleted.values()),
    }


@router.patch("/workspace")
async def update_workspace(
    data: OrgUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)
    org.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(org)

    return {
        "id": org.id,
        "name": org.name,
        "legal_type": org.legal_type,
        "country": org.country,
        "currency": org.currency,
        "updated": True,
    }


@router.post("/organisations", status_code=201)
async def create_organisation(
    data: OrgCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new tenant organisation."""
    existing = db.query(Organisation).filter(Organisation.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Organisation slug '{data.slug}' already exists")

    org = Organisation(**data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return {"id": org.id, "slug": org.slug, "name": org.name}


@router.patch("/organisations/{org_id}")
async def update_organisation(
    org_id: int,
    data: OrgUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)
    org.updated_at = datetime.utcnow()
    db.commit()
    return {"id": org.id, "updated": True}


@router.delete("/organisations/{org_id}")
async def deactivate_organisation(
    org_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    org.is_active = False
    db.commit()
    return {"message": f"Organisation '{org.name}' deactivated"}


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_all_users(
    organisation_id: Optional[int] = None,
    role: Optional[str] = None,
    invited_by_me: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if current_user.role != "owner":
        q = q.filter(User.organisation_id == current_user.organisation_id)
    elif organisation_id:
        q = q.filter(User.organisation_id == organisation_id)
    if role:
        q = q.filter(User.role == role)
    if invited_by_me:
        invite_emails = [
            row[0]
            for row in db.query(WorkspaceInvite.email)
            .filter(
                WorkspaceInvite.organisation_id == current_user.organisation_id,
                WorkspaceInvite.invited_by == current_user.id,
            )
            .all()
        ]
        q = q.filter((User.id == current_user.id) | (User.email.in_(invite_emails)))
    users = q.order_by(User.full_name).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "organisation_id": u.organisation_id,
            "organisation_name": db.query(Organisation.name).filter(Organisation.id == u.organisation_id).scalar(),
            "is_active": u.is_active,
            "module_access": _module_access_list(u.module_access),
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/users/invite", status_code=201)
async def invite_user(
    data: UserInvite,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    import secrets
    invite = WorkspaceInvite(
        organisation_id=current_user.organisation_id,
        email=data.email,
        full_name=data.full_name,
        role=_normalise_role(data.role),
        module_access=_module_access_string(data.module_access),
        invite_token=secrets.token_urlsafe(24),
        invited_by=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    frontend_base = request.headers.get("origin") or "http://localhost:3000"
    invite_link = f"{frontend_base}/login?invite={invite.invite_token}"
    send_workspace_invite_email(
        to_email=invite.email,
        invitee_name=invite.full_name,
        inviter_name=current_user.full_name,
        org_name=org.name,
        invite_link=invite_link,
        role=invite.role,
    )

    return {
        "id": invite.id,
        "email": invite.email,
        "invite_token": invite.invite_token,
        "invite_link": invite_link,
        "message": "Invite created and emailed.",
        "module_access": _module_access_list(invite.module_access),
        "invited_by": invite.invited_by,
    }


@router.get("/invites")
async def list_invites(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name_map = _user_name_map(db, current_user.organisation_id)
    invites = (
        db.query(WorkspaceInvite)
        .filter(
            WorkspaceInvite.organisation_id == current_user.organisation_id,
            WorkspaceInvite.invited_by == current_user.id,
        )
        .order_by(WorkspaceInvite.created_at.desc())
        .all()
    )
    return [
        {
            "id": invite.id,
            "email": invite.email,
            "full_name": invite.full_name,
            "role": invite.role,
            "accepted": invite.accepted,
            "invited_by": invite.invited_by,
            "invited_by_name": name_map.get(invite.invited_by, "Unknown"),
            "module_access": _module_access_list(invite.module_access),
            "created_at": invite.created_at.isoformat(),
            "accepted_at": invite.accepted_at.isoformat() if invite.accepted_at else None,
        }
        for invite in invites
    ]


@router.get("/access-monitor")
async def access_monitor(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name_map = _user_name_map(db, current_user.organisation_id)
    users = (
        db.query(User)
        .filter(User.organisation_id == current_user.organisation_id)
        .order_by(User.full_name)
        .all()
    )
    invites = (
        db.query(WorkspaceInvite)
        .filter(WorkspaceInvite.organisation_id == current_user.organisation_id)
        .order_by(WorkspaceInvite.created_at.desc())
        .all()
    )

    return {
        "summary": {
            "active_users": sum(1 for user in users if user.is_active),
            "owners_admins": sum(1 for user in users if user.role in {"owner", "admin"}),
            "pending_invites": sum(1 for invite in invites if not invite.accepted),
            "never_logged_in": sum(1 for user in users if not user.last_login),
        },
        "users": [
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "module_access": _module_access_list(user.module_access),
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "created_at": user.created_at.isoformat(),
            }
            for user in users
        ],
        "invites": [
            {
                "id": invite.id,
                "full_name": invite.full_name,
                "email": invite.email,
                "role": invite.role,
                "accepted": invite.accepted,
                "invited_by": invite.invited_by,
                "invited_by_name": name_map.get(invite.invited_by, "Unknown"),
                "module_access": _module_access_list(invite.module_access),
                "created_at": invite.created_at.isoformat(),
                "accepted_at": invite.accepted_at.isoformat() if invite.accepted_at else None,
            }
            for invite in invites
        ],
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = _normalise_role(role)
    db.commit()
    return {"user_id": user_id, "new_role": user.role}


@router.patch("/users/{user_id}/access")
async def update_user_access(
    user_id: int,
    data: UserAccessUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.organisation_id == current_user.organisation_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    if data.role is not None:
        user.role = _normalise_role(data.role)

    if data.is_active is not None:
        user.is_active = data.is_active

    if data.module_access is not None:
        user.module_access = _module_access_string(data.module_access)

    db.commit()
    db.refresh(user)
    return {
        "user_id": user.id,
        "role": user.role,
        "is_active": user.is_active,
        "module_access": _module_access_list(user.module_access),
        "updated": True,
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": f"User '{user.full_name}' deactivated"}


# ── Platform stats ────────────────────────────────────────────────────────────

@router.get("/platform-stats")
async def platform_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """High-level platform statistics for the admin console."""
    from backend.models.grant import Grant
    from backend.models.employee import Employee
    from backend.models.donor import Donation

    total_orgs = db.query(func.count(Organisation.id)).scalar() or 0
    active_orgs = db.query(func.count(Organisation.id)).filter(Organisation.is_active == True).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_grants = db.query(func.count(Grant.id)).scalar() or 0
    total_employees = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0
    total_donations = db.query(func.sum(Donation.amount)).filter(Donation.status == "completed").scalar() or 0

    return {
        "organisations": {"total": total_orgs, "active": active_orgs},
        "users": {"total": total_users},
        "grants": {"total": total_grants},
        "active_employees": total_employees,
        "total_donations_processed": float(total_donations),
        "platform": "Realtouch Financial ERP v1.0",
        "generated_at": datetime.utcnow().isoformat(),
    }
