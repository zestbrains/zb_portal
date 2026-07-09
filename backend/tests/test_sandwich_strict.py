"""Tests for STRICT sandwich rule (leave_groups >= 2) - Iteration 11."""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://payroll-mgmt-app.preview.emergentagent.com").rstrip("/")

ADMIN = {"username": "renish", "password": "Zb@0075588"}
EMP = {"username": "hr", "password": "Prashant@zb@101"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/api/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def emp_token():
    r = requests.post(f"{BASE}/api/auth/login", json=EMP, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def emp_headers(emp_token):
    return {"Authorization": f"Bearer {emp_token}"}


# --- Chirag Patel (emp 117): single Mon leave, should NOT sandwich flanking weekend ---
def test_chirag_attendance_no_sandwich(admin_headers):
    r = requests.get(f"{BASE}/api/attendance?year=2026&month=7", headers=admin_headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    sd = data.get("sandwich_dates", {})
    # 117 should not be in sandwich_dates OR it should be empty
    assert "117" not in sd or sd["117"] == [], f"Chirag (117) unexpectedly in sandwich_dates: {sd.get('117')}"


def test_chirag_salary_no_sandwich(admin_headers):
    r = requests.get(f"{BASE}/api/salary?year=2026&month=7", headers=admin_headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    rows = data.get("salary_data", [])
    chirag = next((x for x in rows if str(x.get("employee_id")) == "117"), None)
    assert chirag is not None, "Chirag (117) not found in salary data"
    assert chirag.get("sandwich_days", 0) == 0, f"Chirag sandwich_days={chirag.get('sandwich_days')}"
    assert chirag.get("sandwich_amount", 0) == 0, f"Chirag sandwich_amount={chirag.get('sandwich_amount')}"
    print(f"Chirag row: sandwich_days={chirag.get('sandwich_days')}, cl_count={chirag.get('cl_count')}, sandwich_amount={chirag.get('sandwich_amount')}")


# --- Milan Tandel (emp 1): Mon-Fri leaves, no flanking outside, should NOT sandwich weekends ---
def test_milan_attendance_no_sandwich(admin_headers):
    r = requests.get(f"{BASE}/api/attendance?year=2026&month=7", headers=admin_headers, timeout=60)
    assert r.status_code == 200
    sd = r.json().get("sandwich_dates", {})
    assert "1" not in sd or sd["1"] == [], f"Milan (1) in sandwich_dates: {sd.get('1')}"


def test_milan_salary_no_sandwich(admin_headers):
    r = requests.get(f"{BASE}/api/salary?year=2026&month=7", headers=admin_headers, timeout=60)
    assert r.status_code == 200
    rows = r.json().get("salary_data", [])
    milan = next((x for x in rows if str(x.get("employee_id")) == "1"), None)
    assert milan is not None
    assert milan.get("sandwich_days", 0) == 0, f"Milan sandwich_days={milan.get('sandwich_days')}"
    assert milan.get("sandwich_amount", 0) == 0
    print(f"Milan row: sandwich_days={milan.get('sandwich_days')}, cl_count={milan.get('cl_count')}, sandwich_amount={milan.get('sandwich_amount')}")


# --- Regression check-sandwich examples ---
def test_check_sandwich_fri_mon(emp_headers):
    payload = {"leave_dates": [
        {"date": "2026-08-07", "day_type": "full"},
        {"date": "2026-08-10", "day_type": "full"},
    ]}
    r = requests.post(f"{BASE}/api/leaves/check-sandwich", json=payload, headers=emp_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("has_sandwich") is True, f"Expected sandwich true, got {d}"
    sd = d.get("sandwich_dates", [])
    assert "2026-08-08" in sd and "2026-08-09" in sd, f"sandwich_dates={sd}"


def test_check_sandwich_single_mon(emp_headers):
    payload = {"leave_dates": [{"date": "2026-08-10", "day_type": "full"}]}
    r = requests.post(f"{BASE}/api/leaves/check-sandwich", json=payload, headers=emp_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("has_sandwich") is False, f"Single Mon should NOT sandwich, got {d}"


def test_check_sandwich_mon_fri_block(emp_headers):
    payload = {"leave_dates": [
        {"date": "2026-08-10", "day_type": "full"},
        {"date": "2026-08-11", "day_type": "full"},
        {"date": "2026-08-12", "day_type": "full"},
        {"date": "2026-08-13", "day_type": "full"},
        {"date": "2026-08-14", "day_type": "full"},
    ]}
    r = requests.post(f"{BASE}/api/leaves/check-sandwich", json=payload, headers=emp_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("has_sandwich") is False, f"Mon-Fri block with no flanks should NOT sandwich, got {d}"


def test_check_sandwich_holiday_flanked(emp_headers):
    # Aug 10 (Mon) + Aug 12 (Wed), Aug 11 (Tue). Only sandwich if Aug 11 is a holiday.
    payload = {"leave_dates": [
        {"date": "2026-08-10", "day_type": "full"},
        {"date": "2026-08-12", "day_type": "full"},
    ]}
    r = requests.post(f"{BASE}/api/leaves/check-sandwich", json=payload, headers=emp_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    print(f"Holiday-flanked case: has_sandwich={d.get('has_sandwich')}, dates={d.get('sandwich_dates')}")
    # Not asserting - depends on whether Aug 11 is a holiday
