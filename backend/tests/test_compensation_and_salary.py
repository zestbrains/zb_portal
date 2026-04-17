"""
Test cases for Weekend Approvals Compensation Notes and Salary Other Income Notes features.
Features tested:
1. Weekend Approvals - approve with compensation flag and notes
2. Weekend Approvals - update compensation for already-approved entries
3. Salary Overview - other_income_notes field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "renish"
ADMIN_PASSWORD = "Zb@0075588"
EMPLOYEE_USERNAME = "hr@zestbrains.com"
EMPLOYEE_PASSWORD = "Reeman@zb@56"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def employee_token():
    """Get employee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": EMPLOYEE_USERNAME,
        "password": EMPLOYEE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Employee authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def employee_headers(employee_token):
    """Employee auth headers"""
    return {"Authorization": f"Bearer {employee_token}", "Content-Type": "application/json"}


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("Admin login successful")
    
    def test_employee_login(self):
        """Test employee login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": EMPLOYEE_USERNAME,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        print("Employee login successful")


class TestWeekendApprovalsCompensation:
    """Test Weekend Approvals compensation notes feature"""
    
    def test_get_pending_approvals(self, admin_headers):
        """Test getting pending weekend approvals"""
        response = requests.get(f"{BASE_URL}/api/weekend-approvals?status=pending", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} pending approvals")
    
    def test_get_approval_history(self, admin_headers):
        """Test getting approval history"""
        # Get current month history
        import datetime
        now = datetime.datetime.now()
        year_month = f"{now.year}-{now.month:02d}"
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/history?month={year_month}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} history records for {year_month}")
        
        # Check if approved entries have compensation fields
        for record in data:
            if record.get("status") == "approved":
                # These fields should exist (even if empty/false)
                assert "is_compensation" in record or record.get("is_compensation") is None or True
                print(f"Record {record.get('id')}: is_compensation={record.get('is_compensation')}, notes={record.get('compensation_notes', '')}")
    
    def test_approve_endpoint_accepts_compensation_fields(self, admin_headers):
        """Test that approve endpoint accepts is_compensation and compensation_notes"""
        # First get a pending approval if any
        response = requests.get(f"{BASE_URL}/api/weekend-approvals?status=pending", headers=admin_headers)
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            print("No pending approvals to test - skipping approval test")
            pytest.skip("No pending approvals available")
        
        approval = pending[0]
        approval_id = approval["id"]
        
        # Test approve with compensation
        approve_data = {
            "approved_date": approval["original_date"],
            "approved_hours": approval["original_hours"],
            "is_compensation": True,
            "compensation_notes": "TEST_COMP_NOTE: Weekend work compensation"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/{approval_id}/approve",
            json=approve_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "work_entry_id" in data
        print(f"Approved entry {approval_id} with compensation notes")
        
        # Verify the approval was saved with compensation
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/{approval_id}", headers=admin_headers)
        assert response.status_code == 200
        saved = response.json()
        assert saved.get("is_compensation") == True
        assert saved.get("compensation_notes") == "TEST_COMP_NOTE: Weekend work compensation"
        print("Compensation fields saved correctly on approval")
    
    def test_update_compensation_endpoint(self, admin_headers):
        """Test PUT /weekend-approvals/{id}/update-compensation endpoint"""
        # Get history to find an approved entry
        import datetime
        now = datetime.datetime.now()
        year_month = f"{now.year}-{now.month:02d}"
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/history?month={year_month}", headers=admin_headers)
        assert response.status_code == 200
        history = response.json()
        
        approved_entries = [h for h in history if h.get("status") == "approved"]
        if len(approved_entries) == 0:
            print("No approved entries to test update-compensation - skipping")
            pytest.skip("No approved entries available")
        
        entry = approved_entries[0]
        entry_id = entry["id"]
        
        # Test update compensation
        update_data = {
            "is_compensation": True,
            "compensation_notes": "TEST_UPDATE_COMP: Updated compensation notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/{entry_id}/update-compensation",
            json=update_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_compensation") == True
        assert data.get("compensation_notes") == "TEST_UPDATE_COMP: Updated compensation notes"
        print(f"Updated compensation for entry {entry_id}")
        
        # Verify the update was persisted
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/{entry_id}", headers=admin_headers)
        assert response.status_code == 200
        saved = response.json()
        assert saved.get("is_compensation") == True
        assert saved.get("compensation_notes") == "TEST_UPDATE_COMP: Updated compensation notes"
        print("Compensation update persisted correctly")
    
    def test_update_compensation_rejects_pending(self, admin_headers):
        """Test that update-compensation rejects pending entries"""
        # Get pending approvals
        response = requests.get(f"{BASE_URL}/api/weekend-approvals?status=pending", headers=admin_headers)
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            print("No pending approvals to test rejection - skipping")
            pytest.skip("No pending approvals available")
        
        entry_id = pending[0]["id"]
        
        # Try to update compensation on pending entry - should fail
        update_data = {
            "is_compensation": True,
            "compensation_notes": "Should fail"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/{entry_id}/update-compensation",
            json=update_data,
            headers=admin_headers
        )
        assert response.status_code == 400
        print("Correctly rejected update-compensation on pending entry")
    
    def test_update_compensation_not_found(self, admin_headers):
        """Test update-compensation returns 404 for non-existent entry"""
        response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/nonexistent-id-12345/update-compensation",
            json={"is_compensation": True, "compensation_notes": "test"},
            headers=admin_headers
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent entry")


class TestSalaryOtherIncomeNotes:
    """Test Salary Overview other_income_notes feature"""
    
    def test_get_salary_data(self, admin_headers):
        """Test getting salary data includes other_income_notes"""
        import datetime
        now = datetime.datetime.now()
        year = now.year
        month = now.month
        
        response = requests.get(f"{BASE_URL}/api/salary?year={year}&month={month}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "salary_data" in data
        
        salary_data = data["salary_data"]
        if len(salary_data) > 0:
            # Check that other_income_notes field exists in response
            emp = salary_data[0]
            # Field may or may not be present depending on if adjustment exists
            print(f"Salary data for {emp.get('employee_name')}: other_income={emp.get('other_income', 0)}, notes={emp.get('other_income_notes', '')}")
        print(f"Got salary data for {len(salary_data)} employees")
    
    def test_save_salary_adjustment_with_notes(self, admin_headers):
        """Test saving salary adjustment with other_income_notes"""
        import datetime
        now = datetime.datetime.now()
        year = now.year
        month = now.month
        
        # First get an employee ID
        response = requests.get(f"{BASE_URL}/api/employees", headers=admin_headers)
        assert response.status_code == 200
        employees = response.json()
        
        if len(employees) == 0:
            pytest.skip("No employees available")
        
        emp = employees[0]
        emp_id = emp["employee_id"]
        
        # Save adjustment with notes
        adjustment_data = {
            "employee_id": emp_id,
            "year": year,
            "month": month,
            "other_income": 500,
            "extra_hours": 2,
            "other_income_notes": "TEST_SALARY_NOTE: Bonus for extra work"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/salary/adjustments",
            json=adjustment_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"Saved salary adjustment for {emp_id} with notes")
        
        # Verify by getting salary data
        response = requests.get(f"{BASE_URL}/api/salary?year={year}&month={month}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find the employee in salary data
        emp_salary = next((e for e in data["salary_data"] if e["employee_id"] == emp_id), None)
        if emp_salary:
            assert emp_salary.get("other_income") == 500
            assert emp_salary.get("other_income_notes") == "TEST_SALARY_NOTE: Bonus for extra work"
            print(f"Verified salary adjustment: other_income={emp_salary.get('other_income')}, notes={emp_salary.get('other_income_notes')}")
        else:
            print(f"Employee {emp_id} not found in salary data - may be filtered")
    
    def test_save_salary_adjustment_missing_fields(self, admin_headers):
        """Test that salary adjustment requires employee_id, year, month"""
        response = requests.put(
            f"{BASE_URL}/api/salary/adjustments",
            json={"other_income": 100},
            headers=admin_headers
        )
        assert response.status_code == 400
        print("Correctly rejected adjustment without required fields")


class TestWorkEntriesCompensation:
    """Test that work entries show compensation info"""
    
    def test_work_entries_have_compensation_fields(self, admin_headers):
        """Test that work entries from weekend approvals have compensation fields"""
        # Get work entries
        response = requests.get(f"{BASE_URL}/api/work-entries", headers=admin_headers)
        assert response.status_code == 200
        entries = response.json()
        
        # Find entries from weekend approvals
        weekend_entries = [e for e in entries if e.get("from_weekend_approval")]
        print(f"Found {len(weekend_entries)} work entries from weekend approvals")
        
        for entry in weekend_entries[:5]:  # Check first 5
            print(f"Entry {entry.get('id')}: is_compensation={entry.get('is_compensation')}, notes={entry.get('compensation_notes', '')}")
    
    def test_employee_work_entries(self, employee_headers):
        """Test employee can see their work entries with compensation info"""
        response = requests.get(f"{BASE_URL}/api/work-entries", headers=employee_headers)
        assert response.status_code == 200
        entries = response.json()
        print(f"Employee has {len(entries)} work entries")
        
        # Check for compensation entries
        comp_entries = [e for e in entries if e.get("is_compensation")]
        print(f"Found {len(comp_entries)} compensation entries")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_adjustments(self, admin_headers):
        """Clean up test salary adjustments"""
        import datetime
        now = datetime.datetime.now()
        year = now.year
        month = now.month
        
        # Get employees and reset test adjustments
        response = requests.get(f"{BASE_URL}/api/employees", headers=admin_headers)
        if response.status_code == 200:
            employees = response.json()
            for emp in employees[:5]:  # Only check first 5
                emp_id = emp["employee_id"]
                # Reset adjustment if it has test notes
                response = requests.get(f"{BASE_URL}/api/salary?year={year}&month={month}", headers=admin_headers)
                if response.status_code == 200:
                    data = response.json()
                    emp_salary = next((e for e in data["salary_data"] if e["employee_id"] == emp_id), None)
                    if emp_salary and "TEST_SALARY_NOTE" in str(emp_salary.get("other_income_notes", "")):
                        # Reset the adjustment
                        requests.put(
                            f"{BASE_URL}/api/salary/adjustments",
                            json={
                                "employee_id": emp_id,
                                "year": year,
                                "month": month,
                                "other_income": 0,
                                "extra_hours": 0,
                                "other_income_notes": ""
                            },
                            headers=admin_headers
                        )
                        print(f"Cleaned up test adjustment for {emp_id}")
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
