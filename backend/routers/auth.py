from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
import re

from backend.core.database import get_db
from backend.core.security import (
    verify_password, hash_password, create_access_token, get_current_user
)
from backend.models.user import User, Organisation

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    organisation: str
    organisation_slug: str


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "workspace"


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    base_slug = _slugify(data.organisation_name)
    org_slug = base_slug
    suffix = 2
    while db.query(Organisation).filter(Organisation.slug == org_slug).first():
        org_slug = f"{base_slug}-{suffix}"
        suffix += 1

    org = Organisation(
        slug=org_slug,
        name=data.organisation_name.strip(),
        legal_type=data.organisation_type.strip(),
        country=data.country.strip(),
        currency=data.currency.strip().upper(),
    )
    db.add(org)
    db.flush()

    user = User(
        organisation_id=org.id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="admin",
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
        "organisation": org.name if org else None,
        "organisation_slug": org.slug if org else None,
        "organisation_type": org.legal_type if org else None,
        "country": org.country if org else None,
        "currency": org.currency if org else None,
        "last_login": current_user.last_login,
    }
