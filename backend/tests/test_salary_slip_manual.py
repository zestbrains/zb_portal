"""Tests for salary slip guards (Mar-2026+ auto), needs_manual flow, and manual endpoint (year>=2000)."""
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


# ---------- Guards on /api/documents/salary-slip (auto) ----------
class TestSalarySlipAutoGuards:
    def test_before_mar_2026_feb(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 2}, headers=headers)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "March 2026" in detail
        assert "Manual Salary Slip" in detail

    def test_before_mar_2026_2025_dec(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2025, "month": 12}, headers=headers)
        assert r.status_code == 400, r.text
        assert "March 2026" in r.json().get("detail", "")

    def test_current_month_jul_2026(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 7}, headers=headers)
        assert r.status_code == 400
        assert "past months" in r.json().get("detail", "").lower()

    def test_future_year(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2027, "month": 1}, headers=headers)
        assert r.status_code == 400


# ---------- Auto-generation success ----------
class TestSalarySlipAutoGen:
    def test_milan_mar_2026(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 3}, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("letter_title") == "Salary Slip - Mar-2026"
        assert data.get("pdf_base64")

    def test_milan_jun_2026(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          json={"employee_id": "1", "year": 2026, "month": 6}, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("letter_title") == "Salary Slip - Jun-2026"
        assert data.get("pdf_base64")

    def test_sandwich_regression_jul_2026(self, headers):
        r = requests.get(f"{BASE_URL}/api/salary?year=2026&month=7", headers=headers)
        assert r.status_code == 200
        rows = r.json().get("salary_data", [])
        milan = next((x for x in rows if x.get("employee_id") == "1"), None)
        assert milan is not None
        assert float(milan.get("sandwich_days") or 0) == 4.0


# ---------- Manual endpoint (year>=2000) ----------
class TestSalarySlipManual:
    def _payload(self, year=2019, month=5):
        return {
            "employee_id": "1",
            "year": year,
            "month": month,
            "company": {"name": "ZESTBRAINS", "address": "Ahmedabad"},
            "employee": {"name": "OLD USER", "employee_id": "1",
                         "designation": "Developer", "department": "Tech",
                         "location": "Ahmedabad", "doj": "2019-01-01"},
            "working": [["Total Days", 31], ["Present", 22]],
            "earnings": [["BASIC", 5000, 5000], ["HRA", 2000, 2000], ["SP.ALL", 3000, 3000]],
            "deductions": [["P.T.", 200]],
            "totals": {"gross_income": 10000, "total_deduction": 200, "net_amount": 9800}
        }

    def test_manual_success_2019(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(2019, 5), headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("letter_title") == "Salary Slip - May-2019 (Manual)"
        pdf_b64 = data.get("pdf_base64", "")
        assert pdf_b64
        assert base64.b64decode(pdf_b64)[:4] == b"%PDF"

    def test_manual_year_below_2000(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(1999, 1), headers=headers)
        assert r.status_code == 400
        assert "2000" in r.json().get("detail", "")

    def test_manual_current_month(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(2026, 7), headers=headers)
        assert r.status_code == 400

    def test_manual_future_year(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(2027, 1), headers=headers)
        assert r.status_code == 400

    def test_manual_year_2015_allowed(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip/manual",
                          json=self._payload(2015, 6), headers=headers)
        assert r.status_code == 200, r.text
        assert r.json().get("letter_title") == "Salary Slip - Jun-2015 (Manual)"


# ---------- Regression ----------
class TestRegression:
    def test_offer_letter_generate(self, headers):
        r = requests.post(f"{BASE_URL}/api/documents/generate", json={
            "employee_id": "1", "letter_type": "offer_letter"
        }, headers=headers)
        assert r.status_code in (200, 400, 422)
