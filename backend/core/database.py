from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
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
    )
    Base.metadata.create_all(bind=engine)
    _ensure_runtime_columns()
    logger.info("Database tables created successfully.")


def _ensure_runtime_columns():
    inspector = inspect(engine)
    try:
        if "organisations" in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns("organisations")}
            statements = []
            if "country" not in existing:
                statements.append("ALTER TABLE organisations ADD COLUMN country VARCHAR(100)")

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
    except Exception as exc:
        logger.warning(f"Runtime schema check skipped: {exc}")
