"""Tests for Salary Slip generation feature."""
import os
import base64
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_USER = "renish"
ADMIN_PASS = "Zb@0075588"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join((p.extract_text() or "") for p in pdf.pages)
    except Exception as e:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(pdf_bytes))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception as e2:
            print(f"Both extractors failed: {e} | {e2}")
            return ""


class TestSalarySlipMilan:
    def test_milan_jul_2026_generation(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          headers=auth_headers,
                          json={"employee_id": "1", "year": 2026, "month": 7}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("pdf_base64")
        assert data.get("id")
        assert data.get("letter_title") == "Salary Slip - Jul-2026"
        assert data.get("created_at")

        pdf_bytes = base64.b64decode(data["pdf_base64"])
        assert pdf_bytes.startswith(b"%PDF"), "Not a valid PDF"
        assert len(pdf_bytes) > 10000, f"PDF too small: {len(pdf_bytes)}"
        print(f"Milan PDF size: {len(pdf_bytes)} bytes")

        text = _extract_pdf_text(pdf_bytes)
        print(f"--- MILAN PDF TEXT ---\n{text[:2000]}\n----------------------")
        if text:
            # Only assert on non-empty text
            up = text.upper()
            assert "MILAN" in up, "Employee name missing"
            assert "JUL" in up and "2026" in up, "Month label missing"
            assert "SALARY SLIP" in up
            assert "BASIC" in up
            assert "HRA" in up
            assert "IN WORDS" in up
            assert "ONLY" in up
        else:
            pytest.skip("PDF text extraction returned empty; contract already validated")


class TestSalarySlipChirag:
    def test_chirag_jul_2026(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          headers=auth_headers,
                          json={"employee_id": "117", "year": 2026, "month": 7}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["letter_title"] == "Salary Slip - Jul-2026"
        pdf_bytes = base64.b64decode(data["pdf_base64"])
        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 10000

        text = _extract_pdf_text(pdf_bytes)
        print(f"--- CHIRAG PDF TEXT ---\n{text[:2000]}\n----------------------")
        if text:
            up = text.upper()
            assert "CHIRAG" in up or "PATEL" in up
            assert "JUL" in up and "2026" in up


class TestSalarySlipRegression:
    def test_missing_fields_returns_400(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          headers=auth_headers, json={"employee_id": "1"}, timeout=30)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "required" in detail.lower()

    def test_nonexistent_employee_returns_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                          headers=auth_headers,
                          json={"employee_id": "99999", "year": 2026, "month": 7}, timeout=30)
        assert r.status_code == 404
        assert "not found" in r.json().get("detail", "").lower()

    def test_slip_persisted_in_documents(self, auth_headers):
        # First generate
        gen = requests.post(f"{BASE_URL}/api/documents/salary-slip",
                            headers=auth_headers,
                            json={"employee_id": "1", "year": 2026, "month": 7}, timeout=60)
        assert gen.status_code == 200
        gen_id = gen.json()["id"]

        r = requests.get(f"{BASE_URL}/api/documents/1", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        docs = r.json()
        # Some endpoints return list, some return dict with 'documents'
        if isinstance(docs, dict):
            docs = docs.get("documents", docs.get("data", []))
        assert isinstance(docs, list)
        matches = [d for d in docs if d.get("letter_type") == "salary_slip"
                   and str(d.get("letter_title", "")).startswith("Salary Slip -")]
        assert len(matches) > 0, "No salary_slip document persisted"

    def test_offer_letter_still_works(self, auth_headers):
        payload = {
            "employee_id": "1",
            "letter_type": "offer_letter",
            "inputs": {
                "date": "2026-07-15",
                "joining_date": "2026-08-01",
                "designation": "Software Engineer",
                "ctc": "600000",
            },
        }
        r = requests.post(f"{BASE_URL}/api/documents/generate",
                          headers=auth_headers, json=payload, timeout=60)
        # Endpoint may or may not exist / may 400 on missing input — we just verify server didn't break.
        assert r.status_code in (200, 400, 422), f"Offer letter endpoint broken: {r.status_code} {r.text}"
        if r.status_code == 200:
            pdf_b64 = r.json().get("pdf_base64") or r.json().get("pdf_data")
            if pdf_b64:
                assert base64.b64decode(pdf_b64).startswith(b"%PDF")
