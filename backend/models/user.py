from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.core.database import Base

class UserRole(str, enum.Enum):
    cfo = "cfo"
    finance_manager = "finance_manager"
    programme_manager = "programme_manager"
    admin = "admin"
    viewer = "viewer"

class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    legal_type = Column(String(50), default="CIC")  # CIC, Charity, Ltd
    charity_number = Column(String(50), nullable=True)
    companies_house_number = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    currency = Column(String(3), default="GBP")
    fiscal_year_start = Column(String(5), default="04-06")  # MM-DD
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="organisation")
    accounts = relationship("Account", back_populates="organisation")
    grants = relationship("Grant", back_populates="organisation")
    employees = relationship("Employee", back_populates="organisation")
    programmes = relationship("Programme", back_populates="organisation")
    donors = relationship("Donor", back_populates="organisation")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.viewer, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="users")
    expense_approvals = relationship("ExpenseApproval", back_populates="approver")
