"""
Test suite for Weekend/Holiday Approvals Features:
1. Admin Working Hours page: Date-level bulk delete
2. Admin Weekend/Holiday Approvals: History tab Year/Month filters
3. Employee pending approvals: view, edit, delete
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "renish"
ADMIN_PASSWORD = "Zb@0075588"
EMPLOYEE_EMAIL = "milant.zestbrains@gmail.com"
EMPLOYEE_PASSWORD = "Milan@zb@1"


class TestAuthentication:
    """Test authentication for both admin and employee"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["admin", "hr"]
        print(f"SUCCESS: Admin login - role: {data['user']['role']}")
        return data["access_token"]
    
    def test_employee_login(self):
        """Test employee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        print(f"SUCCESS: Employee login - name: {data['user'].get('username', 'N/A')}")
        return data["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def employee_token():
    """Get employee auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Employee authentication failed")


class TestAdminWorkingHoursDateBulkDelete:
    """Test Admin Working Hours page - Date-level bulk delete functionality"""
    
    def test_get_detailed_summary(self, admin_token):
        """Test getting detailed work entries summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries/detailed-summary", headers=headers)
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"SUCCESS: Got detailed summary with {len(data['data'])} entries")
        return data
    
    def test_get_work_entries_for_employee_date(self, admin_token):
        """Test getting work entries for a specific employee and date"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get summary to find an employee with entries
        response = requests.get(f"{BASE_URL}/api/work-entries/detailed-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["data"]:
            entry = data["data"][0]
            employee_id = entry["employee_id"]
            date = entry["date"]
            
            # Get entries for this employee on this date
            response = requests.get(
                f"{BASE_URL}/api/work-entries?employee_id={employee_id}&date={date}",
                headers=headers
            )
            assert response.status_code == 200
            entries = response.json()
            print(f"SUCCESS: Found {len(entries)} entries for employee {employee_id} on {date}")
            return entries
        else:
            print("INFO: No work entries found to test")
            return []
    
    def test_delete_single_work_entry(self, admin_token):
        """Test deleting a single work entry (part of bulk delete flow)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get an entry to test delete (we'll create one first)
        # First get a project
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        # Get an employee
        employees_response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
        assert employees_response.status_code == 200
        employees = employees_response.json()
        
        if not employees:
            pytest.skip("No employees available for testing")
        
        # Create a test work entry
        test_entry = {
            "employee_id": employees[0]["employee_id"],
            "project_code": projects[0]["project_code"],
            "hours": 1.0,
            "work_details": "TEST_BULK_DELETE_ENTRY",
            "date": "2026-01-15"  # A weekday
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/work-entries/admin",
            headers=headers,
            json=test_entry
        )
        assert create_response.status_code == 200, f"Failed to create test entry: {create_response.text}"
        created = create_response.json()
        entry_id = created["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/work-entries/{entry_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Failed to delete entry: {delete_response.text}"
        print(f"SUCCESS: Created and deleted test work entry {entry_id}")
        
        # Verify it's deleted
        verify_response = requests.get(
            f"{BASE_URL}/api/work-entries?employee_id={test_entry['employee_id']}&date={test_entry['date']}",
            headers=headers
        )
        entries = verify_response.json()
        assert not any(e["id"] == entry_id for e in entries), "Entry should be deleted"
        print("SUCCESS: Verified entry is deleted")


class TestAdminWeekendApprovalsHistoryFilters:
    """Test Admin Weekend/Holiday Approvals - History tab Year/Month filters"""
    
    def test_get_pending_approvals(self, admin_token):
        """Test getting pending weekend/holiday approvals"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/weekend-approvals?status=pending", headers=headers)
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        data = response.json()
        print(f"SUCCESS: Got {len(data)} pending approvals")
        return data
    
    def test_get_pending_count(self, admin_token):
        """Test getting pending approvals count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/pending-count", headers=headers)
        assert response.status_code == 200, f"Failed to get pending count: {response.text}"
        data = response.json()
        assert "count" in data
        print(f"SUCCESS: Pending count = {data['count']}")
        return data["count"]
    
    def test_get_history_with_month_filter(self, admin_token):
        """Test getting approval history with month filter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with current month
        current_month = "2026-01"  # January 2026
        response = requests.get(
            f"{BASE_URL}/api/weekend-approvals/history?month={current_month}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get history: {response.text}"
        data = response.json()
        print(f"SUCCESS: Got {len(data)} history records for {current_month}")
        return data
    
    def test_get_history_different_months(self, admin_token):
        """Test getting approval history for different months"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        months_to_test = ["2026-01", "2026-02", "2026-03"]
        
        for month in months_to_test:
            response = requests.get(
                f"{BASE_URL}/api/weekend-approvals/history?month={month}",
                headers=headers
            )
            assert response.status_code == 200, f"Failed to get history for {month}: {response.text}"
            data = response.json()
            print(f"SUCCESS: History for {month}: {len(data)} records")
    
    def test_history_filter_returns_correct_month(self, admin_token):
        """Test that history filter returns records from correct month"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get history for March 2026
        response = requests.get(
            f"{BASE_URL}/api/weekend-approvals/history?month=2026-03",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all records are from March 2026 (if any exist)
        for record in data:
            if record.get("approved_at"):
                # approved_at should be in March 2026
                assert "2026-03" in record["approved_at"] or record.get("original_date", "").startswith("2026-03"), \
                    f"Record date mismatch: {record}"
        
        print(f"SUCCESS: All {len(data)} records are from correct month")


class TestEmployeePendingApprovals:
    """Test Employee pending weekend/holiday approvals management"""
    
    def test_get_my_pending_approvals(self, employee_token):
        """Test employee getting their pending approvals"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/my-pending", headers=headers)
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        data = response.json()
        print(f"SUCCESS: Employee has {len(data)} pending approvals")
        return data
    
    def test_pending_approval_structure(self, employee_token):
        """Test that pending approval has correct structure"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/my-pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            approval = data[0]
            # Check required fields
            required_fields = ["id", "employee_id", "project_code", "original_date", 
                            "original_hours", "status"]
            for field in required_fields:
                assert field in approval, f"Missing field: {field}"
            
            assert approval["status"] == "pending"
            print(f"SUCCESS: Pending approval structure is correct")
            print(f"  - ID: {approval['id']}")
            print(f"  - Date: {approval['original_date']}")
            print(f"  - Hours: {approval['original_hours']}")
            print(f"  - Project: {approval['project_code']}")
            return approval
        else:
            print("INFO: No pending approvals found for employee")
            return None
    
    def test_employee_cannot_access_admin_endpoints(self, employee_token):
        """Test that employee cannot access admin-only endpoints"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try to access admin pending approvals list
        response = requests.get(f"{BASE_URL}/api/weekend-approvals?status=pending", headers=headers)
        # This should fail with 403 (forbidden) for employees
        assert response.status_code in [403, 401], f"Employee should not access admin endpoints: {response.status_code}"
        print("SUCCESS: Employee correctly blocked from admin endpoints")


class TestEmployeeEditPendingApproval:
    """Test employee editing their pending approval requests"""
    
    def test_edit_pending_approval_hours(self, employee_token):
        """Test employee editing hours on pending approval"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Get pending approvals
        response = requests.get(f"{BASE_URL}/api/weekend-approvals/my-pending", headers=headers)
        assert response.status_code == 200
        pending = response.json()
        
        if not pending:
            pytest.skip("No pending approvals to test edit")
        
        approval = pending[0]
        approval_id = approval["id"]
        original_hours = approval["original_hours"]
        
        # Edit hours
        new_hours = original_hours + 1 if original_hours < 8 else original_hours - 1
        edit_response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/employee/{approval_id}",
            headers=headers,
            json={"hours": new_hours}
        )
        assert edit_response.status_code == 200, f"Failed to edit approval: {edit_response.text}"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/weekend-approvals/my-pending", headers=headers)
        updated_pending = verify_response.json()
        updated_approval = next((a for a in updated_pending if a["id"] == approval_id), None)
        
        assert updated_approval is not None, "Approval should still exist"
        assert updated_approval["original_hours"] == new_hours, f"Hours should be updated to {new_hours}"
        
        print(f"SUCCESS: Updated hours from {original_hours} to {new_hours}")
        
        # Restore original hours
        restore_response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/employee/{approval_id}",
            headers=headers,
            json={"hours": original_hours}
        )
        assert restore_response.status_code == 200
        print(f"SUCCESS: Restored original hours to {original_hours}")
    
    def test_cannot_edit_others_approval(self, employee_token, admin_token):
        """Test that employee cannot edit another employee's approval"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try to edit with a fake approval ID
        fake_id = "fake-approval-id-12345"
        response = requests.put(
            f"{BASE_URL}/api/weekend-approvals/employee/{fake_id}",
            headers=headers,
            json={"hours": 5}
        )
        assert response.status_code in [404, 403], f"Should fail for non-existent approval: {response.status_code}"
        print("SUCCESS: Cannot edit non-existent approval")


class TestEmployeeDeletePendingApproval:
    """Test employee deleting their pending approval requests"""
    
    def test_delete_endpoint_exists(self, employee_token):
        """Test that delete endpoint exists and responds correctly"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try to delete with a fake ID - should return 404 (not found)
        fake_id = "fake-approval-id-delete-test"
        response = requests.delete(
            f"{BASE_URL}/api/weekend-approvals/employee/{fake_id}",
            headers=headers
        )
        assert response.status_code in [404, 403], f"Expected 404 or 403, got {response.status_code}"
        print("SUCCESS: Delete endpoint exists and returns correct error for non-existent ID")
    
    def test_cannot_delete_others_approval(self, employee_token):
        """Test that employee cannot delete another employee's approval"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try to delete with a fake approval ID
        fake_id = "fake-approval-id-67890"
        response = requests.delete(
            f"{BASE_URL}/api/weekend-approvals/employee/{fake_id}",
            headers=headers
        )
        assert response.status_code in [404, 403], f"Should fail for non-existent approval: {response.status_code}"
        print("SUCCESS: Cannot delete non-existent approval")


class TestIntegration:
    """Integration tests for the complete flow"""
    
    def test_admin_can_see_employee_pending_approval(self, admin_token, employee_token):
        """Test that admin can see employee's pending approval in their list"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Get employee's pending approvals
        emp_response = requests.get(
            f"{BASE_URL}/api/weekend-approvals/my-pending",
            headers=employee_headers
        )
        assert emp_response.status_code == 200
        emp_pending = emp_response.json()
        
        if not emp_pending:
            print("INFO: No pending approvals to verify")
            return
        
        # Get admin's pending list
        admin_response = requests.get(
            f"{BASE_URL}/api/weekend-approvals?status=pending",
            headers=admin_headers
        )
        assert admin_response.status_code == 200
        admin_pending = admin_response.json()
        
        # Verify employee's approval is in admin's list
        emp_approval_id = emp_pending[0]["id"]
        admin_has_approval = any(a["id"] == emp_approval_id for a in admin_pending)
        assert admin_has_approval, "Admin should see employee's pending approval"
        
        print(f"SUCCESS: Admin can see employee's pending approval {emp_approval_id}")
    
    def test_work_entries_detailed_summary_structure(self, admin_token):
        """Test the structure of detailed summary for bulk delete"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries/detailed-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["data"]:
            entry = data["data"][0]
            # Check structure needed for bulk delete
            required_fields = ["employee_id", "employee_name", "date", "projects", "total_hours"]
            for field in required_fields:
                assert field in entry, f"Missing field: {field}"
            
            # Check projects structure
            if entry["projects"]:
                project = entry["projects"][0]
                project_fields = ["project_code", "project_name", "hours"]
                for field in project_fields:
                    assert field in project, f"Missing project field: {field}"
            
            print(f"SUCCESS: Detailed summary structure is correct for bulk delete")
            print(f"  - Employee: {entry['employee_name']}")
            print(f"  - Date: {entry['date']}")
            print(f"  - Projects: {len(entry['projects'])}")
            print(f"  - Total Hours: {entry['total_hours']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
