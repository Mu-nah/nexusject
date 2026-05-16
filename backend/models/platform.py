from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text

from backend.core.database import Base


class RegulatoryFramework(Base):
    __tablename__ = "regulatory_frameworks"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    jurisdiction = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, default=False)
    tax_rules = Column(JSON, nullable=True)
    payroll_rules = Column(JSON, nullable=True)
    leave_entitlements = Column(JSON, nullable=True)
    filing_deadlines = Column(JSON, nullable=True)
    pension_rules = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(32), nullable=False, index=True)
    hashed_key = Column(String(255), nullable=False)
    scopes = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    target_url = Column(String(500), nullable=False)
    events = Column(JSON, nullable=False)
    signing_secret = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_delivery_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmployeeNotification(Base):
    __tablename__ = "employee_notifications"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="general")
    read_at = Column(DateTime, nullable=True)
    action_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

