from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
import io

from backend.core.database import get_db
from backend.core.security import get_current_user, require_finance, require_cfo
from backend.models.employee import Employee, PayrollRun, PayrollRecord, PensionScheme
from backend.models.user import User
from backend.services.payroll_calculator import calculate_payslip

router = APIRouter(prefix="/payroll", tags=["Payroll"])


class EmployeeCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    role_title: Optional[str] = None
    national_insurance: Optional[str] = None
    tax_code: str = "1257L"
    contract_type: str = "full_time"
    start_date: Optional[datetime] = None
    gross_salary: float
    salary_frequency: str = "monthly"
    pension_enrolled: bool = True
    pension_employee_rate: float = 5.0
    pension_employer_rate: float = 3.0
    grant_funded: bool = False
    grant_id: Optional[int] = None
    programme_id: Optional[int] = None


class PayrollRunCreate(BaseModel):
    period_start: datetime
    period_end: datetime
    pay_date: datetime
    tax_period: Optional[int] = None
    tax_year: str = "2024-25"
    notes: Optional[str] = None


# ── Employees ─────────────────────────────────────────────────────────────────

@router.post("/employees", status_code=201)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    count = db.query(Employee).filter(
        Employee.organisation_id == current_user.organisation_id
    ).count()
    emp = Employee(
        organisation_id=current_user.organisation_id,
        employee_number=f"EMP-{str(count + 1).zfill(4)}",
        **data.model_dump()
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return {"id": emp.id, "employee_number": emp.employee_number, "full_name": emp.full_name}


@router.get("/employees")
async def list_employees(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Employee).filter(Employee.organisation_id == current_user.organisation_id)
    if active_only:
        q = q.filter(Employee.is_active == True)
    employees = q.order_by(Employee.full_name).all()

    results = []
    for emp in employees:
        calc = calculate_payslip(
            employee_name=emp.full_name,
            gross_monthly=float(emp.gross_salary),
            tax_code=emp.tax_code or "1257L",
            pension_employee_rate=float(emp.pension_employee_rate or 5.0),
            pension_employer_rate=float(emp.pension_employer_rate or 3.0),
        )
        results.append({
            "id": emp.id,
            "employee_number": emp.employee_number,
            "full_name": emp.full_name,
            "email": emp.email,
            "role_title": emp.role_title,
            "contract_type": emp.contract_type,
            "gross_salary": float(emp.gross_salary),
            "tax_code": emp.tax_code,
            "national_insurance": emp.national_insurance,
            "pension_enrolled": emp.pension_enrolled,
            "is_active": emp.is_active,
            "grant_funded": emp.grant_funded,
            "grant_id": emp.grant_id,
            "calculated": {
                "paye": float(calc.paye_tax),
                "employee_ni": float(calc.employee_ni),
                "employer_ni": float(calc.employer_ni),
                "employee_pension": float(calc.employee_pension),
                "employer_pension": float(calc.employer_pension),
                "net_pay": float(calc.net_pay),
                "employer_total_cost": float(calc.employer_total_cost),
            }
        })
    return results


@router.get("/employees/{employee_id}")
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.organisation_id == current_user.organisation_id
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


# ── Payroll Runs ──────────────────────────────────────────────────────────────

@router.post("/run", status_code=201)
async def run_payroll(
    data: PayrollRunCreate,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    """Execute a payroll run for all active employees."""
    employees = db.query(Employee).filter(
        Employee.organisation_id == current_user.organisation_id,
        Employee.is_active == True,
    ).all()

    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found")

    month_str = data.period_start.strftime("%Y-%m")
    reference = f"PAY-{month_str}"

    existing = db.query(PayrollRun).filter(PayrollRun.reference == reference).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Payroll run {reference} already exists")

    run = PayrollRun(
        organisation_id=current_user.organisation_id,
        reference=reference,
        period_start=data.period_start,
        period_end=data.period_end,
        pay_date=data.pay_date,
        tax_period=data.tax_period,
        tax_year=data.tax_year,
        status="draft",
        notes=data.notes,
        run_by=current_user.id,
    )
    db.add(run)
    db.flush()

    totals = {k: Decimal("0") for k in [
        "gross", "paye", "emp_ni", "er_ni", "emp_pension", "er_pension", "net", "er_cost"
    ]}

    for emp in employees:
        calc = calculate_payslip(
            employee_name=emp.full_name,
            gross_monthly=float(emp.gross_salary),
            tax_code=emp.tax_code or "1257L",
            pension_employee_rate=float(emp.pension_employee_rate or 5.0),
            pension_employer_rate=float(emp.pension_employer_rate or 3.0),
        )
        record = PayrollRecord(
            payroll_run_id=run.id,
            employee_id=emp.id,
            gross_pay=calc.gross_pay,
            basic_pay=calc.basic_pay,
            overtime_pay=calc.overtime_pay,
            paye_tax=calc.paye_tax,
            employee_ni=calc.employee_ni,
            employer_ni=calc.employer_ni,
            employee_pension=calc.employee_pension,
            employer_pension=calc.employer_pension,
            net_pay=calc.net_pay,
            employer_total_cost=calc.employer_total_cost,
            tax_code_used=calc.tax_code,
        )
        db.add(record)
        totals["gross"] += calc.gross_pay
        totals["paye"] += calc.paye_tax
        totals["emp_ni"] += calc.employee_ni
        totals["er_ni"] += calc.employer_ni
        totals["emp_pension"] += calc.employee_pension
        totals["er_pension"] += calc.employer_pension
        totals["net"] += calc.net_pay
        totals["er_cost"] += calc.employer_total_cost

    run.total_gross = totals["gross"]
    run.total_paye = totals["paye"]
    run.total_employee_ni = totals["emp_ni"]
    run.total_employer_ni = totals["er_ni"]
    run.total_employee_pension = totals["emp_pension"]
    run.total_employer_pension = totals["er_pension"]
    run.total_net = totals["net"]
    run.total_employer_cost = totals["er_cost"]
    run.status = "approved"
    db.commit()
    db.refresh(run)

    return {
        "id": run.id,
        "reference": run.reference,
        "employee_count": len(employees),
        "total_gross": float(run.total_gross),
        "total_net": float(run.total_net),
        "total_employer_cost": float(run.total_employer_cost),
        "status": run.status,
    }


@router.get("/runs")
async def list_payroll_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = db.query(PayrollRun).filter(
        PayrollRun.organisation_id == current_user.organisation_id
    ).order_by(desc(PayrollRun.pay_date)).limit(24).all()
    return [
        {
            "id": r.id,
            "reference": r.reference,
            "period": f"{r.period_start.strftime('%b %Y')}",
            "pay_date": r.pay_date.isoformat(),
            "total_gross": float(r.total_gross),
            "total_net": float(r.total_net),
            "total_employer_cost": float(r.total_employer_cost),
            "status": r.status,
            "rti_submitted": r.rti_submitted,
        }
        for r in runs
    ]


@router.get("/runs/{run_id}")
async def get_payroll_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return {
        "id": run.id,
        "reference": run.reference,
        "period_start": run.period_start.isoformat(),
        "period_end": run.period_end.isoformat(),
        "pay_date": run.pay_date.isoformat(),
        "tax_year": run.tax_year,
        "totals": {
            "gross": float(run.total_gross),
            "paye": float(run.total_paye),
            "employee_ni": float(run.total_employee_ni),
            "employer_ni": float(run.total_employer_ni),
            "employee_pension": float(run.total_employee_pension),
            "employer_pension": float(run.total_employer_pension),
            "net": float(run.total_net),
            "employer_cost": float(run.total_employer_cost),
        },
        "status": run.status,
        "records": [
            {
                "employee_id": rec.employee_id,
                "employee_name": rec.employee.full_name if rec.employee else None,
                "gross_pay": float(rec.gross_pay),
                "paye_tax": float(rec.paye_tax),
                "employee_ni": float(rec.employee_ni),
                "employer_ni": float(rec.employer_ni),
                "employee_pension": float(rec.employee_pension),
                "net_pay": float(rec.net_pay),
                "employer_total_cost": float(rec.employer_total_cost),
            }
            for rec in run.records
        ],
    }


@router.get("/payslips/{employee_id}")
async def get_payslips(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(PayrollRecord).join(PayrollRun).filter(
        PayrollRecord.employee_id == employee_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).order_by(desc(PayrollRun.pay_date)).limit(24).all()

    return [
        {
            "payroll_run_id": r.payroll_run_id,
            "period": r.payroll_run.period_start.strftime("%B %Y") if r.payroll_run else None,
            "pay_date": r.payroll_run.pay_date.isoformat() if r.payroll_run else None,
            "gross_pay": float(r.gross_pay),
            "paye_tax": float(r.paye_tax),
            "employee_ni": float(r.employee_ni),
            "employee_pension": float(r.employee_pension),
            "net_pay": float(r.net_pay),
            "tax_code": r.tax_code_used,
        }
        for r in records
    ]


@router.get("/payslip/{employee_id}/{run_id}/pdf")
async def download_payslip_pdf(
    employee_id: int,
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return a payslip PDF using ReportLab."""
    record = db.query(PayrollRecord).filter(
        PayrollRecord.employee_id == employee_id,
        PayrollRecord.payroll_run_id == run_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payslip not found")

    emp = record.employee
    run = record.payroll_run

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from reportlab.lib.units import cm

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        title = Paragraph(f"<b>PAYSLIP — {run.period_start.strftime('%B %Y').upper()}</b>", styles["Title"])
        elements.append(title)
        elements.append(Spacer(1, 0.5*cm))

        info_data = [
            ["Organisation:", "Harvest Touch Youth & Skills Community Hub CIC"],
            ["Employee:", emp.full_name],
            ["NI Number:", emp.national_insurance or "—"],
            ["Tax Code:", record.tax_code_used or "1257L"],
            ["Pay Date:", run.pay_date.strftime("%d %B %Y")],
        ]
        info_table = Table(info_data, colWidths=[4*cm, 12*cm])
        info_table.setStyle(TableStyle([
            ("FONTSIZE", (0,0), (-1,-1), 10),
            ("TEXTCOLOR", (0,0), (0,-1), colors.grey),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.5*cm))

        pay_data = [
            ["Description", "Amount (£)"],
            ["Basic Pay", f"{float(record.basic_pay):,.2f}"],
            ["Gross Pay", f"{float(record.gross_pay):,.2f}"],
            ["", ""],
            ["PAYE Income Tax", f"({float(record.paye_tax):,.2f})"],
            ["Employee NI", f"({float(record.employee_ni):,.2f})"],
            ["Employee Pension", f"({float(record.employee_pension):,.2f})"],
            ["", ""],
            ["NET PAY", f"{float(record.net_pay):,.2f}"],
        ]
        pay_table = Table(pay_data, colWidths=[12*cm, 4*cm])
        pay_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTSIZE", (0,0), (-1,-1), 10),
            ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
            ("BACKGROUND", (0,-1), (-1,-1), colors.HexColor("#064e3b")),
            ("TEXTCOLOR", (0,-1), (-1,-1), colors.white),
            ("ALIGN", (1,0), (1,-1), "RIGHT"),
            ("LINEBELOW", (0,-2), (-1,-2), 0.5, colors.grey),
        ]))
        elements.append(pay_table)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=payslip-{emp.full_name.replace(' ','-')}-{run.period_start.strftime('%Y-%m')}.pdf"}
        )
    except ImportError:
        raise HTTPException(status_code=501, detail="PDF generation not available. Install reportlab.")


@router.get("/summary")
async def payroll_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    employee_count = db.query(func.count(Employee.id)).filter(
        Employee.organisation_id == org_id, Employee.is_active == True
    ).scalar() or 0
    last_run = db.query(PayrollRun).filter(
        PayrollRun.organisation_id == org_id
    ).order_by(desc(PayrollRun.pay_date)).first()

    return {
        "active_employees": employee_count,
        "last_run": {
            "reference": last_run.reference,
            "total_gross": float(last_run.total_gross),
            "total_net": float(last_run.total_net),
            "total_employer_cost": float(last_run.total_employer_cost),
            "status": last_run.status,
        } if last_run else None,
    }
