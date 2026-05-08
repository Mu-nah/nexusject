from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    reference = Column(String(50), unique=True, nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # income/expense
    category = Column(String(100), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    source = Column(String(50), nullable=True)  # manual, payroll, stripe, paypal, receipt
    source_ref = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")  # pending, cleared, voided
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
