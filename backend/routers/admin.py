"""
Admin Router — Multi-tenancy management
Provides organisation administration, user management, and platform oversight.
Only accessible to users with role='admin'.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
from backend.core.security import get_current_user, require_role
from backend.models.user import User, Organisation

router = APIRouter(prefix="/admin", tags=["Admin"])

require_admin = require_role("admin")


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
    organisation_id: int


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    legal_type: Optional[str] = None
    charity_number: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
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
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if organisation_id:
        q = q.filter(User.organisation_id == organisation_id)
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.full_name).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "organisation_id": u.organisation_id,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/users/invite", status_code=201)
async def invite_user(
    data: UserInvite,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = db.query(Organisation).filter(Organisation.id == data.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    from backend.core.security import hash_password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    user = User(
        organisation_id=data.organisation_id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(temp_password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "temporary_password": temp_password,
        "message": "User created. Share the temporary password securely.",
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    valid_roles = {"cfo", "finance_manager", "programme_manager", "admin", "viewer"}
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    db.commit()
    return {"user_id": user_id, "new_role": role}


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
