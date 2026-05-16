from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
import re
import httpx

from backend.core.database import get_db
from backend.core.security import (
    verify_password, hash_password, create_access_token, get_current_user
)
from backend.core.settings import settings
from backend.models.user import User, Organisation
from backend.models.invite import WorkspaceInvite
from backend.services.email_service import send_workspace_invite_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
DEFAULT_MODULE_ACCESS = ["finance", "operations", "people_hr", "compliance"]


def _parse_module_access(raw: Optional[str]) -> list[str]:
    if not raw:
        return DEFAULT_MODULE_ACCESS.copy()
    modules = [item.strip() for item in raw.split(",") if item.strip()]
    return modules or DEFAULT_MODULE_ACCESS.copy()


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    organisation_name: str
    organisation_type: str = "Company"
    country: str = "United Kingdom"
    currency: str = "GBP"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    email: str
    role: str
    module_access: list[str]
    organisation: str
    organisation_slug: str


class AcceptInviteRequest(BaseModel):
    token: str
    password: str


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    organisation_name: Optional[str] = None
    organisation_type: str = "Company"
    country: str = "United Kingdom"
    currency: str = "GBP"


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "workspace"


def _create_org_for_registration(db: Session, organisation_name: str, organisation_type: str, country: str, currency: str) -> Organisation:
    base_slug = _slugify(organisation_name)
    org_slug = base_slug
    suffix = 2
    while db.query(Organisation).filter(Organisation.slug == org_slug).first():
        org_slug = f"{base_slug}-{suffix}"
        suffix += 1

    org = Organisation(
        slug=org_slug,
        name=organisation_name.strip(),
        legal_type=organisation_type.strip(),
        country=country.strip(),
        currency=currency.strip().upper(),
    )
    db.add(org)
    db.flush()
    return org


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = _create_org_for_registration(
        db,
        data.organisation_name,
        data.organisation_type,
        data.country,
        data.currency,
    )

    user = User(
        organisation_id=org.id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        auth_provider="password",
        role="owner",
        module_access="finance,operations,people_hr,compliance",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "org": org.slug})
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        module_access=_parse_module_access(user.module_access),
        organisation=org.name,
        organisation_slug=org.slug,
    )


@router.post("/login", response_model=LoginResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.utcnow()
    db.commit()

    org = db.query(Organisation).filter(Organisation.id == user.organisation_id).first()
    token = create_access_token({"sub": str(user.id), "role": user.role, "org": org.slug if org else ""})

    return LoginResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        module_access=_parse_module_access(user.module_access),
        organisation=org.name if org else "",
        organisation_slug=org.slug if org else "",
    )


@router.post("/google", response_model=LoginResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    redirect_uri = data.redirect_uri or settings.GOOGLE_OAUTH_REDIRECT_URI or "postmessage"

    try:
        token_response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": data.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=30.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Google token exchange request failed: {exc}") from exc

    if token_response.status_code >= 400:
        try:
            token_error = token_response.json()
        except ValueError:
            token_error = {"error": token_response.text}
        error_code = token_error.get("error") or "unknown_error"
        error_description = token_error.get("error_description") or "No additional details returned by Google"
        raise HTTPException(
            status_code=400,
            detail=f"Google token exchange failed: {error_code} - {error_description}",
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Google access token missing")

    profile_response = httpx.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30.0,
    )
    if profile_response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Google user profile lookup failed")
    profile = profile_response.json()

    email = profile.get("email")
    full_name = profile.get("name") or email
    google_subject = profile.get("sub")
    if not email or not google_subject:
        raise HTTPException(status_code=400, detail="Google profile is incomplete")

    user = db.query(User).filter((User.google_subject == google_subject) | (User.email == email)).first()
    if user:
        user.google_subject = google_subject
        user.auth_provider = "google"
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        org = db.query(Organisation).filter(Organisation.id == user.organisation_id).first()
    else:
        org_name = data.organisation_name or f"{full_name}'s Workspace"
        org = _create_org_for_registration(
            db,
            org_name,
            data.organisation_type,
            data.country,
            data.currency,
        )
        user = User(
            organisation_id=org.id,
            email=email,
            full_name=full_name,
            hashed_password=hash_password(google_subject),
            auth_provider="google",
            google_subject=google_subject,
            role="owner",
            module_access="finance,operations,people_hr,compliance",
            last_login=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "org": org.slug if org else ""})
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        module_access=_parse_module_access(user.module_access),
        organisation=org.name if org else "",
        organisation_slug=org.slug if org else "",
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "module_access": _parse_module_access(current_user.module_access),
        "organisation": org.name if org else None,
        "organisation_slug": org.slug if org else None,
        "organisation_type": org.legal_type if org else None,
        "country": org.country if org else None,
        "currency": org.currency if org else None,
        "last_login": current_user.last_login,
    }


@router.post("/accept-invite", response_model=LoginResponse)
async def accept_invite(data: AcceptInviteRequest, db: Session = Depends(get_db)):
    invite = (
        db.query(WorkspaceInvite)
        .filter(WorkspaceInvite.invite_token == data.token, WorkspaceInvite.accepted == False)
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already accepted")

    existing = db.query(User).filter(User.email == invite.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    org = db.query(Organisation).filter(Organisation.id == invite.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    user = User(
        organisation_id=invite.organisation_id,
        email=invite.email,
        full_name=invite.full_name,
        hashed_password=hash_password(data.password),
        role=invite.role,
        module_access=invite.module_access,
    )
    db.add(user)
    invite.accepted = True
    invite.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "org": org.slug})
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        module_access=_parse_module_access(user.module_access),
        organisation=org.name,
        organisation_slug=org.slug,
    )
