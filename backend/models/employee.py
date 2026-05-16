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
    bank_account_name = Column(String(255), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    payroll_country = Column(String(2), default="GB")
    tax_regime = Column(String(20), default="uk")
    tax_code_basis = Column(String(20), default="cumulative")
    ni_category = Column(String(5), default="A")
    director_ni = Column(Boolean, default=False)
    student_loan_plan = Column(String(20), nullable=True)
    postgraduate_loan = Column(Boolean, default=False)
    starter_declaration = Column(String(5), nullable=True)
    leaving_date = Column(DateTime, nullable=True)
    normal_hours_band = Column(String(20), nullable=True)
    pension_enrolled = Column(Boolean, default=True)
    pension_status = Column(String(20), default="enrolled")
    pension_employee_rate = Column(Numeric(5, 2), default=5.00)
    pension_employer_rate = Column(Numeric(5, 2), default=3.00)
    pension_postponement_date = Column(DateTime, nullable=True)
    pension_enrolment_date = Column(DateTime, nullable=True)
    pension_opt_out_date = Column(DateTime, nullable=True)
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
    total_student_loans = Column(Numeric(15, 2), default=0)
    total_postgraduate_loans = Column(Numeric(15, 2), default=0)
    total_statutory_pay = Column(Numeric(15, 2), default=0)
    total_net = Column(Numeric(15, 2), default=0)
    total_employer_cost = Column(Numeric(15, 2), default=0)
    total_recoverable_from_hmrc = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")  # draft, locked, submitted, paid
    calculation_version = Column(String(50), default="uk-2024-25-v2")
    payment_frequency = Column(String(20), default="monthly")
    week_53 = Column(Boolean, default=False)
    rti_submitted = Column(Boolean, default=False)
    rti_submission_date = Column(DateTime, nullable=True)
    fps_submission_id = Column(Integer, ForeignKey("rti_submissions.id"), nullable=True)
    eps_submission_id = Column(Integer, ForeignKey("rti_submissions.id"), nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    bacs_reference = Column(String(100), nullable=True)
    bacs_generated_at = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    run_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("PayrollRecord", back_populates="payroll_run")
    statutory_claims = relationship("StatutoryPayClaim", back_populates="payroll_run")


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
    postgraduate_loan = Column(Numeric(15, 2), default=0)
    other_deductions = Column(Numeric(15, 2), default=0)
    statutory_payment = Column(Numeric(15, 2), default=0)
    statutory_payment_type = Column(String(20), nullable=True)
    gross_for_ni = Column(Numeric(15, 2), default=0)
    gross_for_tax = Column(Numeric(15, 2), default=0)
    net_pay = Column(Numeric(15, 2), nullable=False)
    employer_total_cost = Column(Numeric(15, 2), nullable=False)
    tax_code_used = Column(String(20), nullable=True)
    ni_category = Column(String(5), default="A")
    tax_regime = Column(String(20), default="uk")
    pension_status = Column(String(20), nullable=True)
    pension_qualifying_earnings = Column(Numeric(15, 2), default=0)
    ae_assessment = Column(JSON, nullable=True)
    deductions_breakdown = Column(JSON, nullable=True)
    pay_breakdown = Column(JSON, nullable=True)
    rti_values = Column(JSON, nullable=True)
    ytd_gross = Column(Numeric(15, 2), default=0)
    ytd_tax = Column(Numeric(15, 2), default=0)
    ytd_ni = Column(Numeric(15, 2), default=0)
    ytd_student_loan = Column(Numeric(15, 2), default=0)
    ytd_postgraduate_loan = Column(Numeric(15, 2), default=0)
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


class StatutoryPayClaim(Base):
    __tablename__ = "statutory_pay_claims"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    payment_type = Column(String(20), nullable=False)  # SSP, SMP, SPP, SAP
    qualifying_period_start = Column(DateTime, nullable=True)
    qualifying_period_end = Column(DateTime, nullable=True)
    weekly_rate = Column(Numeric(15, 2), default=0)
    weeks_paid = Column(Numeric(8, 2), default=0)
    gross_amount = Column(Numeric(15, 2), default=0)
    recovery_rate = Column(Numeric(5, 2), default=0)
    recovery_amount = Column(Numeric(15, 2), default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    payroll_run = relationship("PayrollRun", back_populates="statutory_claims")


class RTISubmission(Base):
    __tablename__ = "rti_submissions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=True)
    submission_type = Column(String(10), nullable=False)  # FPS, EPS
    status = Column(String(20), default="draft")  # draft, queued, submitted, accepted, rejected
    tax_year = Column(String(10), nullable=True)
    tax_period = Column(Integer, nullable=True)
    hmrc_correlation_id = Column(String(255), nullable=True)
    payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PayrollAuditLog(Base):
    __tablename__ = "payroll_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    action = Column(String(100), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
