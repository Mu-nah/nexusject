from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.report import ReportDocument
from backend.models.user import Organisation, User
from backend.services.email_service import send_report_share_email
from backend.services.report_service import build_report_pdf_bytes, serialize_report, serialize_report_summary

router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportShareEmailRequest(BaseModel):
    email: EmailStr
    recipient_name: str = ""
    access_mode: str = "specific_email"


class ReportShareRequest(BaseModel):
    access_mode: str = "anyone_with_link"
    allowed_email: EmailStr | None = None


def _build_share_url(base_url: str, share_token: str, email: str | None = None) -> str:
    url = f"{base_url}/reports?shared={share_token}"
    if email:
        url += f"&email={email}"
    return url


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
    return [serialize_report_summary(report) for report in reports]


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


@router.delete("/{report_id}")
async def delete_report(
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

    db.delete(report)
    db.commit()
    return {"deleted": True, "report_id": report_id}


@router.get("/shared/{share_token}")
async def get_shared_report(
    share_token: str,
    email: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    report = (
        db.query(ReportDocument)
        .filter(
            ReportDocument.share_token == share_token,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Shared report not found")

    access_mode = getattr(report, "share_access_mode", "anyone_with_link")
    allowed_email = (getattr(report, "allowed_email", None) or "").strip().lower()

    if access_mode == "specific_email":
        provided_email = (email or "").strip().lower()
        if not provided_email:
            raise HTTPException(status_code=403, detail="email_required")
        if allowed_email and provided_email != allowed_email:
            raise HTTPException(status_code=403, detail="email_not_allowed")

    return serialize_report(report)


@router.post("/{report_id}/share")
async def get_share_link(
    report_id: int,
    data: ReportShareRequest,
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

    if data.access_mode not in {"anyone_with_link", "specific_email"}:
        raise HTTPException(status_code=400, detail="Invalid access mode")
    if data.access_mode == "specific_email" and not data.allowed_email:
        raise HTTPException(status_code=400, detail="Allowed email is required for restricted sharing")

    report.share_access_mode = data.access_mode
    report.allowed_email = data.allowed_email.lower() if data.allowed_email else None
    db.add(report)
    db.commit()
    db.refresh(report)

    base_url = request.headers.get("origin") or "http://localhost:3000"
    return {
        "report_id": report.id,
        "share_token": report.share_token,
        "share_access_mode": report.share_access_mode,
        "allowed_email": report.allowed_email,
        "share_url": _build_share_url(base_url, report.share_token, report.allowed_email if report.share_access_mode == "specific_email" else None),
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
    access_mode = data.access_mode if data.access_mode in {"anyone_with_link", "specific_email"} else "specific_email"
    report.share_access_mode = access_mode
    report.allowed_email = data.email.lower() if access_mode == "specific_email" else None
    db.add(report)
    db.commit()
    db.refresh(report)

    share_url = _build_share_url(base_url, report.share_token, report.allowed_email if report.share_access_mode == "specific_email" else None)
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
    return {"sent": sent, "share_url": share_url, "share_access_mode": report.share_access_mode, "allowed_email": report.allowed_email}


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
