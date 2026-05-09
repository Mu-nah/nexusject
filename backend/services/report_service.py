from __future__ import annotations

import secrets
from io import BytesIO
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from backend.models.report import ReportDocument


def _slugify_filename(title: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in title)
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "report"


def save_workspace_report(
    db: Session,
    *,
    organisation_id: int,
    created_by: int,
    title: str,
    report_type: str,
    period_label: str | None,
    narrative: str,
    ai_generated: bool = True,
) -> ReportDocument:
    report = ReportDocument(
        organisation_id=organisation_id,
        created_by=created_by,
        title=title,
        report_type=report_type,
        period_label=period_label,
        narrative=narrative,
        ai_generated=ai_generated,
        share_token=secrets.token_urlsafe(18),
        share_access_mode="anyone_with_link",
        allowed_email=None,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def serialize_report(report: ReportDocument) -> dict:
    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "period_label": report.period_label,
        "narrative": report.narrative,
        "ai_generated": report.ai_generated,
        "share_token": report.share_token,
        "share_access_mode": getattr(report, "share_access_mode", "anyone_with_link"),
        "allowed_email": getattr(report, "allowed_email", None),
        "created_at": report.created_at.isoformat(),
        "updated_at": report.updated_at.isoformat(),
    }


def serialize_report_summary(report: ReportDocument) -> dict:
    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "period_label": report.period_label,
        "ai_generated": report.ai_generated,
        "share_token": report.share_token,
        "share_access_mode": getattr(report, "share_access_mode", "anyone_with_link"),
        "allowed_email": getattr(report, "allowed_email", None),
        "created_at": report.created_at.isoformat(),
        "updated_at": report.updated_at.isoformat(),
    }


def _build_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=14,
            alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "ReportH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        "h3": ParagraphStyle(
            "ReportH3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1F2937"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=8,
        ),
        "meta": ParagraphStyle(
            "ReportMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#475569"),
            spaceAfter=6,
        ),
        "quote": ParagraphStyle(
            "ReportQuote",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#92400E"),
            leftIndent=10,
            borderPadding=0,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "ReportBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#1F2937"),
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=5,
        ),
    }


def _escape_paragraph(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("**", "")
    )


def _parse_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.split("|")[1:-1]]


def _is_divider_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and set(stripped.replace("|", "").replace(":", "").replace("-", "").replace(" ", "")) == set()


def _parse_meta_segments(line: str) -> list[tuple[str, str]]:
    import re

    markdown_matches = list(re.finditer(r"\*\*([^*]+?):\*\*\s*([^*]+?)(?=\s+\*\*[^*]+?:\*\*|$)", line))
    if len(markdown_matches) >= 2:
        return [(match.group(1).strip(), match.group(2).strip()) for match in markdown_matches]

    plain_matches = list(re.finditer(r"([A-Za-z][A-Za-z /&()\-]+?):\s*([^:]+?)(?=\s+[A-Za-z][A-Za-z /&()\-]+?:|$)", line))
    if len(plain_matches) >= 2:
        return [(match.group(1).strip(), match.group(2).strip()) for match in plain_matches]

    return []


def build_report_pdf_bytes(title: str, narrative: str) -> bytes:
    styles = _build_styles()
    story = []

    story.append(Paragraph(_escape_paragraph(title), styles["title"]))
    story.append(Spacer(1, 0.15 * cm))

    lines = narrative.replace("\r\n", "\n").split("\n")
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        if line == "---":
            story.append(Spacer(1, 0.15 * cm))
            i += 1
            continue

        if line.startswith("# "):
            story.append(Paragraph(_escape_paragraph(line[2:]), styles["title"]))
            i += 1
            continue

        if line.startswith("## "):
            story.append(Paragraph(_escape_paragraph(line[3:]), styles["h2"]))
            i += 1
            continue

        if line.startswith("### "):
            story.append(Paragraph(_escape_paragraph(line[4:]), styles["h3"]))
            i += 1
            continue

        meta_segments = _parse_meta_segments(line)
        if len(meta_segments) >= 2:
            rows = []
            for label, value in meta_segments:
                rows.append(
                    [
                        Paragraph(f"<b>{_escape_paragraph(label)}</b>", styles["meta"]),
                        Paragraph(_escape_paragraph(value), styles["body"]),
                    ]
                )

            meta_table = Table(rows, colWidths=[4.1 * cm, 10.8 * cm])
            meta_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                        ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            story.append(meta_table)
            story.append(Spacer(1, 0.18 * cm))
            i += 1
            continue

        if line.startswith("|"):
            table_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1

            rows = [
                _parse_table_row(table_line)
                for index, table_line in enumerate(table_lines)
                if not (index == 1 and _is_divider_row(table_line))
            ]

            if rows:
                table = Table(rows, repeatRows=1)
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                            ("LEADING", (0, 0), (-1, -1), 11),
                            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ]
                    )
                )
                story.append(table)
                story.append(Spacer(1, 0.2 * cm))
            continue

        if line.startswith(">"):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip().removeprefix(">").strip())
                i += 1
            story.append(Paragraph(_escape_paragraph(" ".join(quote_lines)), styles["quote"]))
            continue

        if line.startswith("- "):
            bullet_lines = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                bullet_lines.append(lines[i].strip()[2:])
                i += 1
            for bullet in bullet_lines:
                story.append(Paragraph(f"• {_escape_paragraph(bullet)}", styles["bullet"]))
            continue

        paragraph_lines = []
        while i < len(lines):
            current = lines[i].strip()
            if not current or current == "---" or current.startswith("#") or current.startswith("|") or current.startswith(">") or current.startswith("- "):
                break
            paragraph_lines.append(current)
            i += 1
        story.append(Paragraph(_escape_paragraph(" ".join(paragraph_lines)), styles["body"]))

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.7 * cm,
        bottomMargin=1.5 * cm,
        title=title,
    )
    doc.build(story)
    return buffer.getvalue()
