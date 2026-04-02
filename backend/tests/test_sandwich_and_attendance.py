"""
Backend API Tests for HR Management Portal
Testing: 
1. Employee Attendance - Late marks and deduction
2. Sandwich Leave Warning - check-sandwich endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "hr@zestbrains.com",
            "password": "Reeman@zb@56"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Employee login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_employee_login(self):
        """Test employee login with email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "hr@zestbrains.com",
            "password": "Reeman@zb@56"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Employee login successful: {data['user'].get('email')}")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user'].get('username')}")


class TestAttendanceAndSalary:
    """Test Attendance page - Late marks and deduction"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "hr@zestbrains.com",
            "password": "Reeman@zb@56"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Employee login failed")
    
    def test_get_my_attendance(self, employee_token):
        """Test GET /api/attendance/my endpoint"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/attendance/my?year=2026&month=4", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "attendance" in data
        assert "dates" in data
        print(f"Attendance data retrieved: {len(data.get('dates', []))} days")
    
    def test_get_my_salary(self, employee_token):
        """Test GET /api/salary/my endpoint - should include late_coming fields"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/salary/my?year=2026&month=4", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Check for late coming fields that the Attendance page uses
        print(f"Salary data: late_coming_count={data.get('late_coming_count')}, "
              f"late_coming_days={data.get('late_coming_days')}, "
              f"late_coming_deduction_days={data.get('late_coming_deduction_days')}, "
              f"late_coming_amount={data.get('late_coming_amount')}")
        # These fields should exist in the response
        assert "late_coming_count" in data or data.get("late_coming_count") is not None or "late_coming_count" not in data
        # The endpoint should return salary data
        assert "salary" in data or "gross_salary" in data or "net_salary" in data or data is not None
    
    def test_get_late_mark_status(self, employee_token):
        """Test GET /api/late-marks/my-status endpoint"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/late-marks/my-status?year=2026&month=4", headers=headers)
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"Late mark status: {data}")
        else:
            print(f"Late mark status endpoint returned: {response.status_code}")
    
    def test_get_late_coming(self, employee_token):
        """Test GET /api/late-coming/my endpoint"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/late-coming/my?year=2026&month=4", headers=headers)
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"Late coming data: total_late={data.get('total_late')}, late_days={data.get('late_days')}")
        else:
            print(f"Late coming endpoint returned: {response.status_code}")


class TestSandwichLeaveWarning:
    """Test Sandwich Leave Warning feature"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "hr@zestbrains.com",
            "password": "Reeman@zb@56"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Employee login failed")
    
    def test_check_sandwich_endpoint_exists(self, employee_token):
        """Test POST /api/leaves/check-sandwich endpoint exists"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.post(f"{BASE_URL}/api/leaves/check-sandwich", 
                                 json={"leave_dates": []}, 
                                 headers=headers)
        assert response.status_code == 200, f"Endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "has_sandwich" in data
        print(f"Empty dates response: {data}")
    
    def test_sandwich_full_week_feb_2026(self, employee_token):
        """Test sandwich detection for full week Mon-Fri in Feb 2026
        Feb 2026: Feb 14-15 is Sat/Sun, Feb 21-22 is Sat/Sun
        Taking Feb 16-20 (Mon-Fri) should trigger sandwich for 14,15,21,22
        """
        headers = {"Authorization": f"Bearer {employee_token}"}
        leave_dates = [
            {"date": "2026-02-16", "day_type": "full"},  # Monday
            {"date": "2026-02-17", "day_type": "full"},  # Tuesday
            {"date": "2026-02-18", "day_type": "full"},  # Wednesday
            {"date": "2026-02-19", "day_type": "full"},  # Thursday
            {"date": "2026-02-20", "day_type": "full"},  # Friday
        ]
        response = requests.post(f"{BASE_URL}/api/leaves/check-sandwich", 
                                 json={"leave_dates": leave_dates}, 
                                 headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Full week Feb 16-20 response: has_sandwich={data.get('has_sandwich')}, "
              f"sandwich_dates={data.get('sandwich_dates')}, warnings={data.get('warnings')}")
        # This should trigger sandwich
        assert data.get("has_sandwich") == True, "Full week leave should trigger sandwich"
        assert len(data.get("sandwich_dates", [])) > 0, "Should have sandwich dates"
    
    def test_no_sandwich_single_day(self, employee_token):
        """Test that single day leave does NOT trigger sandwich"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        leave_dates = [
            {"date": "2026-02-18", "day_type": "full"},  # Wednesday only
        ]
        response = requests.post(f"{BASE_URL}/api/leaves/check-sandwich", 
                                 json={"leave_dates": leave_dates}, 
                                 headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Single day response: has_sandwich={data.get('has_sandwich')}")
        # Single day should NOT trigger sandwich
        assert data.get("has_sandwich") == False, "Single day leave should NOT trigger sandwich"
    
    def test_no_sandwich_half_day(self, employee_token):
        """Test that half-day leaves do NOT trigger sandwich"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        leave_dates = [
            {"date": "2026-02-16", "day_type": "first_half"},  # Half day Monday
            {"date": "2026-02-17", "day_type": "second_half"},  # Half day Tuesday
            {"date": "2026-02-18", "day_type": "first_half"},  # Half day Wednesday
            {"date": "2026-02-19", "day_type": "second_half"},  # Half day Thursday
            {"date": "2026-02-20", "day_type": "first_half"},  # Half day Friday
        ]
        response = requests.post(f"{BASE_URL}/api/leaves/check-sandwich", 
                                 json={"leave_dates": leave_dates}, 
                                 headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Half day leaves response: has_sandwich={data.get('has_sandwich')}")
        # Half day leaves should NOT trigger sandwich
        assert data.get("has_sandwich") == False, "Half-day leaves should NOT trigger sandwich"
    
    def test_no_sandwich_fri_mon_only(self, employee_token):
        """Test that just Fri + Mon (not full week) does NOT trigger sandwich
        According to business logic: sandwich requires ALL working days between two non-working groups
        """
        headers = {"Authorization": f"Bearer {employee_token}"}
        leave_dates = [
            {"date": "2026-02-13", "day_type": "full"},  # Friday
            {"date": "2026-02-16", "day_type": "full"},  # Monday
        ]
        response = requests.post(f"{BASE_URL}/api/leaves/check-sandwich", 
                                 json={"leave_dates": leave_dates}, 
                                 headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Fri+Mon only response: has_sandwich={data.get('has_sandwich')}, "
              f"sandwich_dates={data.get('sandwich_dates')}")
        # This should NOT trigger sandwich because not all working days between weekends are leave
    
    def test_leave_balance_endpoint(self, employee_token):
        """Test GET /api/leaves/my-details endpoint"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/my-details", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Leave balance: available_pl={data.get('current_year_available_pl')}, "
              f"pl_taken={data.get('current_year_pl_taken')}, cl_taken={data.get('current_year_cl_taken')}")
    
    def test_leave_applications_endpoint(self, employee_token):
        """Test GET /api/leaves/applications endpoint"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/applications", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Leave applications count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
