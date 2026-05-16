"""
Realtouch Financial ERP — Test Suite
Run: pytest tests/ -v
"""
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# ── Test database setup ───────────────────────────────────────────────────────
TEST_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

from backend.core.database import Base, get_db
from backend.main import app

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def auth_headers(client):
    """Register and login, return auth headers."""
    client.post("/auth/register", json={
        "email": "test.cfo@harvesttouch.org.uk",
        "full_name": "Test CFO",
        "password": "TestPass1234!",
        "organisation_name": "Test Org",
        "organisation_type": "CIC",
        "country": "United Kingdom",
        "currency": "GBP",
    })
    res = client.post("/auth/login", data={
        "username": "test.cfo@harvesttouch.org.uk",
        "password": "TestPass1234!",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Health ────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_root(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Realtouch Financial ERP"
        assert data["status"] == "operational"

    def test_health(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert "status" in res.json()


# ── Authentication ────────────────────────────────────────────────────────────

class TestAuth:
    def test_register(self, client):
        res = client.post("/auth/register", json={
            "email": "newuser@test.com",
            "full_name": "New User",
            "password": "Password123!",
            "organisation_name": "New User Org",
            "organisation_type": "Company",
            "country": "United Kingdom",
            "currency": "GBP",
        })
        assert res.status_code == 201
        assert "access_token" in res.json()

    def test_register_duplicate_email(self, client):
        client.post("/auth/register", json={
            "email": "dup@test.com",
            "full_name": "Dup User",
            "password": "Password123!",
            "organisation_name": "Dup Org",
            "organisation_type": "Company",
            "country": "United Kingdom",
            "currency": "GBP",
        })
        res = client.post("/auth/register", json={
            "email": "dup@test.com",
            "full_name": "Dup User 2",
            "password": "Password123!",
            "organisation_name": "Dup Org Two",
            "organisation_type": "Company",
            "country": "United Kingdom",
            "currency": "GBP",
        })
        assert res.status_code == 400

    def test_login_success(self, client, auth_headers):
        assert "Authorization" in auth_headers
        assert auth_headers["Authorization"].startswith("Bearer ")

    def test_login_wrong_password(self, client):
        res = client.post("/auth/login", data={
            "username": "test.cfo@harvesttouch.org.uk",
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

    def test_get_me(self, client, auth_headers):
        res = client.get("/auth/me", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "test.cfo@harvesttouch.org.uk"
        assert data["role"] == "owner"

    def test_me_no_token(self, client):
        res = client.get("/auth/me")
        assert res.status_code == 401

    def test_google_auth_signup(self, client, monkeypatch):
        class FakeResponse:
            def __init__(self, status_code, payload):
                self.status_code = status_code
                self._payload = payload

            def json(self):
                return self._payload

        def fake_post(url, data=None, timeout=None):
            assert "oauth2.googleapis.com/token" in url
            return FakeResponse(200, {"access_token": "google-access-token"})

        def fake_get(url, headers=None, timeout=None):
            assert "userinfo" in url
            return FakeResponse(200, {
                "sub": "google-sub-123",
                "email": "google.user@example.com",
                "name": "Google User",
            })

        monkeypatch.setattr("backend.routers.auth.settings.GOOGLE_CLIENT_ID", "client-id")
        monkeypatch.setattr("backend.routers.auth.settings.GOOGLE_CLIENT_SECRET", "client-secret")
        monkeypatch.setattr("backend.routers.auth.httpx.post", fake_post)
        monkeypatch.setattr("backend.routers.auth.httpx.get", fake_get)

        res = client.post("/auth/google", json={
            "code": "auth-code",
            "redirect_uri": "http://localhost:3000/auth/google/callback",
            "organisation_name": "Google Org",
        })
        assert res.status_code == 200
        assert "access_token" in res.json()
        assert res.json()["email"] == "google.user@example.com"


class TestWorkspaceCleanup:
    def test_cleanup_demo_data_endpoint(self, client, auth_headers):
        from backend.models.employee import Employee
        from backend.models.ops import Volunteer, VolunteerHour, VolunteerAgreement, Trustee
        from backend.models.user import User

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "test.cfo@harvesttouch.org.uk").first()
            assert user is not None
            org_id = user.organisation_id

            db.add(Volunteer(organisation_id=org_id, name="Sarah Adebayo", role="Youth Mentor", programme="Youth Connect", hours="8h/wk", dbs="Enhanced", status="Active"))
            db.add(VolunteerHour(organisation_id=org_id, volunteer_name="Sarah Adebayo", week="W/E 15 Mar", logged="8.5h", approved="8.5h", value="GBP 97.75", status="Approved"))
            db.add(VolunteerAgreement(organisation_id=org_id, name="Sarah Adebayo", issued="01 Sep 2023", signed="03 Sep 2023", expires="Sep 2025", status="Active"))
            db.add(Trustee(organisation_id=org_id, name="Dominic Ogbuagu", role="Director / CFO", appointed="01 Apr 2022", status="Active", coi="None declared"))
            db.add(Employee(organisation_id=org_id, employee_number="EMP-0001", full_name="Dominic Ogbuagu", role_title="CFO / Director", contract_type="full_time", gross_salary=1800, is_active=True))
            db.commit()
        finally:
            db.close()

        res = client.post("/admin/workspace/cleanup-demo-data", headers=auth_headers)
        assert res.status_code == 200
        payload = res.json()
        assert payload["total_deleted"] >= 5
        assert payload["deleted"]["volunteers"] >= 1
        assert payload["deleted"]["employees"] >= 1


# ── Payroll Calculator (unit tests — no DB needed) ────────────────────────────

class TestPayrollCalculator:
    def test_basic_calculation(self):
        from backend.services.payroll_calculator import calculate_payslip
        result = calculate_payslip("Test Employee", gross_monthly=1800.0)
        assert result.gross_pay == Decimal("1800.00")
        assert result.net_pay > 0
        assert result.net_pay < result.gross_pay
        assert result.paye_tax >= 0
        assert result.employee_ni >= 0
        assert result.employer_ni >= 0

    def test_below_personal_allowance_no_tax(self):
        from backend.services.payroll_calculator import calculate_monthly_paye
        # Annual salary of £12,000 — below personal allowance £12,570
        tax = calculate_monthly_paye(Decimal("12000"))
        assert tax == Decimal("0.00")

    def test_basic_rate_tax(self):
        from backend.services.payroll_calculator import calculate_monthly_paye
        # Annual £24,000 — should pay basic rate (20%) on £24000 - £12570 = £11,430
        annual_tax = calculate_monthly_paye(Decimal("24000")) * 12
        expected = (Decimal("24000") - Decimal("12570")) * Decimal("0.20")
        assert abs(annual_tax - expected) < Decimal("1.00")

    def test_higher_rate_tax(self):
        from backend.services.payroll_calculator import calculate_monthly_paye
        # Annual £60,000 — partly higher rate
        monthly = calculate_monthly_paye(Decimal("60000"))
        assert monthly > Decimal("800")  # Significant tax at higher rate

    def test_no_ni_below_threshold(self):
        from backend.services.payroll_calculator import calculate_monthly_employee_ni
        # Below primary threshold (£12,570 annual = £1,047.50/month)
        ni = calculate_monthly_employee_ni(Decimal("900"))
        assert ni == Decimal("0.00")

    def test_pension_calculation(self):
        from backend.services.payroll_calculator import calculate_pension
        emp_pension, er_pension, assessment = calculate_pension(
            Decimal("2000"),
            employee_rate=Decimal("5.0"),
            employer_rate=Decimal("3.0"),
        )
        assert emp_pension > 0
        assert er_pension > 0
        assert assessment["eligible"] is True
        assert emp_pension > er_pension  # Employee contributes more

    def test_employer_ni_secondary_threshold(self):
        from backend.services.payroll_calculator import calculate_monthly_employer_ni
        # Below secondary threshold (£9,100 / 12 = £758/month)
        ni = calculate_monthly_employer_ni(Decimal("700"))
        assert ni == Decimal("0.00")

    def test_full_payslip_net_pay_positive(self):
        from backend.services.payroll_calculator import calculate_payslip
        result = calculate_payslip("High Earner", gross_monthly=5000.0)
        assert result.net_pay > 0
        # Net pay should be roughly 65-75% of gross for this level
        ratio = float(result.net_pay / result.gross_pay)
        assert 0.55 < ratio < 0.80

    def test_employer_cost_exceeds_gross(self):
        from backend.services.payroll_calculator import calculate_payslip
        result = calculate_payslip("Employee", gross_monthly=1500.0)
        assert result.employer_total_cost > result.gross_pay

    def test_zero_pension_below_qualifying(self):
        from backend.services.payroll_calculator import calculate_pension
        # Below lower qualifying earnings threshold (£6,240 annual = £520/month)
        emp, er, assessment = calculate_pension(Decimal("400"))
        assert emp == Decimal("0.00")
        assert er == Decimal("0.00")
        assert assessment["eligible"] is False


# ── Accounting ────────────────────────────────────────────────────────────────

    def test_scottish_tax_calculation(self):
        from backend.services.payroll_calculator import calculate_monthly_paye
        scottish = calculate_monthly_paye(Decimal("45000"), tax_code="S1257L")
        rest_uk = calculate_monthly_paye(Decimal("45000"), tax_code="1257L")
        assert scottish != rest_uk

    def test_student_loan_plan_1_and_postgraduate(self):
        from backend.services.payroll_calculator import calculate_payslip
        result = calculate_payslip(
            "Loan Employee",
            gross_monthly=3000.0,
            student_loan_plan="plan1",
            postgraduate_loan=True,
        )
        assert result.student_loan > Decimal("0.00")
        assert result.postgraduate_loan > Decimal("0.00")

    def test_director_ni_supported(self):
        from backend.services.payroll_calculator import calculate_payslip
        result = calculate_payslip("Director", gross_monthly=4000.0, director_ni=True)
        assert result.employee_ni > Decimal("0.00")

class TestAccounting:
    def test_list_accounts_authenticated(self, client, auth_headers):
        res = client.get("/accounting/accounts", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_create_account(self, client, auth_headers):
        res = client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "9999",
            "name": "Test Account",
            "account_type": "asset",
            "description": "Created in tests",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["code"] == "9999"

    def test_create_duplicate_account_code(self, client, auth_headers):
        client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "8888", "name": "Dup Account", "account_type": "asset",
        })
        res = client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "8888", "name": "Dup Account 2", "account_type": "asset",
        })
        assert res.status_code == 400

    def test_list_transactions(self, client, auth_headers):
        res = client.get("/accounting/transactions", headers=auth_headers)
        assert res.status_code == 200
        assert "items" in res.json()
        assert "total" in res.json()

    def test_create_balanced_journal_entry(self, client, auth_headers):
        # First create two accounts
        acc1 = client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "7771", "name": "Test Asset", "account_type": "asset",
        })
        acc2 = client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "7772", "name": "Test Income", "account_type": "income",
        })
        a1_id = acc1.json()["id"]
        a2_id = acc2.json()["id"]

        res = client.post("/accounting/journal-entry", headers=auth_headers, json={
            "description": "Test journal entry",
            "date": "2025-03-15T00:00:00",
            "source": "manual",
            "lines": [
                {"account_id": a1_id, "debit": 1000.00, "credit": 0},
                {"account_id": a2_id, "debit": 0, "credit": 1000.00},
            ],
        })
        assert res.status_code == 201
        assert res.json()["status"] == "posted"

    def test_unbalanced_journal_rejected(self, client, auth_headers):
        acc = client.post("/accounting/accounts", headers=auth_headers, json={
            "code": "7773", "name": "Unbalanced Test", "account_type": "asset",
        })
        a_id = acc.json()["id"]
        res = client.post("/accounting/journal-entry", headers=auth_headers, json={
            "description": "Bad entry",
            "date": "2025-03-15T00:00:00",
            "lines": [
                {"account_id": a_id, "debit": 500.00, "credit": 0},
                {"account_id": a_id, "debit": 0, "credit": 400.00},
            ],
        })
        assert res.status_code == 400
        assert "balanced" in res.json()["detail"].lower()

    def test_accounting_summary(self, client, auth_headers):
        res = client.get("/accounting/summary", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_cash" in data
        assert "total_income_ytd" in data
        assert "total_expenses_ytd" in data


# ── Grants ────────────────────────────────────────────────────────────────────

class TestGrants:
    def test_list_grants(self, client, auth_headers):
        res = client.get("/grants", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_create_grant(self, client, auth_headers):
        res = client.post("/grants", headers=auth_headers, json={
            "reference": "TEST-2025",
            "name": "Test Grant Fund",
            "funder": "Test Foundation",
            "amount_awarded": 25000.00,
            "start_date": "2025-01-01T00:00:00",
            "end_date": "2025-12-31T00:00:00",
            "reporting_frequency": "quarterly",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["reference"] == "TEST-2025"

    def test_grants_summary(self, client, auth_headers):
        res = client.get("/grants/summary", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_awarded" in data
        assert "active_grants" in data


# ── Expenses ──────────────────────────────────────────────────────────────────

class TestExpenses:
    def test_list_expenses(self, client, auth_headers):
        res = client.get("/expenses", headers=auth_headers)
        assert res.status_code == 200
        assert "items" in res.json()

    def test_list_receipts(self, client, auth_headers):
        res = client.get("/expenses/receipts", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_expense_summary(self, client, auth_headers):
        res = client.get("/expenses/summary", headers=auth_headers)
        assert res.status_code == 200


# ── Payroll API ───────────────────────────────────────────────────────────────

class TestPayrollAPI:
    def test_list_employees(self, client, auth_headers):
        res = client.get("/payroll/employees", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_create_employee(self, client, auth_headers):
        res = client.post("/payroll/employees", headers=auth_headers, json={
            "full_name": "Test Employee",
            "email": "test.emp@test.com",
            "role_title": "Test Role",
            "national_insurance": "ZZ999999Z",
            "tax_code": "1257L",
            "contract_type": "full_time",
            "gross_salary": 2000.0,
            "pension_enrolled": True,
        })
        assert res.status_code == 201
        assert res.json()["full_name"] == "Test Employee"

    def test_list_payroll_runs(self, client, auth_headers):
        res = client.get("/payroll/runs", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_run_lock_submit_and_bacs(self, client, auth_headers):
        client.post("/payroll/employees", headers=auth_headers, json={
            "full_name": "Run Employee",
            "email": "run.emp@test.com",
            "role_title": "Analyst",
            "national_insurance": "ZZ999999Y",
            "tax_code": "1257L",
            "ni_category": "A",
            "contract_type": "full_time",
            "gross_salary": 2500.0,
            "pension_enrolled": True,
            "student_loan_plan": "plan2",
        })
        run_res = client.post("/payroll/run", headers=auth_headers, json={
            "period_start": "2025-03-01T00:00:00",
            "period_end": "2025-03-31T23:59:59",
            "pay_date": "2025-03-28T00:00:00",
            "tax_period": 12,
            "tax_year": "2024-25",
        })
        assert run_res.status_code == 201
        run_id = run_res.json()["id"]
        assert run_res.json()["status"] == "draft"

        lock_res = client.post(f"/payroll/runs/{run_id}/lock", headers=auth_headers, json={})
        assert lock_res.status_code == 200
        assert lock_res.json()["status"] == "locked"

        fps_res = client.post(f"/payroll/runs/{run_id}/submit-fps", headers=auth_headers)
        assert fps_res.status_code == 200
        assert fps_res.json()["type"] == "FPS"

        bacs_res = client.get(f"/payroll/runs/{run_id}/bacs", headers=auth_headers)
        assert bacs_res.status_code == 200
        assert "HDR" in bacs_res.text

    def test_payroll_summary(self, client, auth_headers):
        res = client.get("/payroll/summary", headers=auth_headers)
        assert res.status_code == 200
        assert "active_employees" in res.json()


class TestIntegrations:
    def test_brevo_email_send(self, monkeypatch):
        from backend.services.email_service import send_email

        class FakeResponse:
            def raise_for_status(self):
                return None

        captured = {}

        def fake_post(url, headers=None, json=None, timeout=None):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

        monkeypatch.setattr("backend.services.email_service.settings.BREVO_API_KEY", "brevo-test-key")
        monkeypatch.setattr("backend.services.email_service.settings.EMAIL_FROM_ADDRESS", "noreply@example.com")
        monkeypatch.setattr("backend.services.email_service.httpx.post", fake_post)

        sent = send_email(
            to="recipient@example.com",
            subject="Test Email",
            body_html="<p>Hello</p>",
            org_name="Test Org",
        )
        assert sent is True
        assert captured["url"] == "https://api.brevo.com/v3/smtp/email"
        assert captured["json"]["to"][0]["email"] == "recipient@example.com"

    def test_openai_fallback_when_anthropic_fails(self, monkeypatch):
        from backend.services.ai_service import _call_llm

        monkeypatch.setattr("backend.core.settings.settings.ANTHROPIC_API_KEY", "anthropic-key", raising=False)
        monkeypatch.setattr("backend.core.settings.settings.OPENAI_API_KEY", "openai-key", raising=False)
        monkeypatch.setattr("backend.core.settings.settings.AI_ENABLE_OPENAI_FALLBACK", True, raising=False)

        def fail_anthropic(messages, system, max_tokens):
            raise RuntimeError("Anthropic unavailable")

        def use_openai(messages, system, max_tokens):
            return "OpenAI fallback response"

        monkeypatch.setattr("backend.services.ai_service._call_anthropic", fail_anthropic)
        monkeypatch.setattr("backend.services.ai_service._call_openai", use_openai)

        result = _call_llm([{"role": "user", "content": "hello"}], "system", 100)
        assert result == "OpenAI fallback response"

    def test_placeholder_keys_are_not_treated_as_configured(self, monkeypatch):
        from backend.services.ai_service import _call_llm

        monkeypatch.setattr("backend.core.settings.settings.ANTHROPIC_API_KEY", "sk-your-anthropic-key-here", raising=False)
        monkeypatch.setattr("backend.core.settings.settings.OPENAI_API_KEY", "sk-your-openai-key-here", raising=False)
        monkeypatch.setattr("backend.core.settings.settings.AI_ENABLE_OPENAI_FALLBACK", True, raising=False)

        with pytest.raises(RuntimeError, match="No usable AI provider is configured"):
            _call_llm([{"role": "user", "content": "hello"}], "system", 100)


# ── Donations ─────────────────────────────────────────────────────────────────

class TestDonations:
    def test_list_donations(self, client, auth_headers):
        res = client.get("/donations", headers=auth_headers)
        assert res.status_code == 200
        assert "items" in res.json()

    def test_create_donor(self, client, auth_headers):
        res = client.post("/donations/donors", headers=auth_headers, json={
            "full_name": "John Donor",
            "email": "john@example.com",
            "gift_aid_eligible": True,
            "source": "stripe",
        })
        assert res.status_code == 201
        assert res.json()["full_name"] == "John Donor"

    def test_gift_aid_summary(self, client, auth_headers):
        res = client.get("/donations/gift-aid/summary", headers=auth_headers)
        assert res.status_code == 200
        assert "total_claimable" in res.json()

    def test_list_campaigns(self, client, auth_headers):
        res = client.get("/donations/campaigns", headers=auth_headers)
        assert res.status_code == 200

    def test_create_campaign(self, client, auth_headers):
        res = client.post("/donations/campaigns", headers=auth_headers, json={
            "name": "Summer Fundraiser",
            "description": "Annual summer appeal",
            "target_amount": 5000.0,
        })
        assert res.status_code == 201
        assert res.json()["name"] == "Summer Fundraiser"


# ── Dashboard ─────────────────────────────────────────────────────────────────

class TestDashboard:
    def test_financial_summary(self, client, auth_headers):
        res = client.get("/dashboard/financial-summary", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_cash" in data
        assert "cash_runway_months" in data

    def test_cashflow(self, client, auth_headers):
        res = client.get("/dashboard/cashflow?months=6", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert len(data["data"]) == 6

    def test_grants_dashboard(self, client, auth_headers):
        res = client.get("/dashboard/grants", headers=auth_headers)
        assert res.status_code == 200
        assert "grants" in res.json()

    def test_donations_dashboard(self, client, auth_headers):
        res = client.get("/dashboard/donations", headers=auth_headers)
        assert res.status_code == 200
        assert "ytd_total" in res.json()


# ── OCR Service (unit tests) ──────────────────────────────────────────────────

class TestOCRService:
    def test_extract_amount_gbp(self):
        from backend.services.ocr_service import extract_amount
        result = extract_amount("Total: £124.50\nThank you")
        assert result == Decimal("124.50")

    def test_extract_amount_total_keyword(self):
        from backend.services.ocr_service import extract_amount
        result = extract_amount("TOTAL DUE 89.99")
        assert result == Decimal("89.99")

    def test_extract_merchant_first_line(self):
        from backend.services.ocr_service import extract_merchant
        result = extract_merchant("TESCO STORES LTD\nDate: 12/03/2025\nTotal: £45.20")
        assert "TESCO" in result

    def test_guess_category_travel(self):
        from backend.services.ocr_service import guess_category
        assert guess_category("National Rail London to Manchester") == "travel"

    def test_guess_category_catering(self):
        from backend.services.ocr_service import guess_category
        assert guess_category("Costa Coffee 2 x Latte") == "catering"

    def test_guess_category_venue(self):
        from backend.services.ocr_service import guess_category
        assert guess_category("Community Room Hire - Venue booking") == "venue"

    def test_extract_vat(self):
        from backend.services.ocr_service import extract_vat
        result = extract_vat("Subtotal: £100.00\nVAT: £20.00\nTotal: £120.00")
        assert result == Decimal("20.00")

    def test_extract_date(self):
        from backend.services.ocr_service import extract_date
        result = extract_date("Date: 15/03/2025\nReceipt No: 12345")
        assert result is not None
        assert result.day == 15
        assert result.month == 3
        assert result.year == 2025
class TestPlatform:
    def test_regulatory_frameworks(self, client, auth_headers):
        res = client.get("/platform/regulatory-frameworks", headers=auth_headers)
        assert res.status_code == 200
        jurisdictions = {item["jurisdiction"] for item in res.json()}
        assert "UK" in jurisdictions
        assert "Nigeria" in jurisdictions

    def test_update_workspace_regulatory_settings(self, client, auth_headers):
        res = client.post("/platform/workspace/regulatory", headers=auth_headers, json={
            "countries_of_operation": ["GB", "NG"],
            "active_regulatory_framework": "UK",
        })
        assert res.status_code == 200
        assert res.json()["countries_of_operation"] == ["GB", "NG"]

    def test_create_api_key(self, client, auth_headers):
        res = client.post("/platform/api-keys", headers=auth_headers, json={
            "name": "Payroll Integration",
            "scopes": ["employees:read", "payroll_runs:write"],
            "expires_in_days": 30,
        })
        assert res.status_code == 201
        assert res.json()["api_key"].startswith("nx1_")

    def test_create_webhook(self, client, auth_headers):
        res = client.post("/platform/webhooks", headers=auth_headers, json={
            "target_url": "https://example.com/webhooks/nexus",
            "events": ["payroll.finalised", "leave.approved"],
        })
        assert res.status_code == 201
        assert "signing_secret" in res.json()

    def test_employee_portal_notifications_and_payslips(self, client, auth_headers):
        from backend.models.employee import Employee
        from backend.models.user import User

        employee_res = client.post("/payroll/employees", headers=auth_headers, json={
            "full_name": "Portal Employee",
            "email": "test.cfo@harvesttouch.org.uk",
            "role_title": "Portal User",
            "national_insurance": "ZZ999999X",
            "tax_code": "1257L",
            "contract_type": "full_time",
            "gross_salary": 2200.0,
            "pension_enrolled": True,
        })
        assert employee_res.status_code == 201
        employee_id = employee_res.json()["id"]

        db = TestingSessionLocal()
        try:
            employee = db.query(Employee).filter(Employee.id == employee_id).first()
            user = db.query(User).filter(User.email == "test.cfo@harvesttouch.org.uk").first()
            employee.user_id = user.id
            db.commit()
        finally:
            db.close()

        note_res = client.post("/platform/employee-notifications", headers=auth_headers, json={
            "employee_id": employee_id,
            "title": "Payslip Available",
            "message": "Your monthly payslip is ready to download.",
            "category": "payroll",
        })
        assert note_res.status_code == 201

        run_res = client.post("/payroll/run", headers=auth_headers, json={
            "period_start": "2025-04-01T00:00:00",
            "period_end": "2025-04-30T23:59:59",
            "pay_date": "2025-04-28T00:00:00",
            "tax_period": 1,
            "tax_year": "2025-26",
        })
        assert run_res.status_code == 201

        me_res = client.get("/employee-portal/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["id"] == employee_id

        notifications_res = client.get("/employee-portal/notifications", headers=auth_headers)
        assert notifications_res.status_code == 200
        assert len(notifications_res.json()) >= 1

        payslips_res = client.get("/employee-portal/payslips", headers=auth_headers)
        assert payslips_res.status_code == 200
        assert len(payslips_res.json()) >= 1
