from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.report import ReportDocument
from backend.models.user import Organisation, User
from backend.services.email_service import send_report_share_email
from backend.services.report_service import build_report_pdf_bytes, serialize_report

router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportShareEmailRequest(BaseModel):
    email: EmailStr
    recipient_name: str = ""


@router.get("")
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reports = (
        db.query(ReportDocument)
        .filter(ReportDocument.organisation_id == current_user.organisation_id)
        .order_by(ReportDocument.created_at.desc())
        .all()
    )
    return [serialize_report(report) for report in reports]


@router.get("/{report_id}")
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.id == report_id,
            ReportDocument.organisation_id == current_user.organisation_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialize_report(report)


@router.get("/shared/{share_token}")
async def get_shared_report(
    share_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.share_token == share_token,
            ReportDocument.organisation_id == current_user.organisation_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Shared report not found")
    return serialize_report(report)


@router.post("/{report_id}/share")
async def get_share_link(
    report_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.id == report_id,
            ReportDocument.organisation_id == current_user.organisation_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    base_url = request.headers.get("origin") or "http://localhost:3000"
    return {
        "report_id": report.id,
        "share_token": report.share_token,
        "share_url": f"{base_url}/reports?shared={report.share_token}",
    }


@router.post("/{report_id}/email-share")
async def email_share_report(
    report_id: int,
    data: ReportShareEmailRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.id == report_id,
            ReportDocument.organisation_id == current_user.organisation_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    organisation = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    base_url = request.headers.get("origin") or "http://localhost:3000"
    share_url = f"{base_url}/reports?shared={report.share_token}"
    pdf_bytes = build_report_pdf_bytes(report.title, report.narrative)
    sent = send_report_share_email(
        to_email=data.email,
        recipient_name=data.recipient_name,
        sender_name=current_user.full_name,
        org_name=organisation.name if organisation else "Workspace",
        report_title=report.title,
        share_link=share_url,
        pdf_bytes=pdf_bytes,
    )
    return {"sent": sent, "share_url": share_url}


@router.get("/{report_id}/pdf")
async def download_report_pdf(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.id == report_id,
            ReportDocument.organisation_id == current_user.organisation_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = build_report_pdf_bytes(report.title, report.narrative)
    filename = f"{report.title.lower().replace(' ', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
