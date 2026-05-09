from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from backend.core.database import Base


class ReportDocument(Base):
    __tablename__ = "report_documents"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False, index=True)
    period_label = Column(String(120), nullable=True)
    narrative = Column(Text, nullable=False)
    ai_generated = Column(Boolean, default=True)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    share_access_mode = Column(String(32), nullable=False, default="anyone_with_link")
    allowed_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
