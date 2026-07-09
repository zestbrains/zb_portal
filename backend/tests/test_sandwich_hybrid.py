"""Hybrid sandwich rule tests - Iteration 12"""
import os
import sys
import pytest
import requests

sys.path.insert(0, '/app/backend')
from server import _chain_triggers_sandwich

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
# Fallback: read frontend .env
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')


# ---------- Unit tests on helper ----------
@pytest.mark.parametrize("statuses,expected,label", [
    (['nonworking', 'nonworking', 'leave'], False, "Chirag [N,N,L]"),
    (['leave', 'nonworking', 'nonworking', 'leave'], True, "Ex1 [L,N,N,L]"),
    (['nonworking', 'nonworking', 'leave', 'nonworking', 'leave'], True, "Ex2"),
    (['nonworking', 'nonworking', 'leave', 'nonworking'], True, "Rule3 [N,N,L,N]"),
    (['nonworking', 'nonworking'] + ['leave']*5 + ['nonworking', 'nonworking'], True, "Milan"),
    (['leave', 'nonworking', 'nonworking'], False, "single block start"),
    (['nonworking', 'nonworking', 'leave', 'leave'], False, "single block end"),
    (['leave', 'nonworking', 'nonworking', 'leave', 'nonworking', 'nonworking', 'leave'], True, "3 blocks"),
    (['nonworking', 'nonworking'], False, "no leave"),
])
def test_chain_triggers_sandwich(statuses, expected, label):
    assert _chain_triggers_sandwich(statuses) == expected, f"{label}: {statuses}"


# ---------- Integration ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "renish", "password": "Zb@0075588"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def hr_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "hr", "password": "Prashant@zb@101"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


def test_chirag_no_sandwich_salary(admin_token):
    r = requests.get(f"{BASE_URL}/api/salary?year=2026&month=7", headers=_auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    rows = data.get("salary_data", [])
    chirag = next((x for x in rows if str(x.get("employee_id")) == "117"), None)
    assert chirag is not None, f"Chirag not found; ids sample: {[r.get('employee_id') for r in rows[:5]]}"
    assert chirag.get("sandwich_days", 0) == 0, chirag
    assert chirag.get("sandwich_amount", 0) == 0, chirag


def test_milan_sandwich_salary(admin_token):
    r = requests.get(f"{BASE_URL}/api/salary?year=2026&month=7", headers=_auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    rows = data.get("salary_data", [])
    milan = next((x for x in rows if str(x.get("employee_id")) == "1"), None)
    assert milan is not None
    assert milan.get("sandwich_days") == 4, milan
    assert abs(milan.get("sandwich_amount", 0) - 8387.10) < 5, milan


def test_attendance_sandwich_dates(admin_token):
    r = requests.get(f"{BASE_URL}/api/attendance?year=2026&month=7", headers=_auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    sd = data.get("sandwich_dates", {})
    assert "117" not in sd, f"Chirag should NOT be in sandwich_dates: {sd.get('117')}"
    assert "1" in sd, f"Milan missing from sandwich_dates. keys={list(sd.keys())[:20]}"
    milan_dates = sorted(sd["1"])
    assert milan_dates == [11, 12, 18, 19], milan_dates


# ---------- check-sandwich regressions ----------
def _cs(hr_token, dates):
    return requests.post(f"{BASE_URL}/api/leaves/check-sandwich",
                         headers=_auth(hr_token),
                         json={"leave_dates": dates}).json()


def test_cs_fri_mon(hr_token):
    r = _cs(hr_token, [{"date": "2026-08-07", "day_type": "full"},
                       {"date": "2026-08-10", "day_type": "full"}])
    assert r.get("has_sandwich") is True, r
    assert "2026-08-08" in r.get("sandwich_dates", [])
    assert "2026-08-09" in r.get("sandwich_dates", [])


def test_cs_milan_mon_fri(hr_token):
    dates = [{"date": f"2026-08-{d:02d}", "day_type": "full"} for d in [10, 11, 12, 13, 14]]
    r = _cs(hr_token, dates)
    assert r.get("has_sandwich") is True, r
    sd = set(r.get("sandwich_dates", []))
    assert {"2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"}.issubset(sd), sd


def test_cs_chirag_single_mon(hr_token):
    r = _cs(hr_token, [{"date": "2026-08-10", "day_type": "full"}])
    assert r.get("has_sandwich") is False, r


def test_cs_mon_tue(hr_token):
    r = _cs(hr_token, [{"date": "2026-08-10", "day_type": "full"},
                       {"date": "2026-08-11", "day_type": "full"}])
    assert r.get("has_sandwich") is False, r


def test_cs_thu_fri(hr_token):
    r = _cs(hr_token, [{"date": "2026-08-13", "day_type": "full"},
                       {"date": "2026-08-14", "day_type": "full"}])
    assert r.get("has_sandwich") is False, r


def test_cs_half_day(hr_token):
    r = _cs(hr_token, [{"date": "2026-08-10", "day_type": "first_half"}])
    assert r.get("has_sandwich") is False, r
