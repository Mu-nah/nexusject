from datetime import datetime
from decimal import Decimal

from backend.constants.uk_regulations import BACS


def fixed_width(value: str, width: int) -> str:
    return (value or "")[:width].ljust(width)


def numeric_width(value: str, width: int) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())[:width].rjust(width, "0")


def amount_pence(amount: Decimal | float) -> str:
    pence = int(Decimal(str(amount)) * 100)
    return str(pence).rjust(11, "0")


def build_bacs_standard_18(run, records, service_user_number: str = "123456") -> str:
    generated = datetime.utcnow().strftime("%y%j")
    lines = [
        f"HDR{numeric_width(service_user_number, BACS['service_user_number_length'])}{generated}".ljust(BACS["record_length"]),
    ]
    for index, record in enumerate(records, start=1):
        employee = record.employee
        sort_code = numeric_width(getattr(employee, "bank_sort_code", ""), 6)
        account_number = numeric_width(getattr(employee, "bank_account_number", ""), 8)
        account_name = fixed_width(getattr(employee, "bank_account_name", "") or employee.full_name, 18)
        amount = amount_pence(record.net_pay)
        reference = fixed_width(run.reference, 18)
        line = f"DTL{sort_code}{account_number}{account_name}{amount}{reference}{str(index).rjust(10, '0')}"
        lines.append(line.ljust(BACS["record_length"]))
    lines.append(f"EOF{str(len(records)).rjust(6, '0')}{amount_pence(run.total_net)}".ljust(BACS["record_length"]))
    return "\n".join(lines)


def build_fps_payload(run, records, organisation):
    return {
        "submissionType": "FPS",
        "taxYear": run.tax_year,
        "taxPeriod": run.tax_period,
        "payDate": run.pay_date.date().isoformat(),
        "employer": {
            "name": getattr(organisation, "name", None),
            "id": getattr(organisation, "id", None),
        },
        "totals": {
            "gross": float(run.total_gross or 0),
            "tax": float(run.total_paye or 0),
            "employeeNi": float(run.total_employee_ni or 0),
            "employerNi": float(run.total_employer_ni or 0),
            "studentLoans": float(run.total_student_loans or 0),
            "postgraduateLoans": float(run.total_postgraduate_loans or 0),
            "recoverable": float(run.total_recoverable_from_hmrc or 0),
        },
        "employees": [
            {
                "employeeId": record.employee_id,
                "name": record.employee.full_name if record.employee else None,
                "taxCode": record.tax_code_used,
                "niCategory": record.ni_category,
                "taxablePay": float(record.gross_for_tax or 0),
                "taxDeducted": float(record.paye_tax or 0),
                "employeeNi": float(record.employee_ni or 0),
                "studentLoan": float(record.student_loan or 0),
                "postgraduateLoan": float(record.postgraduate_loan or 0),
                "netPay": float(record.net_pay or 0),
            }
            for record in records
        ],
    }


def build_eps_payload(run, organisation):
    return {
        "submissionType": "EPS",
        "taxYear": run.tax_year,
        "taxPeriod": run.tax_period,
        "employer": {
            "name": getattr(organisation, "name", None),
            "id": getattr(organisation, "id", None),
        },
        "recoverableAmounts": {
            "statutory": float(run.total_recoverable_from_hmrc or 0),
        },
    }


def build_payroll_journal_lines(expense_account_id: int, bank_account_id: int, liability_account_id: int, run):
    net = Decimal(str(run.total_net or 0))
    paye = Decimal(str(run.total_paye or 0))
    emp_ni = Decimal(str(run.total_employee_ni or 0))
    student_loans = Decimal(str(run.total_student_loans or 0)) + Decimal(str(run.total_postgraduate_loans or 0))
    pension = Decimal(str(run.total_employee_pension or 0))
    liabilities = paye + emp_ni + student_loans + pension

    lines = [
        {"account_id": expense_account_id, "description": f"Payroll gross {run.reference}", "debit": float(run.total_gross or 0), "credit": 0},
        {"account_id": bank_account_id, "description": f"Payroll net pay {run.reference}", "debit": 0, "credit": float(net)},
    ]
    if liabilities > 0:
        lines.append(
            {
                "account_id": liability_account_id,
                "description": f"Payroll statutory liabilities {run.reference}",
                "debit": 0,
                "credit": float(liabilities),
            }
        )
    return lines

