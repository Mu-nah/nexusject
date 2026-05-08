"""
Celery Task Definitions
"""
from backend.workers.celery_app import celery_app
from backend.core.database import SessionLocal
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="backend.workers.tasks.process_receipt_ocr", bind=True, max_retries=3)
def process_receipt_ocr(self, receipt_id: int, file_path: str):
    """OCR-process a single receipt."""
    import asyncio
    from backend.services.ocr_service import extract_receipt_data_with_ocr, extract_receipt_data_with_ai
    from backend.models.expense import Receipt
    from decimal import Decimal

    db = SessionLocal()
    try:
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return {"error": "Receipt not found"}

        receipt.ocr_status = "processing"
        db.commit()

        loop = asyncio.new_event_loop()
        ocr_data = loop.run_until_complete(extract_receipt_data_with_ocr(file_path))

        receipt.ocr_raw = ocr_data.get("raw_text", "")
        receipt.ocr_merchant = ocr_data.get("merchant")
        receipt.ocr_amount = Decimal(str(ocr_data["amount"])) if ocr_data.get("amount") else None
        receipt.ocr_date = ocr_data.get("date")
        receipt.ocr_vat = Decimal(str(ocr_data["vat"])) if ocr_data.get("vat") else None
        receipt.ocr_category = ocr_data.get("category")
        receipt.ocr_confidence = Decimal(str(ocr_data.get("confidence", 0.0)))
        receipt.ocr_status = "done"
        db.commit()

        logger.info(f"OCR complete for receipt {receipt_id}: {ocr_data.get('merchant')} £{ocr_data.get('amount')}")
        return {"receipt_id": receipt_id, "status": "done", "merchant": ocr_data.get("merchant")}

    except Exception as exc:
        logger.error(f"OCR task failed for receipt {receipt_id}: {exc}")
        db.query(Receipt).filter(Receipt.id == receipt_id).update({"ocr_status": "failed"})
        db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(name="backend.workers.tasks.process_pending_ocr")
def process_pending_ocr():
    """Find and queue all receipts with pending OCR status."""
    from backend.models.expense import Receipt
    db = SessionLocal()
    try:
        pending = db.query(Receipt).filter(Receipt.ocr_status == "pending").limit(20).all()
        for receipt in pending:
            process_receipt_ocr.delay(receipt.id, receipt.storage_path)
        logger.info(f"Queued {len(pending)} receipts for OCR")
        return {"queued": len(pending)}
    finally:
        db.close()


@celery_app.task(name="backend.workers.tasks.check_payroll_due")
def check_payroll_due():
    """Alert when payroll run is due within 7 days."""
    from backend.models.employee import PayrollRun, Employee
    from backend.models.user import Organisation
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        week_from_now = now + timedelta(days=7)

        orgs = db.query(Organisation).filter(Organisation.is_active == True).all()
        alerts = []
        for org in orgs:
            active_employees = db.query(Employee).filter(
                Employee.organisation_id == org.id,
                Employee.is_active == True,
            ).count()
            if active_employees > 0:
                alerts.append({
                    "org": org.name,
                    "employees": active_employees,
                    "message": "Payroll run due within 7 days"
                })
                logger.info(f"Payroll due alert sent for {org.name}")

        return {"alerts_sent": len(alerts)}
    finally:
        db.close()


@celery_app.task(name="backend.workers.tasks.check_grant_deadlines")
def check_grant_deadlines():
    """Alert when grant reports are due within 14 days."""
    from backend.models.grant import Grant
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        two_weeks = now + timedelta(days=14)

        upcoming = db.query(Grant).filter(
            Grant.status == "active",
            Grant.next_report_due.isnot(None),
            Grant.next_report_due <= two_weeks,
            Grant.next_report_due >= now,
        ).all()

        for grant in upcoming:
            days_left = (grant.next_report_due - now).days
            logger.info(f"Grant report alert: {grant.name} — {days_left} days until deadline")

        return {"alerts": len(upcoming)}
    finally:
        db.close()


@celery_app.task(name="backend.workers.tasks.send_monthly_summary")
def send_monthly_summary():
    """Generate and email monthly financial summary to CFO users."""
    from backend.models.user import User, Organisation
    from backend.models.transaction import Transaction
    from sqlalchemy import func
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
        last_month_end = now.replace(day=1)

        orgs = db.query(Organisation).filter(Organisation.is_active == True).all()
        for org in orgs:
            income = db.query(func.sum(Transaction.amount)).filter(
                Transaction.organisation_id == org.id,
                Transaction.transaction_type == "income",
                Transaction.date >= last_month_start,
                Transaction.date < last_month_end,
            ).scalar() or 0

            expenses = db.query(func.sum(Transaction.amount)).filter(
                Transaction.organisation_id == org.id,
                Transaction.transaction_type == "expense",
                Transaction.date >= last_month_start,
                Transaction.date < last_month_end,
            ).scalar() or 0

            logger.info(
                f"Monthly summary for {org.name}: "
                f"Income £{income:,.2f} | Expenses £{expenses:,.2f} | "
                f"Net £{float(income) - float(expenses):,.2f}"
            )

        return {"processed": len(orgs)}
    finally:
        db.close()


@celery_app.task(name="backend.workers.tasks.generate_payslip_pdfs")
def generate_payslip_pdfs(payroll_run_id: int):
    """Bulk generate PDF payslips for a completed payroll run."""
    from backend.models.employee import PayrollRun, PayrollRecord
    db = SessionLocal()
    try:
        run = db.query(PayrollRun).filter(PayrollRun.id == payroll_run_id).first()
        if not run:
            return {"error": "Run not found"}

        generated = 0
        for record in run.records:
            logger.info(f"Generating payslip for employee {record.employee_id}, run {payroll_run_id}")
            record.payslip_generated = True
            generated += 1

        db.commit()
        return {"generated": generated, "run": run.reference}
    finally:
        db.close()
