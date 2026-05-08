from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    employee_number = Column(String(20), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role_title = Column(String(100), nullable=True)
    national_insurance = Column(String(20), nullable=True)  # NI number
    tax_code = Column(String(20), default="1257L")
    contract_type = Column(String(20), default="full_time")  # full_time, part_time, casual, volunteer
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    gross_salary = Column(Numeric(15, 2), nullable=False)  # monthly gross
    salary_frequency = Column(String(20), default="monthly")
    payment_method = Column(String(20), default="bank_transfer")
    bank_account_number = Column(String(20), nullable=True)
    bank_sort_code = Column(String(10), nullable=True)
    pension_enrolled = Column(Boolean, default=True)
    pension_employee_rate = Column(Numeric(5, 2), default=5.00)
    pension_employer_rate = Column(Numeric(5, 2), default=3.00)
    is_active = Column(Boolean, default=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    grant_funded = Column(Boolean, default=False)
    grant_id = Column(Integer, ForeignKey("grants.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="employees")
    payroll_records = relationship("PayrollRecord", back_populates="employee")


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    reference = Column(String(50), unique=True, nullable=False)  # PAY-2025-03
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    pay_date = Column(DateTime, nullable=False)
    tax_period = Column(Integer, nullable=True)  # HMRC tax period (1-52)
    tax_year = Column(String(10), nullable=True)  # 2024-25
    total_gross = Column(Numeric(15, 2), default=0)
    total_paye = Column(Numeric(15, 2), default=0)
    total_employee_ni = Column(Numeric(15, 2), default=0)
    total_employer_ni = Column(Numeric(15, 2), default=0)
    total_employee_pension = Column(Numeric(15, 2), default=0)
    total_employer_pension = Column(Numeric(15, 2), default=0)
    total_net = Column(Numeric(15, 2), default=0)
    total_employer_cost = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")  # draft, approved, submitted, paid
    rti_submitted = Column(Boolean, default=False)
    rti_submission_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    run_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("PayrollRecord", back_populates="payroll_run")


class PayrollRecord(Base):
    __tablename__ = "payroll_records"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    gross_pay = Column(Numeric(15, 2), nullable=False)
    basic_pay = Column(Numeric(15, 2), nullable=False)
    overtime_pay = Column(Numeric(15, 2), default=0)
    paye_tax = Column(Numeric(15, 2), default=0)
    employee_ni = Column(Numeric(15, 2), default=0)
    employer_ni = Column(Numeric(15, 2), default=0)
    employee_pension = Column(Numeric(15, 2), default=0)
    employer_pension = Column(Numeric(15, 2), default=0)
    student_loan = Column(Numeric(15, 2), default=0)
    other_deductions = Column(Numeric(15, 2), default=0)
    net_pay = Column(Numeric(15, 2), nullable=False)
    employer_total_cost = Column(Numeric(15, 2), nullable=False)
    tax_code_used = Column(String(20), nullable=True)
    ni_category = Column(String(5), default="A")
    ytd_gross = Column(Numeric(15, 2), default=0)
    ytd_tax = Column(Numeric(15, 2), default=0)
    ytd_ni = Column(Numeric(15, 2), default=0)
    payslip_generated = Column(Boolean, default=False)
    payslip_url = Column(String(500), nullable=True)

    payroll_run = relationship("PayrollRun", back_populates="records")
    employee = relationship("Employee", back_populates="payroll_records")


class PensionScheme(Base):
    __tablename__ = "pension_schemes"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    provider = Column(String(100), nullable=False)  # NEST, The People's Pension, etc.
    scheme_reference = Column(String(50), nullable=True)
    employer_rate = Column(Numeric(5, 2), default=3.00)
    employee_rate = Column(Numeric(5, 2), default=5.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
