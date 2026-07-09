"""
Backend tests for aggressive sandwich leave rule (iteration_9)

Rule change: if leave_groups >= 1 (was >= 2).
A weekend/holiday counts as sandwich if it is part of a consecutive
(leave|nonworking) chain that contains at least ONE full-day leave.

Scenarios verified:
 1) /api/salary Milan July 2026 -> sandwich_days = 4
 2) /api/attendance July 2026 -> sandwich_dates['1'] contains 11,12,18,19
 3) /api/salary/my for Milan (login) if possible
 4) /api/leaves/check-sandwich regressions
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MILAN_EMP_ID = '1'


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "renish", "password": "Zb@0075588"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def emp_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "hr", "password": "Prashant@zb@101"
    })
    assert r.status_code == 200, f"Employee login failed: {r.text}"
    return r.json().get("access_token")


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Milan salary/attendance verification ----------

class TestMilanSandwichJuly2026:
    def test_attendance_sandwich_dates(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/attendance?year=2026&month=7",
            headers=_h(admin_token))
        assert r.status_code == 200, r.text
        data = r.json()
        sandwich_map = data.get("sandwich_dates") or {}
        milan_sandwich = sandwich_map.get(MILAN_EMP_ID, [])
        print(f"Milan sandwich dates July 2026: {milan_sandwich}")
        for d in (11, 12, 18, 19):
            assert d in milan_sandwich, f"Missing sandwich day {d} for Milan. Got {milan_sandwich}"

    def test_salary_sandwich_days_and_cl(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/salary?year=2026&month=7",
            headers=_h(admin_token))
        assert r.status_code == 200, r.text
        data = r.json()
        # Response could be a list of employees or a dict
        rows = data.get("salary_data") if isinstance(data, dict) else data
        milan = None
        for row in rows:
            if str(row.get("employee_id")) == MILAN_EMP_ID:
                milan = row
                break
        assert milan is not None, "Milan not found in salary response"
        print(
            f"Milan July 2026 salary: sandwich_days={milan.get('sandwich_days')}, "
            f"cl_count={milan.get('cl_count')}, pl_count={milan.get('pl_count')}, "
            f"cl_amount={milan.get('cl_amount')}, sandwich_amount={milan.get('sandwich_amount')}"
        )
        assert milan.get("sandwich_days") == 4, (
            f"Expected sandwich_days=4 got {milan.get('sandwich_days')}")
        # CL/2 = 0.5 CL
        assert float(milan.get("cl_count") or 0) == pytest.approx(0.5, rel=0.01), (
            f"Expected cl_count=0.5 got {milan.get('cl_count')}")

    def test_salary_totals_consistency(self, admin_token):
        """gross = salary - (pt + esic + epf + cpf + cl_amount + sandwich_amount +
                  late_coming_amount + not_joined_amount) + ot_amount + other_income + extra_hours_amount
        """
        r = requests.get(
            f"{BASE_URL}/api/salary?year=2026&month=7",
            headers=_h(admin_token))
        assert r.status_code == 200
        rows = r.json().get("salary_data", [])
        milan = next((x for x in rows if str(x.get("employee_id")) == MILAN_EMP_ID), None)
        assert milan
        s = lambda k: float(milan.get(k) or 0)
        expected = (
            s("salary") - s("pt") - s("esic") - s("epf") - s("cpf")
            - s("cl_amount") - s("sandwich_amount") - s("late_coming_amount")
            - s("not_joined_amount") + s("ot_amount") + s("other_income")
            + s("extra_hours_amount")
        )
        gross = s("gross_salary")
        print(f"Expected gross={expected:.2f} actual gross={gross:.2f}")
        assert abs(expected - gross) < 1.0, (
            f"Salary math mismatch: expected {expected:.2f} vs gross {gross:.2f}")


# ---------- check-sandwich endpoint regressions ----------

class TestCheckSandwich:
    def test_mon_fri_full_week_aug_2026(self, emp_token):
        """Mon-Fri 10-14 Aug 2026 → sandwich for 8,9,15,16"""
        payload = {"leave_dates": [
            {"date": "2026-08-10", "day_type": "full"},
            {"date": "2026-08-11", "day_type": "full"},
            {"date": "2026-08-12", "day_type": "full"},
            {"date": "2026-08-13", "day_type": "full"},
            {"date": "2026-08-14", "day_type": "full"},
        ]}
        r = requests.post(f"{BASE_URL}/api/leaves/check-sandwich",
                          json=payload, headers=_h(emp_token))
        assert r.status_code == 200, r.text
        data = r.json()
        print(f"Mon-Fri Aug response: {data}")
        sd = set(data.get("sandwich_dates") or [])
        assert data.get("has_sandwich") is True
        for d in ("2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"):
            assert d in sd, f"Expected {d} in sandwich_dates, got {sd}"

    def test_fri_mon_only(self, emp_token):
        """Fri 7 + Mon 10 Aug -> Sat 8, Sun 9 sandwich"""
        payload = {"leave_dates": [
            {"date": "2026-08-07", "day_type": "full"},
            {"date": "2026-08-10", "day_type": "full"},
        ]}
        r = requests.post(f"{BASE_URL}/api/leaves/check-sandwich",
                          json=payload, headers=_h(emp_token))
        assert r.status_code == 200, r.text
        data = r.json()
        print(f"Fri+Mon response: {data}")
        sd = set(data.get("sandwich_dates") or [])
        assert data.get("has_sandwich") is True
        assert "2026-08-08" in sd
        assert "2026-08-09" in sd

    def test_single_half_day_no_sandwich(self, emp_token):
        payload = {"leave_dates": [
            {"date": "2026-08-10", "day_type": "first_half"},
        ]}
        r = requests.post(f"{BASE_URL}/api/leaves/check-sandwich",
                          json=payload, headers=_h(emp_token))
        assert r.status_code == 200
        data = r.json()
        print(f"Half day only: {data}")
        assert data.get("has_sandwich") is False

    def test_single_full_day_mon_triggers_prev_weekend(self, emp_token):
        """Aggressive rule: single Mon full-day leave still marks preceding Sat+Sun as sandwich."""
        payload = {"leave_dates": [
            {"date": "2026-08-10", "day_type": "full"},
        ]}
        r = requests.post(f"{BASE_URL}/api/leaves/check-sandwich",
                          json=payload, headers=_h(emp_token))
        assert r.status_code == 200
        data = r.json()
        print(f"Single Mon full-day: {data}")
        sd = set(data.get("sandwich_dates") or [])
        assert data.get("has_sandwich") is True
        assert "2026-08-08" in sd
        assert "2026-08-09" in sd


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
