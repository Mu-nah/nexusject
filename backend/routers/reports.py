from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.report import ReportDocument
from backend.models.user import User
from backend.services.report_service import build_report_pdf_bytes, serialize_report

router = APIRouter(prefix="/reports", tags=["Reports"])


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
    return {
        "report_id": report.id,
        "share_token": report.share_token,
    }


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
