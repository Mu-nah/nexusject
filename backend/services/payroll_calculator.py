"""
UK Payroll Calculation Engine
Covers: PAYE Income Tax, National Insurance (Class 1), Auto-Enrolment Pension
Tax year 2024-25 rates
"""
from decimal import Decimal
from dataclasses import dataclass
from typing import Optional
import math

# 2024-25 TAX BANDS (England/Wales/NI)
PERSONAL_ALLOWANCE = Decimal("12570")
BASIC_RATE_LIMIT = Decimal("50270")
HIGHER_RATE_LIMIT = Decimal("125140")
BASIC_RATE = Decimal("0.20")
HIGHER_RATE = Decimal("0.40")
ADDITIONAL_RATE = Decimal("0.45")

# NI THRESHOLDS (annual)
NI_LOWER_EARNINGS_LIMIT = Decimal("6396")
NI_PRIMARY_THRESHOLD = Decimal("12570")
NI_UPPER_EARNINGS_LIMIT = Decimal("50270")
EMPLOYEE_NI_RATE_MAIN = Decimal("0.08")   # 8% from Jan 2024
EMPLOYEE_NI_RATE_UPPER = Decimal("0.02")
EMPLOYER_NI_RATE = Decimal("0.138")        # 13.8%
EMPLOYER_NI_SECONDARY_THRESHOLD = Decimal("9100")

# PENSION AUTO-ENROLMENT
AE_LOWER_QUALIFYING_EARNINGS = Decimal("6240")
AE_UPPER_QUALIFYING_EARNINGS = Decimal("50270")

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
    other_deductions: Decimal
    net_pay: Decimal
    employer_total_cost: Decimal
    effective_tax_rate: float
    tax_code: str
    ni_category: str

def calculate_monthly_paye(annual_gross: Decimal, tax_code: str = "1257L") -> Decimal:
    """Calculate monthly PAYE tax for a given annual gross salary."""
    # Parse personal allowance from tax code (1257L = £12,570)
    try:
        personal_allowance = Decimal(str(int(''.join(filter(str.isdigit, tax_code))) * 10))
    except:
        personal_allowance = PERSONAL_ALLOWANCE

    taxable_income = max(Decimal("0"), annual_gross - personal_allowance)

    tax = Decimal("0")
    if taxable_income <= (BASIC_RATE_LIMIT - personal_allowance):
        tax = taxable_income * BASIC_RATE
    elif taxable_income <= (HIGHER_RATE_LIMIT - personal_allowance):
        basic_band = (BASIC_RATE_LIMIT - personal_allowance) * BASIC_RATE
        higher_band = (taxable_income - (BASIC_RATE_LIMIT - personal_allowance)) * HIGHER_RATE
        tax = basic_band + higher_band
    else:
        basic_band = (BASIC_RATE_LIMIT - personal_allowance) * BASIC_RATE
        higher_band = (HIGHER_RATE_LIMIT - BASIC_RATE_LIMIT) * HIGHER_RATE
        additional_band = (taxable_income - (HIGHER_RATE_LIMIT - personal_allowance)) * ADDITIONAL_RATE
        tax = basic_band + higher_band + additional_band

    monthly_tax = tax / 12
    return max(Decimal("0"), monthly_tax.quantize(Decimal("0.01")))


def calculate_monthly_employee_ni(monthly_gross: Decimal, ni_category: str = "A") -> Decimal:
    """Calculate monthly employee National Insurance contributions."""
    annual_gross = monthly_gross * 12

    if annual_gross <= NI_PRIMARY_THRESHOLD:
        return Decimal("0")

    if annual_gross <= NI_UPPER_EARNINGS_LIMIT:
        ni = (annual_gross - NI_PRIMARY_THRESHOLD) * EMPLOYEE_NI_RATE_MAIN
    else:
        main_band = (NI_UPPER_EARNINGS_LIMIT - NI_PRIMARY_THRESHOLD) * EMPLOYEE_NI_RATE_MAIN
        upper_band = (annual_gross - NI_UPPER_EARNINGS_LIMIT) * EMPLOYEE_NI_RATE_UPPER
        ni = main_band + upper_band

    monthly_ni = ni / 12
    return max(Decimal("0"), monthly_ni.quantize(Decimal("0.01")))


def calculate_monthly_employer_ni(monthly_gross: Decimal) -> Decimal:
    """Calculate monthly employer National Insurance contributions."""
    annual_gross = monthly_gross * 12
    annual_secondary_threshold = EMPLOYER_NI_SECONDARY_THRESHOLD

    if annual_gross <= annual_secondary_threshold:
        return Decimal("0")

    employer_ni = (annual_gross - annual_secondary_threshold) * EMPLOYER_NI_RATE
    return max(Decimal("0"), (employer_ni / 12).quantize(Decimal("0.01")))


def calculate_pension(
    monthly_gross: Decimal,
    employee_rate: Decimal = Decimal("5.0"),
    employer_rate: Decimal = Decimal("3.0")
) -> tuple[Decimal, Decimal]:
    """
    Calculate auto-enrolment pension contributions.
    Returns (employee_contribution, employer_contribution)
    """
    annual_gross = monthly_gross * 12

    if annual_gross < AE_LOWER_QUALIFYING_EARNINGS:
        return Decimal("0"), Decimal("0")

    qualifying_earnings = min(annual_gross, AE_UPPER_QUALIFYING_EARNINGS) - AE_LOWER_QUALIFYING_EARNINGS
    qualifying_earnings = max(Decimal("0"), qualifying_earnings)

    monthly_qualifying = qualifying_earnings / 12
    employee_pension = (monthly_qualifying * employee_rate / 100).quantize(Decimal("0.01"))
    employer_pension = (monthly_qualifying * employer_rate / 100).quantize(Decimal("0.01"))

    return employee_pension, employer_pension


def calculate_payslip(
    employee_name: str,
    gross_monthly: float,
    tax_code: str = "1257L",
    ni_category: str = "A",
    pension_employee_rate: float = 5.0,
    pension_employer_rate: float = 3.0,
    overtime: float = 0.0,
    other_deductions: float = 0.0,
    student_loan_plan: Optional[str] = None,
) -> PayCalculation:
    """
    Full payslip calculation for a single employee for one pay period.
    """
    gross = Decimal(str(gross_monthly))
    overtime_d = Decimal(str(overtime))
    total_gross = gross + overtime_d

    paye = calculate_monthly_paye(total_gross * 12, tax_code)
    emp_ni = calculate_monthly_employee_ni(total_gross)
    er_ni = calculate_monthly_employer_ni(total_gross)
    emp_pension, er_pension = calculate_pension(
        total_gross,
        Decimal(str(pension_employee_rate)),
        Decimal(str(pension_employer_rate))
    )

    # Student loan (Plan 2 threshold £27,295 annual)
    student_loan = Decimal("0")
    if student_loan_plan == "plan2":
        annual = total_gross * 12
        sl_threshold = Decimal("27295")
        if annual > sl_threshold:
            student_loan = ((annual - sl_threshold) * Decimal("0.09") / 12).quantize(Decimal("0.01"))

    total_deductions = paye + emp_ni + emp_pension + student_loan + Decimal(str(other_deductions))
    net_pay = total_gross - total_deductions
    employer_cost = total_gross + er_ni + er_pension

    effective_rate = float((paye / total_gross * 100).quantize(Decimal("0.1"))) if total_gross > 0 else 0.0

    return PayCalculation(
        employee_name=employee_name,
        gross_pay=total_gross,
        basic_pay=gross,
        overtime_pay=overtime_d,
        paye_tax=paye,
        employee_ni=emp_ni,
        employer_ni=er_ni,
        employee_pension=emp_pension,
        employer_pension=er_pension,
        student_loan=student_loan,
        other_deductions=Decimal(str(other_deductions)),
        net_pay=net_pay,
        employer_total_cost=employer_cost,
        effective_tax_rate=effective_rate,
        tax_code=tax_code,
        ni_category=ni_category,
    )
