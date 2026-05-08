from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.core.database import Base

class AccountType(str, enum.Enum):
    asset = "asset"
    liability = "liability"
    equity = "equity"
    income = "income"
    expense = "expense"

class TransactionType(str, enum.Enum):
    debit = "debit"
    credit = "credit"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    account_type = Column(String(20), nullable=False)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    balance = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="accounts")
    journal_lines = relationship("JournalLine", back_populates="account")
    children = relationship("Account", backref="parent", remote_side=[id])


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    reference = Column(String(50), unique=True, nullable=False)  # JE-2025-001
    description = Column(Text, nullable=False)
    date = Column(DateTime, nullable=False)
    total_debit = Column(Numeric(15, 2), default=0)
    total_credit = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")  # draft, posted, voided
    source = Column(String(50), nullable=True)  # manual, payroll, expense, donation
    source_id = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")


class JournalLine(Base):
    __tablename__ = "journal_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    description = Column(Text, nullable=True)
    debit = Column(Numeric(15, 2), default=0)
    credit = Column(Numeric(15, 2), default=0)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    bank_name = Column(String(100), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_number = Column(String(20), nullable=True)
    sort_code = Column(String(10), nullable=True)
    balance = Column(Numeric(15, 2), default=0)
    last_synced = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("BankTransaction", back_populates="bank_account")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # debit/credit
    reference = Column(String(100), nullable=True)
    is_reconciled = Column(Boolean, default=False)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bank_account = relationship("BankAccount", back_populates="transactions")
