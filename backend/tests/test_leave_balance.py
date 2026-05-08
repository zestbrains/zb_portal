"""
Test Leave Balance API - GET /api/leaves/balance/{emp_id}
Tests the new endpoint that shows employee leave balance in approval dialog
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "renish"
ADMIN_PASSWORD = "Zb@0075588"


class TestLeaveBalanceAPI:
    """Tests for GET /api/leaves/balance/{emp_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_leave_balance_employee_1(self):
        """Test leave balance for employee 1 (Milan Tandel)"""
        response = self.session.get(f"{BASE_URL}/api/leaves/balance/1")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "employee_id" in data
        assert data["employee_id"] == "1"
        assert "employee_name" in data
        assert "available_pl" in data
        assert "current_month_pl" in data
        assert "current_month_cl" in data
        assert "pl_taken_year" in data
        assert "cl_taken_year" in data
        assert "leave_year_start" in data
        assert "leave_year_end" in data
        
        # Validate data types
        assert isinstance(data["available_pl"], (int, float))
        assert isinstance(data["current_month_pl"], (int, float))
        assert isinstance(data["current_month_cl"], (int, float))
        
        print(f"Employee 1 balance: available_pl={data['available_pl']}, current_month_pl={data['current_month_pl']}, current_month_cl={data['current_month_cl']}")
    
    def test_leave_balance_nonexistent_employee(self):
        """Test leave balance for non-existent employee returns 404"""
        response = self.session.get(f"{BASE_URL}/api/leaves/balance/99999")
        
        # Should return 404 for non-existent employee
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"404 response for non-existent employee: {data}")
    
    def test_leave_balance_response_structure(self):
        """Test that leave balance response has all required fields"""
        response = self.session.get(f"{BASE_URL}/api/leaves/balance/1")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = [
            "employee_id",
            "employee_name",
            "available_pl",
            "pl_taken_year",
            "cl_taken_year",
            "current_month_pl",
            "current_month_cl",
            "leave_year_start",
            "leave_year_end"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"All required fields present in response: {list(data.keys())}")
    
    def test_leave_balance_available_pl_calculation(self):
        """Test that available_pl is calculated correctly (16 - pl_taken_year)"""
        response = self.session.get(f"{BASE_URL}/api/leaves/balance/1")
        assert response.status_code == 200
        
        data = response.json()
        expected_available = 16 - data["pl_taken_year"]
        
        # Allow small floating point differences
        assert abs(data["available_pl"] - expected_available) < 0.01, \
            f"available_pl mismatch: got {data['available_pl']}, expected {expected_available}"
        
        print(f"Available PL calculation correct: 16 - {data['pl_taken_year']} = {data['available_pl']}")


class TestLeaveBalanceRegression:
    """Regression tests for admin attendance and sandwich dates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_admin_attendance_april_2026(self):
        """Regression: Admin attendance API works for April 2026"""
        response = self.session.get(f"{BASE_URL}/api/attendance?year=2026&month=4")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response has 'attendance' and 'employees' keys
        assert "attendance" in data or "employees" in data, f"Missing attendance data in response: {list(data.keys())}"
        employees_count = len(data.get("employees", []))
        print(f"Admin attendance April 2026: {employees_count} employees")
    
    def test_keval_sandwich_dates_march_2026(self):
        """Regression: Keval (emp 107) sandwich dates for March 2026"""
        response = self.session.get(f"{BASE_URL}/api/attendance?year=2026&month=3")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Find employee 107 (Keval)
        keval_data = None
        for emp in data.get("attendance_data", []):
            if emp.get("employee_id") == "107":
                keval_data = emp
                break
        
        if keval_data:
            sandwich_dates = keval_data.get("sandwich_dates", [])
            print(f"Keval (emp 107) March 2026 sandwich_dates: {sandwich_dates}")
            # Expected: [1, 4, 7, 8] based on iteration_5.json
            assert sandwich_dates == [1, 4, 7, 8], f"Unexpected sandwich_dates: {sandwich_dates}"
        else:
            print("Employee 107 (Keval) not found in attendance data - may be inactive")


class TestPendingLeaveApplications:
    """Test pending leave applications for approval dialog"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_pending_applications(self):
        """Test fetching pending leave applications"""
        response = self.session.get(f"{BASE_URL}/api/leaves/applications?status=pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"Pending leave applications: {len(data)}")
        for app in data[:3]:  # Print first 3
            print(f"  - Employee {app.get('employee_id')}: {app.get('from_date')} to {app.get('to_date')}")
    
    def test_get_all_applications(self):
        """Test fetching all leave applications"""
        response = self.session.get(f"{BASE_URL}/api/leaves/applications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Count by status
        pending = len([a for a in data if a.get("status") == "pending"])
        approved = len([a for a in data if a.get("status") == "approved"])
        rejected = len([a for a in data if a.get("status") == "rejected"])
        
        print(f"All applications: {len(data)} total (pending={pending}, approved={approved}, rejected={rejected})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
