from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=True)
    file_type = Column(String(20), nullable=True)  # jpg, png, pdf

    # OCR extracted data
    ocr_raw = Column(Text, nullable=True)
    ocr_merchant = Column(String(255), nullable=True)
    ocr_amount = Column(Numeric(15, 2), nullable=True)
    ocr_date = Column(DateTime, nullable=True)
    ocr_vat = Column(Numeric(15, 2), nullable=True)
    ocr_category = Column(String(100), nullable=True)
    ocr_confidence = Column(Numeric(5, 2), nullable=True)
    ocr_status = Column(String(20), default="pending")  # pending, processing, done, failed

    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    expense = relationship("Expense", back_populates="receipts")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    is_active = Column(Boolean, default=True)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    claimant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0)
    expense_date = Column(DateTime, nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    payment_method = Column(String(50), nullable=True)  # cash, card, bank_transfer
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected, paid
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    receipts = relationship("Receipt", back_populates="expense")
    approvals = relationship("ExpenseApproval", back_populates="expense")
    claimant = relationship("User", foreign_keys=[claimant_id])


class ExpenseApproval(Base):
    __tablename__ = "expense_approvals"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(20), nullable=False)  # approved, rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    expense = relationship("Expense", back_populates="approvals")
    approver = relationship("User", back_populates="expense_approvals")
