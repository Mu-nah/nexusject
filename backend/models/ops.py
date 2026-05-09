from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from backend.core.database import Base


class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    programme = Column(String(255), nullable=False, default="Community")
    hours = Column(String(50), nullable=False)
    dbs = Column(String(50), nullable=False, default="Pending")
    status = Column(String(50), nullable=False, default="Onboarding")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VolunteerHour(Base):
    __tablename__ = "volunteer_hours"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    volunteer_name = Column(String(255), nullable=False)
    week = Column(String(100), nullable=False)
    logged = Column(String(50), nullable=False)
    approved = Column(String(50), nullable=False, default="-")
    value = Column(String(50), nullable=False, default="GBP 0.00")
    status = Column(String(50), nullable=False, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VolunteerAgreement(Base):
    __tablename__ = "volunteer_agreements"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    issued = Column(String(100), nullable=False)
    signed = Column(String(100), nullable=False)
    expires = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Trustee(Base):
    __tablename__ = "trustees"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    appointed = Column(String(100), nullable=False)
    status = Column(String(100), nullable=False, default="Pending induction")
    coi = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UkviWorker(Base):
    __tablename__ = "ukvi_workers"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    cos = Column(String(100), nullable=False)
    start_date = Column(String(100), nullable=False)
    visa_expiry = Column(String(100), nullable=False)
    rtw = Column(String(50), nullable=False, default="Due Soon")
    status = Column(String(50), nullable=False, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UkviCosRecord(Base):
    __tablename__ = "ukvi_cos_records"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    cos_ref = Column(String(100), nullable=False)
    worker = Column(String(255), nullable=False, default="Unassigned")
    type = Column(String(50), nullable=False, default="Undefined")
    issued = Column(String(100), nullable=False, default="-")
    status = Column(String(50), nullable=False, default="Available")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UkviDuty(Base):
    __tablename__ = "ukvi_duties"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    duty = Column(String(255), nullable=False)
    trigger = Column(String(255), nullable=False)
    deadline = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    latest_note = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
