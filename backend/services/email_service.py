"""
Email Notification Service
Sends transactional emails for: payslips, expense approvals, grant alerts, compliance deadlines
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional
from datetime import datetime

from backend.core.settings import settings

logger = logging.getLogger(__name__)


def _build_html_email(subject: str, body_html: str, org_name: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'DM Sans', Arial, sans-serif; background: #0a0f1a; color: #e2e8f0; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 32px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 24px 32px; }}
    .header h1 {{ margin: 0; font-size: 20px; color: #fff; font-weight: 600; }}
    .header p {{ margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.8); }}
    .body {{ padding: 28px 32px; }}
    .body p {{ font-size: 14px; line-height: 1.7; color: #cbd5e1; margin: 0 0 16px; }}
    .stat-row {{ display: flex; justify-content: space-between; padding: 10px 16px; background: #1e293b; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }}
    .stat-label {{ color: #94a3b8; }}
    .stat-value {{ font-weight: 600; color: #f1f5f9; font-family: monospace; }}
    .stat-value.green {{ color: #34d399; }}
    .stat-value.red {{ color: #f87171; }}
    .stat-value.amber {{ color: #fbbf24; }}
    .btn {{ display: inline-block; padding: 10px 20px; background: #059669; color: #fff; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 16px; }}
    .footer {{ padding: 16px 32px; border-top: 1px solid #1e293b; font-size: 11px; color: #475569; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Realtouch Financial ERP</h1>
      <p>{org_name}</p>
    </div>
    <div class="body">
      {body_html}
    </div>
    <div class="footer">
      This email was sent automatically by Realtouch Financial ERP. Do not reply to this message.
      <br>© {datetime.now().year} Realtouch Global Ventures Ltd
    </div>
  </div>
</body>
</html>
"""


def send_email(
    to: str,
    subject: str,
    body_html: str,
    org_name: str = "Harvest Touch CIC",
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
) -> bool:
    """Send an HTML email. Returns True on success, False on failure."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — email not sent to %s", to)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Realtouch ERP <{settings.SMTP_USER}>"
        msg["To"] = to

        html_content = _build_html_email(subject, body_html, org_name)
        msg.attach(MIMEText(html_content, "html"))

        if attachment_bytes and attachment_filename:
            part = MIMEApplication(attachment_bytes, Name=attachment_filename)
            part["Content-Disposition"] = f'attachment; filename="{attachment_filename}"'
            msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())

        logger.info("Email sent to %s: %s", to, subject)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


def send_workspace_invite_email(
    to_email: str,
    invitee_name: str,
    inviter_name: str,
    org_name: str,
    invite_link: str,
    role: str,
):
    body = f"""
    <p>Dear {invitee_name},</p>
    <p>{inviter_name} has invited you to join the <strong>{org_name}</strong> workspace on Nexus One.</p>
    <div class="stat-row"><span class="stat-label">Workspace</span><span class="stat-value">{org_name}</span></div>
    <div class="stat-row"><span class="stat-label">Assigned Role</span><span class="stat-value">{role.replace('_', ' ').title()}</span></div>
    <p>Click the button below to create your password and activate your account.</p>
    <a href="{invite_link}" class="btn">Accept Workspace Invite</a>
    <p>If the button does not work, copy this link into your browser:</p>
    <p>{invite_link}</p>
    """
    return send_email(
        to=to_email,
        subject=f"Workspace Invite - {org_name}",
        body_html=body,
        org_name=org_name,
    )


def send_report_share_email(
    to_email: str,
    recipient_name: str,
    sender_name: str,
    org_name: str,
    report_title: str,
    share_link: str,
    pdf_bytes: bytes | None = None,
):
    body = f"""
    <p>Dear {recipient_name or 'Colleague'},</p>
    <p>{sender_name} shared the report <strong>{report_title}</strong> from the <strong>{org_name}</strong> workspace.</p>
    <p>You can open the report using the secure workspace link below:</p>
    <a href="{share_link}" class="btn">Open Shared Report</a>
    <p>Link: {share_link}</p>
    """
    filename = f"{report_title.lower().replace(' ', '-')}.pdf"
    return send_email(
        to=to_email,
        subject=f"Shared Report - {report_title}",
        body_html=body,
        org_name=org_name,
        attachment_bytes=pdf_bytes,
        attachment_filename=filename if pdf_bytes else None,
    )


# ── Templated emails ──────────────────────────────────────────────────────────

def send_payslip_email(
    employee_email: str,
    employee_name: str,
    period: str,
    gross_pay: float,
    net_pay: float,
    pdf_bytes: Optional[bytes] = None,
    org_name: str = "Harvest Touch CIC",
):
    body = f"""
    <p>Dear {employee_name},</p>
    <p>Please find your payslip for <strong>{period}</strong> below.</p>
    <div class="stat-row"><span class="stat-label">Gross Pay</span><span class="stat-value">£{gross_pay:,.2f}</span></div>
    <div class="stat-row"><span class="stat-label">Net Pay</span><span class="stat-value green">£{net_pay:,.2f}</span></div>
    <p>If you have any questions, please contact your finance team.</p>
    """
    return send_email(
        to=employee_email,
        subject=f"Your Payslip — {period}",
        body_html=body,
        org_name=org_name,
        attachment_bytes=pdf_bytes,
        attachment_filename=f"payslip-{period.replace(' ', '-').lower()}.pdf" if pdf_bytes else None,
    )


def send_expense_decision_email(
    claimant_email: str,
    claimant_name: str,
    description: str,
    amount: float,
    decision: str,
    notes: Optional[str] = None,
    org_name: str = "Harvest Touch CIC",
):
    colour = "green" if decision == "approved" else "red"
    body = f"""
    <p>Dear {claimant_name},</p>
    <p>Your expense claim has been <strong>{decision.upper()}</strong>.</p>
    <div class="stat-row"><span class="stat-label">Description</span><span class="stat-value">{description}</span></div>
    <div class="stat-row"><span class="stat-label">Amount</span><span class="stat-value">£{amount:,.2f}</span></div>
    <div class="stat-row"><span class="stat-label">Decision</span><span class="stat-value {colour}">{decision.capitalize()}</span></div>
    {f'<div class="stat-row"><span class="stat-label">Notes</span><span class="stat-value">{notes}</span></div>' if notes else ''}
    """
    return send_email(
        to=claimant_email,
        subject=f"Expense Claim {decision.capitalize()} — £{amount:,.2f}",
        body_html=body,
        org_name=org_name,
    )


def send_grant_deadline_alert(
    cfo_email: str,
    grant_name: str,
    funder: str,
    due_date: str,
    days_remaining: int,
    amount_remaining: float,
    org_name: str = "Harvest Touch CIC",
):
    urgency = "red" if days_remaining <= 7 else "amber"
    body = f"""
    <p>This is an automated reminder that the following grant report is due soon.</p>
    <div class="stat-row"><span class="stat-label">Grant</span><span class="stat-value">{grant_name}</span></div>
    <div class="stat-row"><span class="stat-label">Funder</span><span class="stat-value">{funder}</span></div>
    <div class="stat-row"><span class="stat-label">Report Due</span><span class="stat-value {urgency}">{due_date}</span></div>
    <div class="stat-row"><span class="stat-label">Days Remaining</span><span class="stat-value {urgency}">{days_remaining} days</span></div>
    <div class="stat-row"><span class="stat-label">Remaining Budget</span><span class="stat-value">£{amount_remaining:,.2f}</span></div>
    <a href="#" class="btn">Generate AI Report →</a>
    """
    return send_email(
        to=cfo_email,
        subject=f"⚠ Grant Report Due in {days_remaining} Days — {grant_name}",
        body_html=body,
        org_name=org_name,
    )


def send_payroll_run_summary(
    cfo_email: str,
    reference: str,
    period: str,
    employee_count: int,
    total_gross: float,
    total_net: float,
    total_employer_cost: float,
    org_name: str = "Harvest Touch CIC",
):
    body = f"""
    <p>The payroll run for <strong>{period}</strong> has been completed.</p>
    <div class="stat-row"><span class="stat-label">Reference</span><span class="stat-value">{reference}</span></div>
    <div class="stat-row"><span class="stat-label">Employees Paid</span><span class="stat-value">{employee_count}</span></div>
    <div class="stat-row"><span class="stat-label">Total Gross</span><span class="stat-value">£{total_gross:,.2f}</span></div>
    <div class="stat-row"><span class="stat-label">Total Net Pay</span><span class="stat-value green">£{total_net:,.2f}</span></div>
    <div class="stat-row"><span class="stat-label">Total Employer Cost</span><span class="stat-value amber">£{total_employer_cost:,.2f}</span></div>
    <p>Please submit the RTI filing to HMRC within 7 days of the pay date.</p>
    """
    return send_email(
        to=cfo_email,
        subject=f"Payroll Run Complete — {period} ({reference})",
        body_html=body,
        org_name=org_name,
    )


def send_donation_receipt(
    donor_email: str,
    donor_name: str,
    amount: float,
    gift_aid_amount: float,
    campaign: Optional[str],
    payment_ref: str,
    org_name: str = "Harvest Touch CIC",
):
    body = f"""
    <p>Dear {donor_name},</p>
    <p>Thank you for your generous donation to {org_name}. Your contribution makes a real difference to the young people and communities we serve.</p>
    <div class="stat-row"><span class="stat-label">Donation Amount</span><span class="stat-value green">£{amount:,.2f}</span></div>
    {f'<div class="stat-row"><span class="stat-label">Gift Aid Value</span><span class="stat-value">£{gift_aid_amount:,.2f}</span></div>' if gift_aid_amount > 0 else ''}
    {f'<div class="stat-row"><span class="stat-label">Campaign</span><span class="stat-value">{campaign}</span></div>' if campaign else ''}
    <div class="stat-row"><span class="stat-label">Reference</span><span class="stat-value">{payment_ref}</span></div>
    <p>This email serves as your donation receipt for tax purposes.</p>
    """
    return send_email(
        to=donor_email,
        subject=f"Thank you for your donation — £{amount:,.2f}",
        body_html=body,
        org_name=org_name,
    )
