from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .settings import settings
import logging

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency: yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()


def init_db():
    """Create all tables. Called on app startup."""
    from backend.models import (
        user,
        account,
        transaction,
        journal,
        expense,
        donor,
        employee,
        grant,
        report,
        invite,
        ops,
        platform,
    )

    Base.metadata.create_all(bind=engine)
    _ensure_runtime_columns()
    logger.info("Database tables created successfully.")


def _ensure_runtime_columns():
    inspector = inspect(engine)
    try:
        payroll_column_map = {
            "employees": {
                "bank_account_name": "ALTER TABLE employees ADD COLUMN bank_account_name VARCHAR(255)",
                "date_of_birth": "ALTER TABLE employees ADD COLUMN date_of_birth DATETIME",
                "payroll_country": "ALTER TABLE employees ADD COLUMN payroll_country VARCHAR(2) DEFAULT 'GB'",
                "tax_regime": "ALTER TABLE employees ADD COLUMN tax_regime VARCHAR(20) DEFAULT 'uk'",
                "tax_code_basis": "ALTER TABLE employees ADD COLUMN tax_code_basis VARCHAR(20) DEFAULT 'cumulative'",
                "ni_category": "ALTER TABLE employees ADD COLUMN ni_category VARCHAR(5) DEFAULT 'A'",
                "director_ni": "ALTER TABLE employees ADD COLUMN director_ni BOOLEAN DEFAULT 0",
                "student_loan_plan": "ALTER TABLE employees ADD COLUMN student_loan_plan VARCHAR(20)",
                "postgraduate_loan": "ALTER TABLE employees ADD COLUMN postgraduate_loan BOOLEAN DEFAULT 0",
                "starter_declaration": "ALTER TABLE employees ADD COLUMN starter_declaration VARCHAR(5)",
                "leaving_date": "ALTER TABLE employees ADD COLUMN leaving_date DATETIME",
                "normal_hours_band": "ALTER TABLE employees ADD COLUMN normal_hours_band VARCHAR(20)",
                "pension_status": "ALTER TABLE employees ADD COLUMN pension_status VARCHAR(20) DEFAULT 'enrolled'",
                "pension_postponement_date": "ALTER TABLE employees ADD COLUMN pension_postponement_date DATETIME",
                "pension_enrolment_date": "ALTER TABLE employees ADD COLUMN pension_enrolment_date DATETIME",
                "pension_opt_out_date": "ALTER TABLE employees ADD COLUMN pension_opt_out_date DATETIME",
            },
            "payroll_runs": {
                "total_student_loans": "ALTER TABLE payroll_runs ADD COLUMN total_student_loans NUMERIC(15, 2) DEFAULT 0",
                "total_postgraduate_loans": "ALTER TABLE payroll_runs ADD COLUMN total_postgraduate_loans NUMERIC(15, 2) DEFAULT 0",
                "total_statutory_pay": "ALTER TABLE payroll_runs ADD COLUMN total_statutory_pay NUMERIC(15, 2) DEFAULT 0",
                "total_recoverable_from_hmrc": "ALTER TABLE payroll_runs ADD COLUMN total_recoverable_from_hmrc NUMERIC(15, 2) DEFAULT 0",
                "calculation_version": "ALTER TABLE payroll_runs ADD COLUMN calculation_version VARCHAR(50) DEFAULT 'uk-2024-25-v2'",
                "payment_frequency": "ALTER TABLE payroll_runs ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'monthly'",
                "week_53": "ALTER TABLE payroll_runs ADD COLUMN week_53 BOOLEAN DEFAULT 0",
                "fps_submission_id": "ALTER TABLE payroll_runs ADD COLUMN fps_submission_id INTEGER",
                "eps_submission_id": "ALTER TABLE payroll_runs ADD COLUMN eps_submission_id INTEGER",
                "journal_entry_id": "ALTER TABLE payroll_runs ADD COLUMN journal_entry_id INTEGER",
                "bacs_reference": "ALTER TABLE payroll_runs ADD COLUMN bacs_reference VARCHAR(100)",
                "bacs_generated_at": "ALTER TABLE payroll_runs ADD COLUMN bacs_generated_at DATETIME",
                "locked_at": "ALTER TABLE payroll_runs ADD COLUMN locked_at DATETIME",
                "submitted_at": "ALTER TABLE payroll_runs ADD COLUMN submitted_at DATETIME",
                "paid_at": "ALTER TABLE payroll_runs ADD COLUMN paid_at DATETIME",
            },
            "payroll_records": {
                "postgraduate_loan": "ALTER TABLE payroll_records ADD COLUMN postgraduate_loan NUMERIC(15, 2) DEFAULT 0",
                "statutory_payment": "ALTER TABLE payroll_records ADD COLUMN statutory_payment NUMERIC(15, 2) DEFAULT 0",
                "statutory_payment_type": "ALTER TABLE payroll_records ADD COLUMN statutory_payment_type VARCHAR(20)",
                "gross_for_ni": "ALTER TABLE payroll_records ADD COLUMN gross_for_ni NUMERIC(15, 2) DEFAULT 0",
                "gross_for_tax": "ALTER TABLE payroll_records ADD COLUMN gross_for_tax NUMERIC(15, 2) DEFAULT 0",
                "tax_regime": "ALTER TABLE payroll_records ADD COLUMN tax_regime VARCHAR(20) DEFAULT 'uk'",
                "pension_status": "ALTER TABLE payroll_records ADD COLUMN pension_status VARCHAR(20)",
                "pension_qualifying_earnings": "ALTER TABLE payroll_records ADD COLUMN pension_qualifying_earnings NUMERIC(15, 2) DEFAULT 0",
                "ae_assessment": "ALTER TABLE payroll_records ADD COLUMN ae_assessment JSON",
                "deductions_breakdown": "ALTER TABLE payroll_records ADD COLUMN deductions_breakdown JSON",
                "pay_breakdown": "ALTER TABLE payroll_records ADD COLUMN pay_breakdown JSON",
                "rti_values": "ALTER TABLE payroll_records ADD COLUMN rti_values JSON",
                "ytd_student_loan": "ALTER TABLE payroll_records ADD COLUMN ytd_student_loan NUMERIC(15, 2) DEFAULT 0",
                "ytd_postgraduate_loan": "ALTER TABLE payroll_records ADD COLUMN ytd_postgraduate_loan NUMERIC(15, 2) DEFAULT 0",
            },
        }

        if "organisations" in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns("organisations")}
            statements = []
            if "country" not in existing:
                statements.append("ALTER TABLE organisations ADD COLUMN country VARCHAR(100)")
            if "countries_of_operation" not in existing:
                statements.append("ALTER TABLE organisations ADD COLUMN countries_of_operation VARCHAR(255) DEFAULT 'GB'")
            if "active_regulatory_framework" not in existing:
                statements.append("ALTER TABLE organisations ADD COLUMN active_regulatory_framework VARCHAR(50) DEFAULT 'UK'")

            for statement in statements:
                with engine.begin() as conn:
                    conn.execute(text(statement))

        if "users" in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns("users")}
            statements = []
            if "auth_provider" not in existing:
                statements.append("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'password'")
            if "google_subject" not in existing:
                statements.append("ALTER TABLE users ADD COLUMN google_subject VARCHAR(255)")
            if "module_access" not in existing:
                statements.append("ALTER TABLE users ADD COLUMN module_access VARCHAR(255) NOT NULL DEFAULT 'finance,operations,people_hr,compliance'")

            for statement in statements:
                with engine.begin() as conn:
                    conn.execute(text(statement))

        if "workspace_invites" in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns("workspace_invites")}
            statements = []
            if "module_access" not in existing:
                statements.append("ALTER TABLE workspace_invites ADD COLUMN module_access VARCHAR(255) NOT NULL DEFAULT 'finance,operations,people_hr,compliance'")

            for statement in statements:
                with engine.begin() as conn:
                    conn.execute(text(statement))

        if "report_documents" in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns("report_documents")}
            statements = []
            if "share_access_mode" not in existing:
                statements.append(
                    "ALTER TABLE report_documents ADD COLUMN share_access_mode VARCHAR(32) NOT NULL DEFAULT 'anyone_with_link'"
                )
            if "allowed_email" not in existing:
                statements.append("ALTER TABLE report_documents ADD COLUMN allowed_email VARCHAR(255)")

            for statement in statements:
                with engine.begin() as conn:
                    conn.execute(text(statement))

        for table_name, column_map in payroll_column_map.items():
            if table_name not in inspector.get_table_names():
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, statement in column_map.items():
                if column_name not in existing:
                    with engine.begin() as conn:
                        conn.execute(text(statement))
    except Exception as exc:
        logger.warning(f"Runtime schema check skipped: {exc}")
