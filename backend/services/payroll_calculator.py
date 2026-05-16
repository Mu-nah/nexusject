"""
UK payroll calculation services.

This service keeps UK-specific thresholds isolated from route handlers and
returns rich breakdowns that can be persisted against payroll records.
"""
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from backend.constants.uk_regulations import (
    AUTO_ENROLMENT,
    NI_CATEGORY_RATES,
    NI_THRESHOLDS,
    PERSONAL_ALLOWANCE,
    PERSONAL_ALLOWANCE_TAPER_THRESHOLD,
    STUDENT_LOANS,
    STATUTORY_PAY,
    TAX_BANDS,
)


TWOPLACES = Decimal("0.01")
MONTHS_IN_YEAR = Decimal("12")


def money(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def annualise_monthly(monthly_amount: Decimal) -> Decimal:
    return monthly_amount * MONTHS_IN_YEAR


def derive_tax_regime(tax_code: str, tax_regime: Optional[str]) -> str:
    code = (tax_code or "").upper()
    if tax_regime in {"uk", "scotland"}:
        return tax_regime
    return "scotland" if code.startswith("S") else "uk"


def parse_tax_code_allowance(tax_code: str) -> Decimal:
    code = (tax_code or "1257L").upper().strip()
    digits = "".join(ch for ch in code if ch.isdigit())
    if code.startswith("K") and digits:
        return Decimal("0") - (Decimal(digits) * Decimal("10"))
    if digits:
        return Decimal(digits) * Decimal("10")
    return PERSONAL_ALLOWANCE


def adjusted_personal_allowance(annual_income: Decimal, tax_code: str) -> Decimal:
    base_allowance = parse_tax_code_allowance(tax_code)
    if base_allowance <= 0:
        return base_allowance
    if annual_income <= PERSONAL_ALLOWANCE_TAPER_THRESHOLD:
        return base_allowance
    reduction = (annual_income - PERSONAL_ALLOWANCE_TAPER_THRESHOLD) / Decimal("2")
    return max(Decimal("0"), base_allowance - reduction)


def annual_tax_from_bands(taxable_income: Decimal, regime: str) -> Decimal:
    tax = Decimal("0")
    for band in TAX_BANDS[regime]:
        if taxable_income <= band["start"]:
            continue
        upper = taxable_income if band["end"] is None else min(taxable_income, band["end"])
        slice_amount = max(Decimal("0"), upper - band["start"])
        tax += slice_amount * band["rate"]
        if band["end"] is not None and taxable_income <= band["end"]:
            break
    return money(tax)


def calculate_monthly_paye(
    annual_gross: Decimal,
    tax_code: str = "1257L",
    tax_regime: Optional[str] = None,
) -> Decimal:
    regime = derive_tax_regime(tax_code, tax_regime)
    personal_allowance = adjusted_personal_allowance(annual_gross, tax_code)
    taxable_income = max(Decimal("0"), annual_gross - personal_allowance)
    annual_tax = annual_tax_from_bands(taxable_income, regime)
    return money(annual_tax / MONTHS_IN_YEAR)


def calculate_monthly_employee_ni(
    monthly_gross: Decimal,
    ni_category: str = "A",
    director_ni: bool = False,
) -> Decimal:
    annual_gross = annualise_monthly(monthly_gross)
    rates = NI_CATEGORY_RATES.get((ni_category or "A").upper(), NI_CATEGORY_RATES["A"])

    if annual_gross <= NI_THRESHOLDS["primary_threshold"]:
        return Decimal("0.00")

    if director_ni:
        main_band = min(
            max(Decimal("0"), annual_gross - NI_THRESHOLDS["primary_threshold"]),
            NI_THRESHOLDS["upper_earnings_limit"] - NI_THRESHOLDS["primary_threshold"],
        )
        upper_band = max(Decimal("0"), annual_gross - NI_THRESHOLDS["upper_earnings_limit"])
        annual_ni = (main_band * rates["employee_main"]) + (upper_band * rates["employee_upper"])
        return money(annual_ni / MONTHS_IN_YEAR)

    monthly_primary = NI_THRESHOLDS["primary_threshold"] / MONTHS_IN_YEAR
    monthly_uel = NI_THRESHOLDS["upper_earnings_limit"] / MONTHS_IN_YEAR
    main_band = min(max(Decimal("0"), monthly_gross - monthly_primary), monthly_uel - monthly_primary)
    upper_band = max(Decimal("0"), monthly_gross - monthly_uel)
    ni = (main_band * rates["employee_main"]) + (upper_band * rates["employee_upper"])
    return money(ni)


def calculate_monthly_employer_ni(
    monthly_gross: Decimal,
    ni_category: str = "A",
) -> Decimal:
    monthly_secondary = NI_THRESHOLDS["secondary_threshold"] / MONTHS_IN_YEAR
    rates = NI_CATEGORY_RATES.get((ni_category or "A").upper(), NI_CATEGORY_RATES["A"])
    if monthly_gross <= monthly_secondary:
        return Decimal("0.00")
    employer_band = max(Decimal("0"), monthly_gross - monthly_secondary)
    return money(employer_band * rates["employer"])


def calculate_auto_enrolment_status(
    monthly_gross: Decimal,
    pension_enrolled: bool = True,
    date_of_birth: Optional[date] = None,
) -> dict:
    annual_gross = annualise_monthly(monthly_gross)
    age = None
    if date_of_birth:
        today = date.today()
        age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))

    eligible_age = age is None or (
        age >= AUTO_ENROLMENT["minimum_age"] and age < AUTO_ENROLMENT["state_pension_age_floor"]
    )
    eligible_earnings = annual_gross >= AUTO_ENROLMENT["earnings_trigger"]
    category = "eligible" if eligible_age and eligible_earnings else "non_eligible"

    lower = AUTO_ENROLMENT["lower_qualifying_earnings"]
    upper = AUTO_ENROLMENT["upper_qualifying_earnings"]
    qualifying_annual = max(Decimal("0"), min(annual_gross, upper) - lower)

    return {
        "category": category,
        "age": age,
        "eligible": category == "eligible",
        "qualifying_earnings_annual": money(qualifying_annual),
        "qualifying_earnings_monthly": money(qualifying_annual / MONTHS_IN_YEAR),
        "member_status": "enrolled" if pension_enrolled and category == "eligible" else "not_enrolled",
    }


def calculate_pension(
    monthly_gross: Decimal,
    employee_rate: Decimal = Decimal("5.0"),
    employer_rate: Decimal = Decimal("3.0"),
    pension_enrolled: bool = True,
    date_of_birth: Optional[date] = None,
) -> tuple[Decimal, Decimal, dict]:
    assessment = calculate_auto_enrolment_status(monthly_gross, pension_enrolled, date_of_birth)
    if not pension_enrolled or not assessment["eligible"]:
        assessment["member_status"] = "opted_out" if not pension_enrolled else "not_enrolled"
        return Decimal("0.00"), Decimal("0.00"), assessment

    qualifying = assessment["qualifying_earnings_monthly"]
    employee_pension = money(qualifying * (employee_rate / Decimal("100")))
    employer_pension = money(qualifying * (employer_rate / Decimal("100")))
    return employee_pension, employer_pension, assessment


def calculate_student_loan_deduction(
    monthly_gross: Decimal,
    plan: Optional[str] = None,
    postgraduate_loan: bool = False,
) -> tuple[Decimal, Decimal]:
    annual_gross = annualise_monthly(monthly_gross)
    plan_key = (plan or "").lower().replace(" ", "")
    student_loan = Decimal("0.00")
    postgraduate = Decimal("0.00")

    if plan_key in STUDENT_LOANS and plan_key != "postgraduate":
        cfg = STUDENT_LOANS[plan_key]
        if annual_gross > cfg["threshold"]:
            student_loan = money(((annual_gross - cfg["threshold"]) * cfg["rate"]) / MONTHS_IN_YEAR)

    if postgraduate_loan:
        cfg = STUDENT_LOANS["postgraduate"]
        if annual_gross > cfg["threshold"]:
            postgraduate = money(((annual_gross - cfg["threshold"]) * cfg["rate"]) / MONTHS_IN_YEAR)

    return student_loan, postgraduate


def calculate_statutory_payment(
    payment_type: Optional[str],
    qualifying_weeks: Decimal = Decimal("0"),
) -> tuple[Decimal, Decimal]:
    if not payment_type:
        return Decimal("0.00"), Decimal("0.00")
    key = payment_type.lower()
    if key not in STATUTORY_PAY:
        return Decimal("0.00"), Decimal("0.00")
    cfg = STATUTORY_PAY[key]
    weekly_rate = cfg["weekly_rate"]
    weekly_fraction = min(qualifying_weeks, Decimal("4.3333"))
    gross = money(weekly_rate * weekly_fraction)
    recovery = money(gross * cfg["recovery_rate"])
    return gross, recovery


@dataclass
class PayCalculation:
    employee_name: str
    gross_pay: Decimal
    basic_pay: Decimal
    overtime_pay: Decimal
    paye_tax: Decimal
    employee_ni: Decimal
    employer_ni: Decimal
    employee_pension: Decimal
    employer_pension: Decimal
    student_loan: Decimal
    postgraduate_loan: Decimal
    statutory_payment: Decimal
    statutory_recovery: Decimal
    other_deductions: Decimal
    net_pay: Decimal
    employer_total_cost: Decimal
    effective_tax_rate: float
    tax_code: str
    ni_category: str
    tax_regime: str
    pension_assessment: dict
    deductions_breakdown: dict
    pay_breakdown: dict
    rti_values: dict


def calculate_payslip(
    employee_name: str,
    gross_monthly: float,
    tax_code: str = "1257L",
    ni_category: str = "A",
    tax_regime: Optional[str] = None,
    pension_employee_rate: float = 5.0,
    pension_employer_rate: float = 3.0,
    pension_enrolled: bool = True,
    overtime: float = 0.0,
    other_deductions: float = 0.0,
    student_loan_plan: Optional[str] = None,
    postgraduate_loan: bool = False,
    director_ni: bool = False,
    date_of_birth: Optional[date | datetime] = None,
    statutory_payment_type: Optional[str] = None,
    statutory_weeks: float = 0.0,
) -> PayCalculation:
    gross = money(gross_monthly)
    overtime_d = money(overtime)
    total_gross = gross + overtime_d
    employee_dob = None
    if isinstance(date_of_birth, datetime):
        employee_dob = date_of_birth.date()
    elif isinstance(date_of_birth, date):
        employee_dob = date_of_birth

    regime = derive_tax_regime(tax_code, tax_regime)
    annual_gross = annualise_monthly(total_gross)
    paye = calculate_monthly_paye(annual_gross, tax_code, regime)
    emp_ni = calculate_monthly_employee_ni(total_gross, ni_category, director_ni)
    er_ni = calculate_monthly_employer_ni(total_gross, ni_category)
    emp_pension, er_pension, pension_assessment = calculate_pension(
        total_gross,
        Decimal(str(pension_employee_rate)),
        Decimal(str(pension_employer_rate)),
        pension_enrolled,
        employee_dob,
    )
    student_loan, postgraduate = calculate_student_loan_deduction(
        total_gross,
        student_loan_plan,
        postgraduate_loan,
    )
    statutory_payment, statutory_recovery = calculate_statutory_payment(
        statutory_payment_type,
        Decimal(str(statutory_weeks)),
    )

    deductions = {
        "paye": paye,
        "employee_ni": emp_ni,
        "employee_pension": emp_pension,
        "student_loan": student_loan,
        "postgraduate_loan": postgraduate,
        "other_deductions": money(other_deductions),
    }
    total_deductions = sum(deductions.values(), Decimal("0.00"))
    net_pay = money(total_gross + statutory_payment - total_deductions)
    employer_cost = money(total_gross + statutory_payment + er_ni + er_pension)
    effective_rate = float((paye / total_gross * Decimal("100")).quantize(Decimal("0.1"))) if total_gross > 0 else 0.0

    pay_breakdown = {
        "gross_for_tax": total_gross,
        "gross_for_ni": total_gross,
        "basic_pay": gross,
        "overtime_pay": overtime_d,
        "statutory_payment": statutory_payment,
    }
    rti_values = {
        "taxable_pay": total_gross,
        "tax_deducted": paye,
        "niable_pay": total_gross,
        "employee_ni": emp_ni,
        "employer_ni": er_ni,
        "student_loan": student_loan,
        "postgraduate_loan": postgraduate,
    }

    return PayCalculation(
        employee_name=employee_name,
        gross_pay=money(total_gross + statutory_payment),
        basic_pay=gross,
        overtime_pay=overtime_d,
        paye_tax=paye,
        employee_ni=emp_ni,
        employer_ni=er_ni,
        employee_pension=emp_pension,
        employer_pension=er_pension,
        student_loan=student_loan,
        postgraduate_loan=postgraduate,
        statutory_payment=statutory_payment,
        statutory_recovery=statutory_recovery,
        other_deductions=money(other_deductions),
        net_pay=net_pay,
        employer_total_cost=employer_cost,
        effective_tax_rate=effective_rate,
        tax_code=tax_code,
        ni_category=ni_category,
        tax_regime=regime,
        pension_assessment=pension_assessment,
        deductions_breakdown=deductions,
        pay_breakdown=pay_breakdown,
        rti_values=rti_values,
    )

