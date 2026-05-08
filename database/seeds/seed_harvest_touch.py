"""
Database Seed Script
Creates: Organisation, admin user, chart of accounts, sample grants, employees
Run: python -m database.seeds.seed_harvest_touch
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.core.database import SessionLocal, Base, engine
from backend.core.security import hash_password
# Import all models so SQLAlchemy registers every table in metadata before create_all
from backend.models import user, account, transaction, journal, grant, employee, donor, expense
from backend.models.user import User, Organisation
from backend.models.account import Account, BankAccount
from backend.models.grant import Grant, Programme
from backend.models.employee import Employee, PensionScheme
from backend.models.donor import Donor, DonationCampaign
from backend.models.expense import ExpenseCategory
from datetime import datetime, timedelta
from decimal import Decimal

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Seeding Harvest Touch CIC...")

# ── Organisation ──────────────────────────────────────────────────────────────
org = Organisation(
    slug="harvest-touch",
    name="Harvest Touch Youth & Skills Community Hub CIC",
    legal_type="CIC",
    companies_house_number="12345678",
    address="Rochdale, Greater Manchester, OL16 1AB",
    email="finance@harvesttouch.org.uk",
    phone="01706 000000",
    currency="GBP",
    fiscal_year_start="04-06",
)
db.add(org)
db.flush()
print(f"  Organisation: {org.name}")

# ── Users ─────────────────────────────────────────────────────────────────────
users = [
    User(organisation_id=org.id, email="dominic@harvesttouch.org.uk",
         full_name="Dominic Ogbuagu", hashed_password=hash_password("Admin1234!"),
         role="cfo", is_active=True),
    User(organisation_id=org.id, email="amina@harvesttouch.org.uk",
         full_name="Amina Ibrahim", hashed_password=hash_password("Staff1234!"),
         role="programme_manager", is_active=True),
    User(organisation_id=org.id, email="kemi@harvesttouch.org.uk",
         full_name="Kemi Okafor", hashed_password=hash_password("Staff1234!"),
         role="finance_manager", is_active=True),
]
for u in users:
    db.add(u)
db.flush()
print(f"  Users: {len(users)} created")

# ── Chart of Accounts ─────────────────────────────────────────────────────────
accounts_data = [
    # Assets
    ("1000", "Current Account — Barclays", "asset", 64320),
    ("1010", "Savings Account — Barclays", "asset", 20000),
    ("1100", "Accounts Receivable", "asset", 8200),
    ("1200", "Prepayments", "asset", 2300),
    # Liabilities
    ("2000", "Accounts Payable", "liability", -2400),
    ("2100", "PAYE / NI Payable", "liability", -3200),
    ("2200", "Pension Payable", "liability", -900),
    ("2300", "Deferred Income", "liability", -4000),
    # Income
    ("4000", "Grant Income — NLCF", "income", 28000),
    ("4010", "Grant Income — GMCA", "income", 64000),
    ("4020", "Grant Income — Rochdale SLA", "income", 10000),
    ("4100", "Donation Income", "income", 9240),
    ("4200", "SLA Contract Income", "income", 4460),
    # Expenses
    ("6000", "Staff Salaries", "expense", -42000),
    ("6010", "Employer NI", "expense", -5820),
    ("6020", "Employer Pension", "expense", -2620),
    ("6030", "Freelance / Sessional", "expense", -7760),
    ("6100", "Programme Activities", "expense", -14240),
    ("6110", "Venue Hire", "expense", -3600),
    ("6120", "Catering & Refreshments", "expense", -2840),
    ("6130", "Materials & Print", "expense", -1640),
    ("6140", "Travel & Transport", "expense", -1360),
    ("7000", "Premises / Rent", "expense", -8400),
    ("7100", "Utilities", "expense", -1800),
    ("7200", "IT & Communications", "expense", -2400),
    ("7300", "Insurance", "expense", -960),
    ("7400", "Accountancy & Professional Fees", "expense", -1260),
]
account_map = {}
for code, name, atype, balance in accounts_data:
    acc = Account(
        organisation_id=org.id,
        code=code, name=name,
        account_type=atype,
        balance=Decimal(str(balance)),
        is_active=True,
    )
    db.add(acc)
    db.flush()
    account_map[code] = acc.id
print(f"  Chart of accounts: {len(accounts_data)} accounts")

# ── Bank Accounts ─────────────────────────────────────────────────────────────
bank_accounts = [
    BankAccount(organisation_id=org.id, bank_name="Barclays", account_name="Current Account",
                account_number="12345678", sort_code="20-00-00", balance=Decimal("64320.00"),
                account_id=account_map["1000"]),
    BankAccount(organisation_id=org.id, bank_name="Barclays", account_name="Savings Account",
                account_number="87654321", sort_code="20-00-00", balance=Decimal("20000.00"),
                account_id=account_map["1010"]),
]
for b in bank_accounts:
    db.add(b)
print(f"  Bank accounts: {len(bank_accounts)} created")

# ── Grants ────────────────────────────────────────────────────────────────────
grants_data = [
    Grant(organisation_id=org.id, reference="NLCF-2024", name="National Lottery Community Fund",
          funder="NLCF", amount_awarded=Decimal("50000"), amount_spent=Decimal("28000"),
          start_date=datetime(2024, 1, 1), end_date=datetime(2025, 12, 31),
          reporting_frequency="quarterly", next_report_due=datetime(2025, 3, 28),
          status="active", objectives=["Youth engagement", "Mentoring", "Skills development"]),
    Grant(organisation_id=org.id, reference="GMCA-2024", name="GM Combined Authority Skills Fund",
          funder="Greater Manchester Combined Authority", amount_awarded=Decimal("80000"), amount_spent=Decimal("64000"),
          start_date=datetime(2024, 3, 1), end_date=datetime(2026, 2, 28),
          reporting_frequency="quarterly", next_report_due=datetime(2025, 6, 30),
          status="active", objectives=["Digital skills", "Employability", "Training"]),
    Grant(organisation_id=org.id, reference="RCSL-2024", name="Rochdale Council SLA",
          funder="Rochdale Metropolitan Borough Council", amount_awarded=Decimal("12500"), amount_spent=Decimal("10000"),
          start_date=datetime(2024, 4, 1), end_date=datetime(2025, 3, 31),
          reporting_frequency="annual", next_report_due=datetime(2025, 3, 31),
          status="active"),
]
for g in grants_data:
    db.add(g)
db.flush()
print(f"  Grants: {len(grants_data)} active grants")

# ── Programmes ────────────────────────────────────────────────────────────────
programmes = [
    Programme(organisation_id=org.id, name="Youth Connect Programme",
              total_budget=Decimal("18000"), spent=Decimal("14240"),
              actual_participants=86, target_participants=100, volunteer_hours=Decimal("420"),
              lead_grant_id=grants_data[0].id, status="active"),
    Programme(organisation_id=org.id, name="Skills Hub Sessions",
              total_budget=Decimal("32000"), spent=Decimal("28600"),
              actual_participants=94, target_participants=90, volunteer_hours=Decimal("380"),
              lead_grant_id=grants_data[1].id, status="active"),
    Programme(organisation_id=org.id, name="Mentoring Network",
              total_budget=Decimal("12000"), spent=Decimal("7820"),
              actual_participants=42, target_participants=50, volunteer_hours=Decimal("280"),
              lead_grant_id=grants_data[0].id, status="active"),
    Programme(organisation_id=org.id, name="Digital Inclusion",
              total_budget=Decimal("18000"), spent=Decimal("16800"),
              actual_participants=26, target_participants=40, volunteer_hours=Decimal("160"),
              lead_grant_id=grants_data[1].id, status="active"),
]
for p in programmes:
    db.add(p)
print(f"  Programmes: {len(programmes)} created")

# ── Employees ─────────────────────────────────────────────────────────────────
pension = PensionScheme(organisation_id=org.id, provider="NEST", scheme_reference="NEST-HT-001",
                        employer_rate=Decimal("3.0"), employee_rate=Decimal("5.0"))
db.add(pension)
db.flush()

employees = [
    Employee(organisation_id=org.id, employee_number="EMP-0001",
             full_name="Dominic Ogbuagu", email="dominic@harvesttouch.org.uk",
             role_title="Lead Consultant & CFO", national_insurance="AB123456C",
             tax_code="1257L", contract_type="full_time", gross_salary=Decimal("1800"),
             pension_enrolled=True, is_active=True, grant_funded=True, grant_id=grants_data[0].id),
    Employee(organisation_id=org.id, employee_number="EMP-0002",
             full_name="Amina Ibrahim", email="amina@harvesttouch.org.uk",
             role_title="Youth Worker", national_insurance="CD789012E",
             tax_code="1257L", contract_type="part_time", gross_salary=Decimal("1200"),
             pension_enrolled=True, is_active=True, grant_funded=True, grant_id=grants_data[0].id),
    Employee(organisation_id=org.id, employee_number="EMP-0003",
             full_name="James Musa", email="james@harvesttouch.org.uk",
             role_title="Skills Trainer", national_insurance="EF345678G",
             tax_code="1257L", contract_type="part_time", gross_salary=Decimal("950"),
             pension_enrolled=False, is_active=True, grant_funded=True, grant_id=grants_data[1].id),
    Employee(organisation_id=org.id, employee_number="EMP-0004",
             full_name="Kemi Okafor", email="kemi@harvesttouch.org.uk",
             role_title="Admin Coordinator", national_insurance="GH901234I",
             tax_code="1257L", contract_type="full_time", gross_salary=Decimal("900"),
             pension_enrolled=True, is_active=True),
]
for e in employees:
    db.add(e)
print(f"  Employees: {len(employees)} active")

# ── Expense Categories ────────────────────────────────────────────────────────
categories = ["Travel", "Catering", "Venue", "Stationery", "Equipment", "Training",
              "Marketing", "Utilities", "Professional Fees", "Other"]
for cat in categories:
    db.add(ExpenseCategory(organisation_id=org.id, name=cat, is_active=True))
print(f"  Expense categories: {len(categories)}")

# ── Donors ────────────────────────────────────────────────────────────────────
donors = [
    Donor(organisation_id=org.id, full_name="Mohammed Rashid", email="m.rashid@example.com",
          gift_aid_eligible=True, total_donated=Decimal("750"), source="stripe"),
    Donor(organisation_id=org.id, full_name="Fatima Adeniji", email="f.adeniji@example.com",
          gift_aid_eligible=True, total_donated=Decimal("300"), source="paypal"),
    Donor(organisation_id=org.id, full_name="Tunde Okonkwo", email="t.okonkwo@example.com",
          gift_aid_eligible=True, total_donated=Decimal("150"), source="bank_transfer"),
    Donor(organisation_id=org.id, full_name="Anonymous", is_anonymous=True,
          gift_aid_eligible=False, total_donated=Decimal("100"), source="stripe"),
]
for d in donors:
    db.add(d)

campaign = DonationCampaign(
    organisation_id=org.id, name="Youth Connect Fundraiser",
    description="Support our youth mentoring programme",
    target_amount=Decimal("10000"), raised_amount=Decimal("4240"),
)
db.add(campaign)
print(f"  Donors: {len(donors)} + 1 campaign")

db.commit()
print("\n✅ Seed complete. Harvest Touch CIC is ready.")
print("\nLogin credentials:")
print("  CFO:       dominic@harvesttouch.org.uk / Admin1234!")
print("  Finance:   kemi@harvesttouch.org.uk    / Staff1234!")
print("  Programme: amina@harvesttouch.org.uk   / Staff1234!")
db.close()
