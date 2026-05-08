"""
Celery Workers — Realtouch Financial ERP
Handles: OCR processing, payroll calculations, AI reports, email notifications
"""
from celery import Celery
from celery.schedules import crontab
from backend.core.settings import settings
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "realtouch_erp",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "backend.workers.tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/London",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=300,
    task_time_limit=600,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Check for upcoming payroll runs daily at 9am
        "check-payroll-due": {
            "task": "backend.workers.tasks.check_payroll_due",
            "schedule": crontab(hour=9, minute=0),
        },
        # Check grant report deadlines daily at 8am
        "check-grant-deadlines": {
            "task": "backend.workers.tasks.check_grant_deadlines",
            "schedule": crontab(hour=8, minute=0),
        },
        # Process pending OCR receipts every 5 minutes
        "process-pending-ocr": {
            "task": "backend.workers.tasks.process_pending_ocr",
            "schedule": crontab(minute="*/5"),
        },
        # Monthly financial summary email (1st of month, 8am)
        "monthly-summary": {
            "task": "backend.workers.tasks.send_monthly_summary",
            "schedule": crontab(day_of_month=1, hour=8, minute=0),
        },
    }
)
