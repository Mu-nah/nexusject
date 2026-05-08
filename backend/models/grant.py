from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Grant(Base):
    __tablename__ = "grants"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    reference = Column(String(50), nullable=False)  # NLCF-2024
    name = Column(String(255), nullable=False)
    funder = Column(String(255), nullable=False)
    amount_awarded = Column(Numeric(15, 2), nullable=False)
    amount_spent = Column(Numeric(15, 2), default=0)
    amount_remaining = Column(Numeric(15, 2), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reporting_frequency = Column(String(20), default="quarterly")  # monthly, quarterly, annual
    next_report_due = Column(DateTime, nullable=True)
    conditions = Column(Text, nullable=True)
    objectives = Column(JSON, nullable=True)
    status = Column(String(20), default="active")  # active, completed, suspended, pending
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="grants")
    allocations = relationship("GrantAllocation", back_populates="grant")
    spending = relationship("GrantSpending", back_populates="grant")
    reports = relationship("GrantReport", back_populates="grant")


class GrantAllocation(Base):
    __tablename__ = "grant_allocations"

    id = Column(Integer, primary_key=True, index=True)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=False)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    activity = Column(String(255), nullable=True)
    allocated_amount = Column(Numeric(15, 2), nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    grant = relationship("Grant", back_populates="allocations")


class GrantSpending(Base):
    __tablename__ = "grant_spending"

    id = Column(Integer, primary_key=True, index=True)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    grant = relationship("Grant", back_populates="spending")


class GrantReport(Base):
    __tablename__ = "grant_reports"

    id = Column(Integer, primary_key=True, index=True)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=False)
    report_period_start = Column(DateTime, nullable=False)
    report_period_end = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=True)
    submitted_date = Column(DateTime, nullable=True)
    narrative = Column(Text, nullable=True)
    financial_summary = Column(JSON, nullable=True)
    outcomes = Column(JSON, nullable=True)
    ai_generated = Column(Boolean, default=False)
    status = Column(String(20), default="draft")  # draft, submitted, accepted
    file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    grant = relationship("Grant", back_populates="reports")


class Programme(Base):
    __tablename__ = "programmes"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    lead_grant_id = Column(Integer, ForeignKey("grants.id"), nullable=True)
    total_budget = Column(Numeric(15, 2), default=0)
    spent = Column(Numeric(15, 2), default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    target_participants = Column(Integer, default=0)
    actual_participants = Column(Integer, default=0)
    volunteer_hours = Column(Numeric(10, 2), default=0)
    cost_per_beneficiary = Column(Numeric(15, 2), nullable=True)
    status = Column(String(20), default="active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="programmes")
    expenses = relationship("ProgrammeExpense", back_populates="programme")


class ProgrammeExpense(Base):
    __tablename__ = "programme_expenses"

    id = Column(Integer, primary_key=True, index=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=False)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    programme = relationship("Programme", back_populates="expenses")
