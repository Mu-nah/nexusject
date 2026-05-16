from decimal import Decimal


TAX_YEAR = "2024-25"

PERSONAL_ALLOWANCE = Decimal("12570")
PERSONAL_ALLOWANCE_TAPER_THRESHOLD = Decimal("100000")
PERSONAL_ALLOWANCE_ZERO_THRESHOLD = Decimal("125140")

TAX_BANDS = {
    "uk": [
        {"name": "basic", "start": Decimal("0"), "end": Decimal("37700"), "rate": Decimal("0.20")},
        {"name": "higher", "start": Decimal("37700"), "end": Decimal("125140"), "rate": Decimal("0.40")},
        {"name": "additional", "start": Decimal("125140"), "end": None, "rate": Decimal("0.45")},
    ],
    "scotland": [
        {"name": "starter", "start": Decimal("0"), "end": Decimal("2306"), "rate": Decimal("0.19")},
        {"name": "basic", "start": Decimal("2306"), "end": Decimal("13991"), "rate": Decimal("0.20")},
        {"name": "intermediate", "start": Decimal("13991"), "end": Decimal("31092"), "rate": Decimal("0.21")},
        {"name": "higher", "start": Decimal("31092"), "end": Decimal("62430"), "rate": Decimal("0.42")},
        {"name": "advanced", "start": Decimal("62430"), "end": Decimal("125140"), "rate": Decimal("0.45")},
        {"name": "top", "start": Decimal("125140"), "end": None, "rate": Decimal("0.48")},
    ],
}

NI_THRESHOLDS = {
    "primary_threshold": Decimal("12570"),
    "upper_earnings_limit": Decimal("50270"),
    "secondary_threshold": Decimal("9100"),
    "lower_earnings_limit": Decimal("6396"),
}

NI_CATEGORY_RATES = {
    "A": {"employee_main": Decimal("0.08"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.138")},
    "B": {"employee_main": Decimal("0.0185"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.138")},
    "C": {"employee_main": Decimal("0.00"), "employee_upper": Decimal("0.00"), "employer": Decimal("0.138")},
    "H": {"employee_main": Decimal("0.08"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.00")},
    "J": {"employee_main": Decimal("0.02"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.138")},
    "M": {"employee_main": Decimal("0.08"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.138")},
    "Z": {"employee_main": Decimal("0.02"), "employee_upper": Decimal("0.02"), "employer": Decimal("0.138")},
}

AUTO_ENROLMENT = {
    "minimum_age": 22,
    "state_pension_age_floor": 66,
    "earnings_trigger": Decimal("10000"),
    "lower_qualifying_earnings": Decimal("6240"),
    "upper_qualifying_earnings": Decimal("50270"),
    "minimum_employee_rate": Decimal("0.05"),
    "minimum_employer_rate": Decimal("0.03"),
}

STUDENT_LOANS = {
    "plan1": {"threshold": Decimal("24990"), "rate": Decimal("0.09")},
    "plan2": {"threshold": Decimal("27295"), "rate": Decimal("0.09")},
    "plan4": {"threshold": Decimal("31395"), "rate": Decimal("0.09")},
    "postgraduate": {"threshold": Decimal("21000"), "rate": Decimal("0.06")},
}

STATUTORY_PAY = {
    "ssp": {"weekly_rate": Decimal("116.75"), "max_weeks": Decimal("28"), "recovery_rate": Decimal("0.00")},
    "smp": {"weekly_rate": Decimal("184.03"), "max_weeks": Decimal("39"), "recovery_rate": Decimal("0.92")},
    "spp": {"weekly_rate": Decimal("184.03"), "max_weeks": Decimal("2"), "recovery_rate": Decimal("0.92")},
    "sap": {"weekly_rate": Decimal("184.03"), "max_weeks": Decimal("39"), "recovery_rate": Decimal("0.92")},
}

BACS = {
    "service_user_number_length": 6,
    "record_length": 80,
}

