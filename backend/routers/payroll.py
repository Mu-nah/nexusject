from datetime import date, datetime
from decimal import Decimal
import io
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user, require_cfo, require_finance
from backend.models.account import Account, JournalEntry, JournalLine
from backend.models.employee import (
    Employee,
    PayrollAuditLog,
    PayrollRecord,
    PayrollRun,
    PensionScheme,
    RTISubmission,
    StatutoryPayClaim,
)
from backend.models.user import Organisation, User
from backend.services.payroll_calculator import calculate_payslip
from backend.services.payroll_outputs import (
    build_bacs_standard_18,
    build_eps_payload,
    build_fps_payload,
    build_payroll_journal_lines,
)

router = APIRouter(prefix="/payroll", tags=["Payroll"])


class EmployeeCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    role_title: Optional[str] = None
    national_insurance: Optional[str] = None
    tax_code: str = "1257L"
    tax_regime: str = "uk"
    ni_category: str = "A"
    contract_type: str = "full_time"
    start_date: Optional[datetime] = None
    leaving_date: Optional[datetime] = None
    date_of_birth: Optional[datetime] = None
    gross_salary: float
    salary_frequency: str = "monthly"
    payment_method: str = "bank_transfer"
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_sort_code: Optional[str] = None
    director_ni: bool = False
    student_loan_plan: Optional[str] = None
    postgraduate_loan: bool = False
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
    payment_frequency: str = "monthly"
    week_53: bool = False
    notes: Optional[str] = None


class PayrollLifecycleNote(BaseModel):
    notes: Optional[str] = None


class StatutoryClaimCreate(BaseModel):
    employee_id: int
    payment_type: str
    qualifying_period_start: Optional[datetime] = None
    qualifying_period_end: Optional[datetime] = None
    weekly_rate: float
    weeks_paid: float
    recovery_rate: float = 0.0
    notes: Optional[str] = None


def _serialize_decimal_dict(values: dict) -> dict:
    serialized = {}
    for key, value in values.items():
        if isinstance(value, Decimal):
            serialized[key] = float(value)
        else:
            serialized[key] = value
    return serialized


def _log_payroll_action(
    db: Session,
    organisation_id: int,
    action: str,
    actor_user_id: Optional[int],
    payroll_run_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    details: Optional[dict] = None,
):
    db.add(
        PayrollAuditLog(
            organisation_id=organisation_id,
            payroll_run_id=payroll_run_id,
            employee_id=employee_id,
            action=action,
            actor_user_id=actor_user_id,
            details=details or {},
        )
    )


def _employee_calc(emp: Employee):
    return calculate_payslip(
        employee_name=emp.full_name,
        gross_monthly=float(emp.gross_salary),
        tax_code=emp.tax_code or "1257L",
        ni_category=emp.ni_category or "A",
        tax_regime=emp.tax_regime or "uk",
        pension_employee_rate=float(emp.pension_employee_rate or 5.0),
        pension_employer_rate=float(emp.pension_employer_rate or 3.0),
        pension_enrolled=bool(emp.pension_enrolled),
        student_loan_plan=emp.student_loan_plan,
        postgraduate_loan=bool(emp.postgraduate_loan),
        director_ni=bool(emp.director_ni),
        date_of_birth=emp.date_of_birth,
    )


def _upsert_run_totals(run: PayrollRun):
    totals = {
        "gross": Decimal("0.00"),
        "paye": Decimal("0.00"),
        "emp_ni": Decimal("0.00"),
        "er_ni": Decimal("0.00"),
        "emp_pension": Decimal("0.00"),
        "er_pension": Decimal("0.00"),
        "student_loans": Decimal("0.00"),
        "postgraduate_loans": Decimal("0.00"),
        "statutory": Decimal("0.00"),
        "recovery": Decimal("0.00"),
        "net": Decimal("0.00"),
        "er_cost": Decimal("0.00"),
    }
    for rec in run.records:
        totals["gross"] += Decimal(str(rec.gross_pay or 0))
        totals["paye"] += Decimal(str(rec.paye_tax or 0))
        totals["emp_ni"] += Decimal(str(rec.employee_ni or 0))
        totals["er_ni"] += Decimal(str(rec.employer_ni or 0))
        totals["emp_pension"] += Decimal(str(rec.employee_pension or 0))
        totals["er_pension"] += Decimal(str(rec.employer_pension or 0))
        totals["student_loans"] += Decimal(str(rec.student_loan or 0))
        totals["postgraduate_loans"] += Decimal(str(rec.postgraduate_loan or 0))
        totals["statutory"] += Decimal(str(rec.statutory_payment or 0))
        totals["net"] += Decimal(str(rec.net_pay or 0))
        totals["er_cost"] += Decimal(str(rec.employer_total_cost or 0))
    for claim in run.statutory_claims:
        totals["recovery"] += Decimal(str(claim.recovery_amount or 0))

    run.total_gross = totals["gross"]
    run.total_paye = totals["paye"]
    run.total_employee_ni = totals["emp_ni"]
    run.total_employer_ni = totals["er_ni"]
    run.total_employee_pension = totals["emp_pension"]
    run.total_employer_pension = totals["er_pension"]
    run.total_student_loans = totals["student_loans"]
    run.total_postgraduate_loans = totals["postgraduate_loans"]
    run.total_statutory_pay = totals["statutory"]
    run.total_recoverable_from_hmrc = totals["recovery"]
    run.total_net = totals["net"]
    run.total_employer_cost = totals["er_cost"]


def _serialize_record(rec: PayrollRecord) -> dict:
    return {
        "employee_id": rec.employee_id,
        "employee_name": rec.employee.full_name if rec.employee else None,
        "gross_pay": float(rec.gross_pay or 0),
        "paye_tax": float(rec.paye_tax or 0),
        "employee_ni": float(rec.employee_ni or 0),
        "employer_ni": float(rec.employer_ni or 0),
        "employee_pension": float(rec.employee_pension or 0),
        "employer_pension": float(rec.employer_pension or 0),
        "student_loan": float(rec.student_loan or 0),
        "postgraduate_loan": float(rec.postgraduate_loan or 0),
        "statutory_payment": float(rec.statutory_payment or 0),
        "net_pay": float(rec.net_pay or 0),
        "tax_code": rec.tax_code_used,
        "ni_category": rec.ni_category,
    }


@router.post("/employees", status_code=201)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    count = db.query(Employee).filter(Employee.organisation_id == current_user.organisation_id).count()
    emp = Employee(
        organisation_id=current_user.organisation_id,
        employee_number=f"EMP-{str(count + 1).zfill(4)}",
        **data.model_dump(),
    )
    db.add(emp)
    _log_payroll_action(
        db,
        current_user.organisation_id,
        "employee.created",
        current_user.id,
        employee_id=None,
        details={"employee_number": emp.employee_number, "full_name": emp.full_name},
    )
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

    _log_payroll_action(db, current_user.organisation_id, "employees.viewed", current_user.id)
    db.commit()

    results = []
    for emp in employees:
        calc = _employee_calc(emp)
        results.append(
            {
                "id": emp.id,
                "employee_number": emp.employee_number,
                "full_name": emp.full_name,
                "email": emp.email,
                "role_title": emp.role_title,
                "contract_type": emp.contract_type,
                "gross_salary": float(emp.gross_salary),
                "tax_code": emp.tax_code,
                "tax_regime": emp.tax_regime,
                "national_insurance": emp.national_insurance,
                "ni_category": emp.ni_category,
                "student_loan_plan": emp.student_loan_plan,
                "postgraduate_loan": emp.postgraduate_loan,
                "pension_enrolled": emp.pension_enrolled,
                "pension_status": emp.pension_status,
                "is_active": emp.is_active,
                "grant_funded": emp.grant_funded,
                "grant_id": emp.grant_id,
                "calculated": {
                    "paye": float(calc.paye_tax),
                    "employee_ni": float(calc.employee_ni),
                    "employer_ni": float(calc.employer_ni),
                    "employee_pension": float(calc.employee_pension),
                    "employer_pension": float(calc.employer_pension),
                    "student_loan": float(calc.student_loan),
                    "postgraduate_loan": float(calc.postgraduate_loan),
                    "net_pay": float(calc.net_pay),
                    "employer_total_cost": float(calc.employer_total_cost),
                    "ae_assessment": _serialize_decimal_dict(calc.pension_assessment),
                },
            }
        )
    return results


@router.get("/employees/{employee_id}")
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.organisation_id == current_user.organisation_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    _log_payroll_action(
        db,
        current_user.organisation_id,
        "employee.viewed",
        current_user.id,
        employee_id=employee_id,
    )
    db.commit()
    return emp


@router.post("/run", status_code=201)
async def run_payroll(
    data: PayrollRunCreate,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    employees = db.query(Employee).filter(
        Employee.organisation_id == current_user.organisation_id,
        Employee.is_active == True,
    ).all()
    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found")

    month_str = data.period_start.strftime("%Y-%m")
    reference = f"PAY-{month_str}"
    existing = db.query(PayrollRun).filter(
        PayrollRun.organisation_id == current_user.organisation_id,
        PayrollRun.reference == reference,
    ).first()
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
        payment_frequency=data.payment_frequency,
        week_53=data.week_53,
        status="draft",
        notes=data.notes,
        run_by=current_user.id,
    )
    db.add(run)
    db.flush()

    for emp in employees:
        calc = _employee_calc(emp)
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
            student_loan=calc.student_loan,
            postgraduate_loan=calc.postgraduate_loan,
            statutory_payment=calc.statutory_payment,
            gross_for_ni=calc.pay_breakdown["gross_for_ni"],
            gross_for_tax=calc.pay_breakdown["gross_for_tax"],
            other_deductions=calc.other_deductions,
            net_pay=calc.net_pay,
            employer_total_cost=calc.employer_total_cost,
            tax_code_used=calc.tax_code,
            ni_category=calc.ni_category,
            tax_regime=calc.tax_regime,
            pension_status=calc.pension_assessment.get("member_status"),
            pension_qualifying_earnings=calc.pension_assessment.get("qualifying_earnings_monthly", Decimal("0.00")),
            ae_assessment=_serialize_decimal_dict(calc.pension_assessment),
            deductions_breakdown=_serialize_decimal_dict(calc.deductions_breakdown),
            pay_breakdown=_serialize_decimal_dict(calc.pay_breakdown),
            rti_values=_serialize_decimal_dict(calc.rti_values),
            ytd_gross=calc.gross_pay,
            ytd_tax=calc.paye_tax,
            ytd_ni=calc.employee_ni,
            ytd_student_loan=calc.student_loan,
            ytd_postgraduate_loan=calc.postgraduate_loan,
        )
        db.add(record)

    db.flush()
    db.refresh(run)
    _upsert_run_totals(run)
    _log_payroll_action(
        db,
        current_user.organisation_id,
        "payroll_run.created",
        current_user.id,
        payroll_run_id=run.id,
        details={"reference": run.reference, "employees": len(employees)},
    )
    db.commit()
    db.refresh(run)

    return {
        "id": run.id,
        "reference": run.reference,
        "employee_count": len(employees),
        "total_gross": float(run.total_gross or 0),
        "total_net": float(run.total_net or 0),
        "total_employer_cost": float(run.total_employer_cost or 0),
        "status": run.status,
    }


@router.post("/runs/{run_id}/claims", status_code=201)
async def add_statutory_claim(
    run_id: int,
    data: StatutoryClaimCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if run.status != "draft":
        raise HTTPException(status_code=400, detail="Claims can only be added to draft payroll runs")

    gross_amount = Decimal(str(data.weekly_rate)) * Decimal(str(data.weeks_paid))
    recovery_amount = gross_amount * (Decimal(str(data.recovery_rate)) / Decimal("100"))

    claim = StatutoryPayClaim(
        organisation_id=current_user.organisation_id,
        payroll_run_id=run.id,
        employee_id=data.employee_id,
        payment_type=data.payment_type.upper(),
        qualifying_period_start=data.qualifying_period_start,
        qualifying_period_end=data.qualifying_period_end,
        weekly_rate=Decimal(str(data.weekly_rate)),
        weeks_paid=Decimal(str(data.weeks_paid)),
        gross_amount=gross_amount,
        recovery_rate=Decimal(str(data.recovery_rate)),
        recovery_amount=recovery_amount,
        notes=data.notes,
    )
    db.add(claim)
    db.flush()
    db.refresh(run)
    _upsert_run_totals(run)
    _log_payroll_action(
        db,
        current_user.organisation_id,
        "statutory_claim.created",
        current_user.id,
        payroll_run_id=run.id,
        employee_id=data.employee_id,
        details={"type": data.payment_type},
    )
    db.commit()
    return {"id": claim.id, "gross_amount": float(claim.gross_amount), "recovery_amount": float(claim.recovery_amount)}


@router.post("/runs/{run_id}/lock")
async def lock_payroll_run(
    run_id: int,
    payload: PayrollLifecycleNote,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if run.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft payroll runs can be locked")
    run.status = "locked"
    run.locked_at = datetime.utcnow()
    if payload.notes:
        run.notes = f"{run.notes or ''}\n{payload.notes}".strip()
    _log_payroll_action(db, current_user.organisation_id, "payroll_run.locked", current_user.id, payroll_run_id=run.id)
    db.commit()
    return {"id": run.id, "reference": run.reference, "status": run.status}


@router.post("/runs/{run_id}/post-journal")
async def post_payroll_journal(
    run_id: int,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if run.status not in {"locked", "submitted", "paid"}:
        raise HTTPException(status_code=400, detail="Lock payroll before posting journals")
    if run.journal_entry_id:
        return {"journal_entry_id": run.journal_entry_id, "reference": run.reference}

    accounts = db.query(Account).filter(Account.organisation_id == current_user.organisation_id).all()
    expense = next((a for a in accounts if a.account_type == "expense"), None)
    bank = next((a for a in accounts if a.account_type == "asset"), None)
    liability = next((a for a in accounts if a.account_type == "liability"), None)
    if not expense or not bank or not liability:
        raise HTTPException(status_code=400, detail="Create at least one expense, asset, and liability account first")

    lines = build_payroll_journal_lines(expense.id, bank.id, liability.id, run)
    total_debit = sum(line["debit"] for line in lines)
    total_credit = sum(line["credit"] for line in lines)
    if round(total_debit - total_credit, 2) != 0:
        raise HTTPException(status_code=400, detail="Generated payroll journal is not balanced")

    reference = f"JE-{datetime.utcnow().year}-{str(db.query(JournalEntry).count() + 1).zfill(4)}"
    entry = JournalEntry(
        organisation_id=current_user.organisation_id,
        reference=reference,
        description=f"Payroll journal for {run.reference}",
        date=run.pay_date,
        total_debit=Decimal(str(total_debit)),
        total_credit=Decimal(str(total_credit)),
        status="posted",
        source="payroll",
        source_id=run.id,
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()
    for line_data in lines:
        db.add(
            JournalLine(
                journal_entry_id=entry.id,
                account_id=line_data["account_id"],
                description=line_data["description"],
                debit=Decimal(str(line_data["debit"])),
                credit=Decimal(str(line_data["credit"])),
            )
        )
    run.journal_entry_id = entry.id
    _log_payroll_action(
        db,
        current_user.organisation_id,
        "payroll_run.journal_posted",
        current_user.id,
        payroll_run_id=run.id,
        details={"journal_reference": reference},
    )
    db.commit()
    return {"journal_entry_id": entry.id, "reference": reference}


@router.post("/runs/{run_id}/submit-fps")
async def submit_fps(
    run_id: int,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    if run.status not in {"locked", "submitted", "paid"}:
        raise HTTPException(status_code=400, detail="Lock payroll before RTI submission")

    organisation = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    payload = build_fps_payload(run, run.records, organisation)
    submission = RTISubmission(
        organisation_id=current_user.organisation_id,
        payroll_run_id=run.id,
        submission_type="FPS",
        status="submitted",
        tax_year=run.tax_year,
        tax_period=run.tax_period,
        hmrc_correlation_id=f"HMRC-FPS-{run.reference}",
        payload=payload,
        response_payload={"sandbox": True, "message": "Submission stored locally pending HMRC integration"},
        submitted_at=datetime.utcnow(),
        created_by=current_user.id,
    )
    db.add(submission)
    db.flush()
    run.fps_submission_id = submission.id
    run.status = "submitted"
    run.rti_submitted = True
    run.rti_submission_date = submission.submitted_at
    run.submitted_at = submission.submitted_at
    _log_payroll_action(db, current_user.organisation_id, "payroll_run.fps_submitted", current_user.id, payroll_run_id=run.id)
    db.commit()
    return {"submission_id": submission.id, "type": submission.submission_type, "status": submission.status}


@router.post("/runs/{run_id}/submit-eps")
async def submit_eps(
    run_id: int,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    organisation = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    payload = build_eps_payload(run, organisation)
    submission = RTISubmission(
        organisation_id=current_user.organisation_id,
        payroll_run_id=run.id,
        submission_type="EPS",
        status="submitted",
        tax_year=run.tax_year,
        tax_period=run.tax_period,
        hmrc_correlation_id=f"HMRC-EPS-{run.reference}",
        payload=payload,
        response_payload={"sandbox": True, "message": "EPS stored locally pending HMRC integration"},
        submitted_at=datetime.utcnow(),
        created_by=current_user.id,
    )
    db.add(submission)
    db.flush()
    run.eps_submission_id = submission.id
    _log_payroll_action(db, current_user.organisation_id, "payroll_run.eps_submitted", current_user.id, payroll_run_id=run.id)
    db.commit()
    return {"submission_id": submission.id, "type": submission.submission_type, "status": submission.status}


@router.get("/runs/{run_id}/bacs")
async def download_bacs_file(
    run_id: int,
    current_user: User = Depends(require_cfo),
    db: Session = Depends(get_db),
):
    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    content = build_bacs_standard_18(run, run.records)
    run.bacs_reference = f"BACS-{run.reference}"
    run.bacs_generated_at = datetime.utcnow()
    _log_payroll_action(db, current_user.organisation_id, "payroll_run.bacs_generated", current_user.id, payroll_run_id=run.id)
    db.commit()
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={run.reference.lower()}-bacs.txt"},
    )


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
            "total_gross": float(r.total_gross or 0),
            "total_net": float(r.total_net or 0),
            "total_employer_cost": float(r.total_employer_cost or 0),
            "status": r.status,
            "rti_submitted": r.rti_submitted,
            "journal_entry_id": r.journal_entry_id,
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
        PayrollRun.organisation_id == current_user.organisation_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    _log_payroll_action(db, current_user.organisation_id, "payroll_run.viewed", current_user.id, payroll_run_id=run.id)
    db.commit()

    return {
        "id": run.id,
        "reference": run.reference,
        "period_start": run.period_start.isoformat(),
        "period_end": run.period_end.isoformat(),
        "pay_date": run.pay_date.isoformat(),
        "tax_year": run.tax_year,
        "payment_frequency": run.payment_frequency,
        "totals": {
            "gross": float(run.total_gross or 0),
            "paye": float(run.total_paye or 0),
            "employee_ni": float(run.total_employee_ni or 0),
            "employer_ni": float(run.total_employer_ni or 0),
            "employee_pension": float(run.total_employee_pension or 0),
            "employer_pension": float(run.total_employer_pension or 0),
            "student_loans": float(run.total_student_loans or 0),
            "postgraduate_loans": float(run.total_postgraduate_loans or 0),
            "statutory_pay": float(run.total_statutory_pay or 0),
            "recoverable_from_hmrc": float(run.total_recoverable_from_hmrc or 0),
            "net": float(run.total_net or 0),
            "employer_cost": float(run.total_employer_cost or 0),
        },
        "status": run.status,
        "records": [_serialize_record(rec) for rec in run.records],
        "claims": [
            {
                "id": claim.id,
                "employee_id": claim.employee_id,
                "payment_type": claim.payment_type,
                "gross_amount": float(claim.gross_amount or 0),
                "recovery_amount": float(claim.recovery_amount or 0),
            }
            for claim in run.statutory_claims
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

    _log_payroll_action(db, current_user.organisation_id, "payslips.viewed", current_user.id, employee_id=employee_id)
    db.commit()

    return [
        {
            "payroll_run_id": r.payroll_run_id,
            "period": r.payroll_run.period_start.strftime("%B %Y") if r.payroll_run else None,
            "pay_date": r.payroll_run.pay_date.isoformat() if r.payroll_run else None,
            "gross_pay": float(r.gross_pay or 0),
            "paye_tax": float(r.paye_tax or 0),
            "employee_ni": float(r.employee_ni or 0),
            "employee_pension": float(r.employee_pension or 0),
            "student_loan": float(r.student_loan or 0),
            "postgraduate_loan": float(r.postgraduate_loan or 0),
            "net_pay": float(r.net_pay or 0),
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
    record = db.query(PayrollRecord).filter(
        PayrollRecord.employee_id == employee_id,
        PayrollRecord.payroll_run_id == run_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payslip not found")

    emp = record.employee
    run = record.payroll_run
    _log_payroll_action(db, current_user.organisation_id, "payslip.downloaded", current_user.id, payroll_run_id=run_id, employee_id=employee_id)
    db.commit()

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from reportlab.lib.units import cm

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph(f"<b>PAYSLIP - {run.period_start.strftime('%B %Y').upper()}</b>", styles["Title"]))
        elements.append(Spacer(1, 0.5 * cm))

        info_data = [
            ["Organisation:", "Nexus One Workspace"],
            ["Employee:", emp.full_name],
            ["NI Number:", emp.national_insurance or "-"],
            ["Tax Code:", record.tax_code_used or "1257L"],
            ["NI Category:", record.ni_category or "A"],
            ["Pay Date:", run.pay_date.strftime("%d %B %Y")],
        ]
        info_table = Table(info_data, colWidths=[4 * cm, 12 * cm])
        info_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 10), ("TEXTCOLOR", (0, 0), (0, -1), colors.grey)]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.5 * cm))

        pay_data = [
            ["Description", "Amount (GBP)"],
            ["Basic Pay", f"{float(record.basic_pay or 0):,.2f}"],
            ["Overtime", f"{float(record.overtime_pay or 0):,.2f}"],
            ["Statutory Pay", f"{float(record.statutory_payment or 0):,.2f}"],
            ["Gross Pay", f"{float(record.gross_pay or 0):,.2f}"],
            ["", ""],
            ["PAYE Income Tax", f"({float(record.paye_tax or 0):,.2f})"],
            ["Employee NI", f"({float(record.employee_ni or 0):,.2f})"],
            ["Employee Pension", f"({float(record.employee_pension or 0):,.2f})"],
            ["Student Loan", f"({float(record.student_loan or 0):,.2f})"],
            ["Postgraduate Loan", f"({float(record.postgraduate_loan or 0):,.2f})"],
            ["", ""],
            ["NET PAY", f"{float(record.net_pay or 0):,.2f}"],
        ]
        pay_table = Table(pay_data, colWidths=[12 * cm, 4 * cm])
        pay_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#064e3b")),
                    ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("LINEBELOW", (0, -2), (-1, -2), 0.5, colors.grey),
                ]
            )
        )
        elements.append(pay_table)

        doc.build(elements)
        buffer.seek(0)
        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=payslip-{emp.full_name.replace(' ', '-')}-{run.period_start.strftime('%Y-%m')}.pdf"},
        )
    except ImportError:
        raise HTTPException(status_code=501, detail="PDF generation not available. Install reportlab.")


@router.get("/runs/{run_id}/forms/p60")
async def get_p60(run_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id, PayrollRun.organisation_id == current_user.organisation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return {
        "form": "P60",
        "tax_year": run.tax_year,
        "reference": run.reference,
        "generated_at": datetime.utcnow().isoformat(),
        "employees": [{"employee_id": rec.employee_id, "employee_name": rec.employee.full_name, "gross": float(rec.ytd_gross or 0), "tax": float(rec.ytd_tax or 0)} for rec in run.records],
    }


@router.get("/runs/{run_id}/forms/p45/{employee_id}")
async def get_p45(run_id: int, employee_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(PayrollRecord).filter(PayrollRecord.payroll_run_id == run_id, PayrollRecord.employee_id == employee_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return {
        "form": "P45",
        "employee_name": record.employee.full_name if record.employee else None,
        "leaving_date": record.employee.leaving_date.isoformat() if record.employee and record.employee.leaving_date else None,
        "tax_code": record.tax_code_used,
        "total_pay_to_date": float(record.ytd_gross or 0),
        "total_tax_to_date": float(record.ytd_tax or 0),
    }


@router.get("/runs/{run_id}/forms/p11d")
async def get_p11d(run_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id, PayrollRun.organisation_id == current_user.organisation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return {
        "form": "P11D",
        "reference": run.reference,
        "generated_at": datetime.utcnow().isoformat(),
        "benefits": [],
    }


@router.get("/summary")
async def payroll_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    employee_count = db.query(func.count(Employee.id)).filter(
        Employee.organisation_id == org_id,
        Employee.is_active == True,
    ).scalar() or 0
    last_run = db.query(PayrollRun).filter(PayrollRun.organisation_id == org_id).order_by(desc(PayrollRun.pay_date)).first()
    submissions = db.query(func.count(RTISubmission.id)).filter(RTISubmission.organisation_id == org_id).scalar() or 0
    return {
        "active_employees": employee_count,
        "rti_submissions": submissions,
        "last_run": {
            "reference": last_run.reference,
            "total_gross": float(last_run.total_gross or 0),
            "total_net": float(last_run.total_net or 0),
            "total_employer_cost": float(last_run.total_employer_cost or 0),
            "status": last_run.status,
        }
        if last_run
        else None,
    }

