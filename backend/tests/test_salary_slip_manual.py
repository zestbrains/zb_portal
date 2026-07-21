"""Tests for salary slip past-month guards, needs_manual flow, and manual endpoint."""
import os
import base64
import pytest
import requests
from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "renish", "password": "Zb@0075588"
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Guards on /api/documents/salary-slip ----------
class TestSalarySlipGuards:
    def test_future_year(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2027, "month": 1}, headers=headers)
        assert r.status_code == 400
        assert "past months" in r.json().get("detail", "").lower()

    def test_current_month(self, headers):
        # server date Jul 9 2026 -> 2026-07 blocked
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 7}, headers=headers)
        assert r.status_code == 400
        assert "past months" in r.json().get("detail", "").lower()

    def test_year_before_2021(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2020, "month": 12}, headers=headers)
        assert r.status_code == 400
        assert "2021" in r.json().get("detail", "")


# ---------- Auto-generation ----------
class TestSalarySlipAutoGen:
    def test_milan_jun_2026(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 6}, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("needs_manual") is not True
        assert data.get("pdf_base64")
        assert len(data["pdf_base64"]) > 100
        assert data.get("letter_title") == "Salary Slip - Jun-2026"


# ---------- needs_manual (pre-joining) ----------
class TestSalarySlipNeedsManual:
    def test_milan_pre_joining_2022_01(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2022, "month": 1}, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("needs_manual") is True
        assert "2022-11-17" in data.get("message", "")
        prefill = data.get("prefill") or {}
        assert prefill.get("name") == "MILAN TANDEL"
        assert prefill.get("company_name")
        assert float(prefill.get("salary") or 0) > 0


# ---------- Manual endpoint ----------
class TestSalarySlipManual:
    def _payload(self, year=2022, month=1):
        return {
            "employee_id": "1",
            "year": year,
            "month": month,
            "company": {"name": "ZESTBRAINS", "address": "Ahmedabad"},
            "employee": {"name": "MILAN TANDEL", "employee_id": "1",
                         "designation": "Developer", "department": "Tech",
                         "location": "Ahmedabad", "doj": "2022-11-17"},
            "working": [["Total Days", 31], ["Present", 22]],
            "earnings": [["BASIC", 5000, 5000], ["HRA", 2000, 2000], ["SP.ALL", 3000, 3000]],
            "deductions": [["P.T.", 200]],
            "totals": {"gross_income": 10000, "total_deduction": 200, "net_amount": 9800}
        }

    def test_manual_success(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(), headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("letter_title") == "Salary Slip - Jan-2022 (Manual)"
        pdf_b64 = data.get("pdf_base64", "")
        assert pdf_b64
        raw = base64.b64decode(pdf_b64)
        assert raw[:4] == b"%PDF"

    def test_manual_future_year(self, headers):
        p = self._payload(year=2027, month=1)
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual", json=p, headers=headers)
        assert r.status_code == 400

    def test_manual_pre_2021(self, headers):
        p = self._payload(year=2020, month=6)
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual", json=p, headers=headers)
        assert r.status_code == 400

    def test_manual_current_month(self, headers):
        p = self._payload(year=2026, month=7)
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual", json=p, headers=headers)
        assert r.status_code == 400


# ---------- Regression: offer letter still works ----------
class TestRegression:
    def test_offer_letter_generate(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/generate", json={
            "employee_id": "1", "letter_type": "offer_letter"
        }, headers=headers)
        # Accept 200 (success) or 400 (missing required fields); NOT 500
        assert r.status_code in (200, 400), f"unexpected {r.status_code}: {r.text}"

    def test_sandwich_still_intact_milan_jul_2026(self, headers):
        r = requests.get(f"{BASE_URL}/api/salary?year=2026&month=7", headers=headers)
        assert r.status_code == 200, r.text
        rows = r.json().get("salary_data", [])
        milan = next((x for x in rows if x.get("employee_id") == "1"), None)
        assert milan is not None
        assert float(milan.get("sandwich_days") or 0) == 4.0
