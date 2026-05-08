#!/usr/bin/env python3
"""
E2E Smoke Test — Realtouch Financial ERP
Run against a live server: python scripts/smoke_test.py [base_url]
Defaults to http://localhost:8000
"""
import sys
import json
import time
import requests
from datetime import datetime

BASE_URL = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else "http://localhost:8000"
EMAIL = "smoke.test@harvesttouch.org.uk"
PASSWORD = "SmokeTest1234!"
PASS_COUNT = 0
FAIL_COUNT = 0


def check(name: str, condition: bool, detail: str = ""):
    global PASS_COUNT, FAIL_COUNT
    status = "✅ PASS" if condition else "❌ FAIL"
    print(f"  {status}  {name}" + (f" — {detail}" if detail and not condition else ""))
    if condition:
        PASS_COUNT += 1
    else:
        FAIL_COUNT += 1


def section(title: str):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


print(f"\n{'═' * 50}")
print(f"  Realtouch ERP Smoke Test")
print(f"  Target: {BASE_URL}")
print(f"  Time:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"{'═' * 50}")

# ── Health ────────────────────────────────────────────────────────────────────
section("1. Health Checks")
try:
    r = requests.get(f"{BASE_URL}/", timeout=10)
    check("Root endpoint", r.status_code == 200)
    check("App name present", "Realtouch" in r.json().get("name", ""))
except Exception as e:
    check("Root endpoint", False, str(e))

try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    check("Health endpoint", r.status_code == 200)
    check("Database status", r.json().get("database") != "error")
except Exception as e:
    check("Health endpoint", False, str(e))

# ── Auth ──────────────────────────────────────────────────────────────────────
section("2. Authentication")
token = None
try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": EMAIL, "full_name": "Smoke Test CFO",
        "password": PASSWORD, "role": "cfo", "organisation_slug": "smoke-test"
    }, timeout=10)
    check("Register user", r.status_code in (201, 400), f"status={r.status_code}")

    r = requests.post(f"{BASE_URL}/auth/login",
                      data={"username": EMAIL, "password": PASSWORD}, timeout=10)
    check("Login", r.status_code == 200)
    token = r.json().get("access_token")
    check("Token received", bool(token))
    check("Role is CFO", r.json().get("role") == "cfo")
except Exception as e:
    check("Auth flow", False, str(e))

if not token:
    print("\n⛔  No auth token — aborting remaining tests.")
    sys.exit(1)

H = {"Authorization": f"Bearer {token}"}

# ── Accounting ────────────────────────────────────────────────────────────────
section("3. Accounting")
try:
    r = requests.get(f"{BASE_URL}/accounting/accounts", headers=H, timeout=10)
    check("List accounts", r.status_code == 200)
    check("Returns list", isinstance(r.json(), list))

    r = requests.post(f"{BASE_URL}/accounting/accounts", headers=H, json={
        "code": f"SMOKE{int(time.time())}", "name": "Smoke Test Account", "account_type": "asset"
    }, timeout=10)
    check("Create account", r.status_code == 201)
    acc_id = r.json().get("id")
    check("Account ID returned", bool(acc_id))

    # Test unbalanced journal rejection
    r = requests.post(f"{BASE_URL}/accounting/journal-entry", headers=H, json={
        "description": "Bad entry", "date": datetime.now().isoformat(),
        "lines": [{"account_id": acc_id, "debit": 100, "credit": 0}]
    }, timeout=10)
    check("Unbalanced journal rejected", r.status_code == 400)

    r = requests.get(f"{BASE_URL}/accounting/summary", headers=H, timeout=10)
    check("Accounting summary", r.status_code == 200)
    check("Summary has total_cash", "total_cash" in r.json())
except Exception as e:
    check("Accounting", False, str(e))

# ── Grants ────────────────────────────────────────────────────────────────────
section("4. Grants")
grant_id = None
try:
    r = requests.get(f"{BASE_URL}/grants/summary", headers=H, timeout=10)
    check("Grants summary", r.status_code == 200)
    check("Summary structure", "active_grants" in r.json())

    r = requests.post(f"{BASE_URL}/grants", headers=H, json={
        "reference": f"SMOKE-{int(time.time())}", "name": "Smoke Test Grant",
        "funder": "Test Foundation", "amount_awarded": 10000,
        "start_date": "2025-01-01T00:00:00", "end_date": "2025-12-31T00:00:00"
    }, timeout=10)
    check("Create grant", r.status_code == 201)
    grant_id = r.json().get("id")

    r = requests.get(f"{BASE_URL}/grants", headers=H, timeout=10)
    check("List grants", r.status_code == 200)
    check("Grant in list", any(g["id"] == grant_id for g in r.json()) if grant_id else False)

    r = requests.get(f"{BASE_URL}/grants/{grant_id}", headers=H, timeout=10)
    check("Get single grant", r.status_code == 200)
except Exception as e:
    check("Grants", False, str(e))

# ── Expenses ──────────────────────────────────────────────────────────────────
section("5. Expenses")
try:
    r = requests.get(f"{BASE_URL}/expenses", headers=H, timeout=10)
    check("List expenses", r.status_code == 200)
    check("Expenses has items", "items" in r.json())

    r = requests.get(f"{BASE_URL}/expenses/summary", headers=H, timeout=10)
    check("Expense summary", r.status_code == 200)
    check("Has pending_count", "pending_count" in r.json())
except Exception as e:
    check("Expenses", False, str(e))

# ── Payroll ───────────────────────────────────────────────────────────────────
section("6. Payroll")
emp_id = None
try:
    r = requests.post(f"{BASE_URL}/payroll/employees", headers=H, json={
        "full_name": "Smoke Test Employee", "gross_salary": 1500.0,
        "contract_type": "full_time", "tax_code": "1257L"
    }, timeout=10)
    check("Create employee", r.status_code == 201)
    emp_id = r.json().get("id")

    r = requests.get(f"{BASE_URL}/payroll/employees", headers=H, timeout=10)
    check("List employees", r.status_code == 200)
    check("Employee in list", any(e["id"] == emp_id for e in r.json()) if emp_id else False)

    r = requests.get(f"{BASE_URL}/payroll/summary", headers=H, timeout=10)
    check("Payroll summary", r.status_code == 200)
    check("Has active_employees", "active_employees" in r.json())
except Exception as e:
    check("Payroll", False, str(e))

# ── Donations ─────────────────────────────────────────────────────────────────
section("7. Donations")
try:
    r = requests.post(f"{BASE_URL}/donations/donors", headers=H, json={
        "full_name": "Smoke Test Donor", "gift_aid_eligible": True
    }, timeout=10)
    check("Create donor", r.status_code == 201)
    donor_id = r.json().get("id")

    r = requests.get(f"{BASE_URL}/donations/gift-aid/summary", headers=H, timeout=10)
    check("Gift Aid summary", r.status_code == 200)
    check("Has total_claimable", "total_claimable" in r.json())
except Exception as e:
    check("Donations", False, str(e))

# ── Dashboard ─────────────────────────────────────────────────────────────────
section("8. Dashboard")
try:
    r = requests.get(f"{BASE_URL}/dashboard/financial-summary", headers=H, timeout=10)
    check("Financial summary", r.status_code == 200)
    check("Has cash_runway", "cash_runway_months" in r.json())

    r = requests.get(f"{BASE_URL}/dashboard/cashflow?months=6", headers=H, timeout=10)
    check("Cashflow 6 months", r.status_code == 200)
    check("Correct month count", len(r.json().get("data", [])) == 6)

    r = requests.get(f"{BASE_URL}/dashboard/grants", headers=H, timeout=10)
    check("Grants dashboard", r.status_code == 200)

    r = requests.get(f"{BASE_URL}/dashboard/donations", headers=H, timeout=10)
    check("Donations dashboard", r.status_code == 200)
except Exception as e:
    check("Dashboard", False, str(e))

# ── Results ───────────────────────────────────────────────────────────────────
total = PASS_COUNT + FAIL_COUNT
print(f"\n{'═' * 50}")
print(f"  Results: {PASS_COUNT}/{total} passed")
print(f"  {'✅ ALL TESTS PASSED' if FAIL_COUNT == 0 else f'❌ {FAIL_COUNT} FAILED'}")
print(f"{'═' * 50}\n")
sys.exit(0 if FAIL_COUNT == 0 else 1)
