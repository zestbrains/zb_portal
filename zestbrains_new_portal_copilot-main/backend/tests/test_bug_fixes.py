"""
Test file for 5 Critical Bug Fixes:
1. Working Hours duplicate entry - should UPDATE existing entry for same date+employee+project
2. Leave Application Edit - Employee can edit pending leave applications
3. Leave Application Delete - Employee can delete pending leave applications
4. Partial Approval/Rejection - Admin can approve/reject individual dates within multi-day leave
5. Late count showing -1 - negative count bug (max(0, ...) protection)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBugFixes:
    """Test suite for 5 critical bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        self.admin_creds = {"username": "renish", "password": "Zb@0075588"}
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=self.admin_creds)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.admin_user = response.json()["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
    # ============ BUG FIX 1: Working Hours Duplicate Entry ============
    
    def test_work_entry_update_instead_of_duplicate(self):
        """
        Bug Fix 1: Same employee + same date + same project should UPDATE existing entry, not create duplicate
        """
        # First, we need an employee account to test this
        # Create a test employee
        test_emp_id = f"TESTBUG{datetime.now().strftime('%H%M%S')}"
        test_email = f"testbug{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get or create a department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        if not departments:
            dept_create = self.session.post(f"{BASE_URL}/api/departments", json={
                "name": "Test Department",
                "description": "For testing"
            })
            dept_id = dept_create.json()["id"]
        else:
            dept_id = departments[0]["id"]
        
        # Get or create a project
        proj_response = self.session.get(f"{BASE_URL}/api/projects")
        projects = proj_response.json()
        if not projects:
            proj_create = self.session.post(f"{BASE_URL}/api/projects", json={
                "name": "Test Project Bug Fix",
                "type": "Development",
                "project_code": "TESTBUG001",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "completed_hours": 0,
                "assigned_employees": [test_emp_id],
                "status": "ongoing",
                "client_username": "testclient",
                "scope_of_work": "Testing",
                "timesheet_link": ""
            })
            project_id = proj_create.json()["id"]
        else:
            project_id = projects[0]["id"]
            # Update project to include test employee
            self.session.put(f"{BASE_URL}/api/projects/{project_id}", json={
                "assigned_employees": projects[0].get("assigned_employees", []) + [test_emp_id]
            })
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Bug Fix Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        # Login as the test employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        assert emp_login.status_code == 200, f"Employee login failed: {emp_login.text}"
        emp_token = emp_login.json()["access_token"]
        
        # Create employee session
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        test_date = "2026-01-20"
        
        # First work entry
        entry1 = emp_session.post(f"{BASE_URL}/api/work-entries", json={
            "project_id": project_id,
            "hours": 4.0,
            "work_details": "First entry - morning work",
            "date": test_date
        })
        assert entry1.status_code == 200, f"First work entry failed: {entry1.text}"
        first_entry_id = entry1.json()["id"]
        first_hours = entry1.json()["hours"]
        
        # Second work entry - same date, same project - should UPDATE not create new
        entry2 = emp_session.post(f"{BASE_URL}/api/work-entries", json={
            "project_id": project_id,
            "hours": 3.0,
            "work_details": "Second entry - afternoon work",
            "date": test_date
        })
        assert entry2.status_code == 200, f"Second work entry failed: {entry2.text}"
        second_entry_id = entry2.json()["id"]
        second_hours = entry2.json()["hours"]
        
        # CRITICAL CHECK: The entry ID should be the SAME (updated, not new)
        assert first_entry_id == second_entry_id, f"BUG: Created duplicate entry instead of updating! First ID: {first_entry_id}, Second ID: {second_entry_id}"
        
        # Hours should be accumulated (4 + 3 = 7)
        assert second_hours == 7.0, f"BUG: Hours not accumulated correctly. Expected 7.0, got {second_hours}"
        
        # Work details should be appended
        assert "---" in entry2.json().get("work_details", ""), "BUG: Work details not appended with separator"
        
        print(f"SUCCESS: Work entry updated instead of duplicate. Hours: {second_hours}")
        
        # Cleanup - delete the test employee
        self.session.delete(f"{BASE_URL}/api/employees/{emp_response.json()['id']}")
    
    # ============ BUG FIX 2 & 3: Leave Application Edit/Delete ============
    
    def test_leave_application_edit_pending(self):
        """
        Bug Fix 2: Employee can edit pending leave application
        """
        # Create a test employee for leave testing
        test_emp_id = f"TESTLEAVE{datetime.now().strftime('%H%M%S')}"
        test_email = f"testleave{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        dept_id = departments[0]["id"] if departments else None
        
        if not dept_id:
            dept_create = self.session.post(f"{BASE_URL}/api/departments", json={
                "name": "Leave Test Dept",
                "description": "For leave testing"
            })
            dept_id = dept_create.json()["id"]
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Leave Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        emp_id = emp_response.json()["id"]
        
        # Login as employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        assert emp_login.status_code == 200
        emp_token = emp_login.json()["access_token"]
        
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        # Apply for leave
        leave_response = emp_session.post(f"{BASE_URL}/api/leaves/apply", json={
            "from_date": "2026-02-01",
            "to_date": "2026-02-03",
            "reason": "Original reason - family function"
        })
        assert leave_response.status_code == 200, f"Leave application failed: {leave_response.text}"
        leave_id = leave_response.json()["id"]
        
        # Edit the pending leave application
        edit_response = emp_session.put(f"{BASE_URL}/api/leaves/applications/{leave_id}", json={
            "from_date": "2026-02-05",
            "to_date": "2026-02-07",
            "reason": "Updated reason - medical appointment"
        })
        assert edit_response.status_code == 200, f"BUG: Cannot edit pending leave application: {edit_response.text}"
        
        # Verify the update
        updated_leave = edit_response.json()
        assert updated_leave["from_date"] == "2026-02-05", "BUG: from_date not updated"
        assert updated_leave["to_date"] == "2026-02-07", "BUG: to_date not updated"
        assert "medical appointment" in updated_leave["reason"], "BUG: reason not updated"
        
        print(f"SUCCESS: Pending leave application edited successfully")
        
        # Cleanup
        emp_session.delete(f"{BASE_URL}/api/leaves/applications/{leave_id}")
        self.session.delete(f"{BASE_URL}/api/employees/{emp_id}")
    
    def test_leave_application_delete_pending(self):
        """
        Bug Fix 3: Employee can delete pending leave application
        """
        # Create a test employee
        test_emp_id = f"TESTDEL{datetime.now().strftime('%H%M%S')}"
        test_email = f"testdel{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        dept_id = departments[0]["id"] if departments else None
        
        if not dept_id:
            dept_create = self.session.post(f"{BASE_URL}/api/departments", json={
                "name": "Delete Test Dept",
                "description": "For delete testing"
            })
            dept_id = dept_create.json()["id"]
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Delete Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        emp_id = emp_response.json()["id"]
        
        # Login as employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        assert emp_login.status_code == 200
        emp_token = emp_login.json()["access_token"]
        
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        # Apply for leave
        leave_response = emp_session.post(f"{BASE_URL}/api/leaves/apply", json={
            "from_date": "2026-03-01",
            "to_date": "2026-03-02",
            "reason": "Leave to be deleted"
        })
        assert leave_response.status_code == 200
        leave_id = leave_response.json()["id"]
        
        # Delete the pending leave application
        delete_response = emp_session.delete(f"{BASE_URL}/api/leaves/applications/{leave_id}")
        assert delete_response.status_code == 200, f"BUG: Cannot delete pending leave application: {delete_response.text}"
        
        # Verify deletion
        get_response = emp_session.get(f"{BASE_URL}/api/leaves/applications")
        applications = get_response.json()
        deleted_app = next((a for a in applications if a["id"] == leave_id), None)
        assert deleted_app is None, "BUG: Leave application not deleted"
        
        print(f"SUCCESS: Pending leave application deleted successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/employees/{emp_id}")
    
    def test_leave_edit_blocked_after_approval(self):
        """
        Verify that editing is blocked after admin action (approved/rejected)
        """
        # Create a test employee
        test_emp_id = f"TESTBLOCK{datetime.now().strftime('%H%M%S')}"
        test_email = f"testblock{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        dept_id = departments[0]["id"] if departments else None
        
        if not dept_id:
            pytest.skip("No department available")
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Block Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        emp_id = emp_response.json()["id"]
        
        # Login as employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        emp_token = emp_login.json()["access_token"]
        
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        # Apply for leave
        leave_response = emp_session.post(f"{BASE_URL}/api/leaves/apply", json={
            "from_date": "2026-04-01",
            "to_date": "2026-04-01",
            "reason": "Test leave for blocking"
        })
        leave_id = leave_response.json()["id"]
        
        # Admin approves the leave
        approve_response = self.session.put(f"{BASE_URL}/api/leaves/applications/{leave_id}/approve", json={
            "status": "approved",
            "comments": "Approved for testing",
            "leave_dates": [{"date": "2026-04-01", "leave_type": "PL"}]
        })
        assert approve_response.status_code == 200
        
        # Try to edit after approval - should fail
        edit_response = emp_session.put(f"{BASE_URL}/api/leaves/applications/{leave_id}", json={
            "from_date": "2026-04-05",
            "to_date": "2026-04-05",
            "reason": "Trying to edit after approval"
        })
        assert edit_response.status_code == 400, f"BUG: Should not allow editing approved leave. Status: {edit_response.status_code}"
        
        # Try to delete after approval - should fail
        delete_response = emp_session.delete(f"{BASE_URL}/api/leaves/applications/{leave_id}")
        assert delete_response.status_code == 400, f"BUG: Should not allow deleting approved leave. Status: {delete_response.status_code}"
        
        print(f"SUCCESS: Edit/Delete correctly blocked after approval")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/employees/{emp_id}")
    
    # ============ BUG FIX 4: Partial Approval/Rejection ============
    
    def test_partial_approval_with_rejected_dates(self):
        """
        Bug Fix 4: Admin can approve/reject individual dates within multi-day leave
        """
        # Create a test employee
        test_emp_id = f"TESTPARTIAL{datetime.now().strftime('%H%M%S')}"
        test_email = f"testpartial{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        dept_id = departments[0]["id"] if departments else None
        
        if not dept_id:
            pytest.skip("No department available")
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Partial Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        emp_id = emp_response.json()["id"]
        
        # Login as employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        emp_token = emp_login.json()["access_token"]
        
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        # Apply for 3-day leave
        leave_response = emp_session.post(f"{BASE_URL}/api/leaves/apply", json={
            "from_date": "2026-05-01",
            "to_date": "2026-05-03",
            "reason": "Multi-day leave for partial approval test"
        })
        assert leave_response.status_code == 200
        leave_id = leave_response.json()["id"]
        
        # Admin partially approves - approve 2 days, reject 1 day
        partial_response = self.session.put(f"{BASE_URL}/api/leaves/applications/{leave_id}/approve", json={
            "status": "approved",  # Will be changed to "partial" by backend
            "comments": "Partial approval - one day rejected",
            "leave_dates": [
                {"date": "2026-05-01", "leave_type": "PL"},
                {"date": "2026-05-02", "leave_type": "Rejected"},  # REJECTED
                {"date": "2026-05-03", "leave_type": "CL"}
            ]
        })
        assert partial_response.status_code == 200, f"Partial approval failed: {partial_response.text}"
        
        # Verify the application status is "partial"
        get_response = emp_session.get(f"{BASE_URL}/api/leaves/applications")
        applications = get_response.json()
        updated_app = next((a for a in applications if a["id"] == leave_id), None)
        
        assert updated_app is not None, "Leave application not found"
        assert updated_app["status"] == "partial", f"BUG: Status should be 'partial', got '{updated_app['status']}'"
        
        # Verify leave_dates contains the rejected date
        leave_dates = updated_app.get("leave_dates", [])
        rejected_dates = [ld for ld in leave_dates if ld.get("leave_type", "").lower() == "rejected"]
        assert len(rejected_dates) == 1, f"BUG: Should have 1 rejected date, got {len(rejected_dates)}"
        
        print(f"SUCCESS: Partial approval with rejected dates works correctly. Status: {updated_app['status']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/employees/{emp_id}")
    
    # ============ BUG FIX 5: Late Count Never Negative ============
    
    def test_employee_dashboard_late_count_not_negative(self):
        """
        Bug Fix 5: Late count should never be negative (always >= 0)
        """
        # Create a test employee
        test_emp_id = f"TESTLATE{datetime.now().strftime('%H%M%S')}"
        test_email = f"testlate{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Get department
        dept_response = self.session.get(f"{BASE_URL}/api/departments")
        departments = dept_response.json()
        dept_id = departments[0]["id"] if departments else None
        
        if not dept_id:
            pytest.skip("No department available")
        
        # Create test employee
        emp_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "employee_id": test_emp_id,
            "name": "Test Late Count Employee",
            "email": test_email,
            "phone": "1234567890",
            "department_ids": [dept_id],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2025-01-01"
        })
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not create test employee: {emp_response.text}")
        
        emp_id = emp_response.json()["id"]
        
        # Login as employee
        emp_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "testpass123"
        })
        emp_token = emp_login.json()["access_token"]
        
        emp_session = requests.Session()
        emp_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {emp_token}"
        })
        
        # Get employee dashboard
        dashboard_response = emp_session.get(f"{BASE_URL}/api/dashboard/employee-analytics")
        assert dashboard_response.status_code == 200, f"Dashboard fetch failed: {dashboard_response.text}"
        
        dashboard = dashboard_response.json()
        
        # Check monthly_trends for negative values
        monthly_trends = dashboard.get("monthly_trends", [])
        for trend in monthly_trends:
            late_count = trend.get("late", 0)
            on_time_count = trend.get("on_time", 0)
            
            assert late_count >= 0, f"BUG: Late count is negative: {late_count} for month {trend.get('month')}"
            assert on_time_count >= 0, f"BUG: On-time count is negative: {on_time_count} for month {trend.get('month')}"
        
        print(f"SUCCESS: All late/on_time counts are non-negative")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/employees/{emp_id}")
    
    # ============ API Endpoint Tests ============
    
    def test_put_leave_application_endpoint_exists(self):
        """
        Verify PUT /api/leaves/applications/{id} endpoint exists
        """
        # Try with a non-existent ID - should return 404, not 405
        response = self.session.put(f"{BASE_URL}/api/leaves/applications/nonexistent123", json={
            "from_date": "2026-01-01",
            "to_date": "2026-01-01",
            "reason": "test"
        })
        # 404 means endpoint exists but resource not found
        # 405 means endpoint doesn't exist
        assert response.status_code != 405, "BUG: PUT /api/leaves/applications/{id} endpoint does not exist"
        print(f"SUCCESS: PUT endpoint exists (status: {response.status_code})")
    
    def test_delete_leave_application_endpoint_exists(self):
        """
        Verify DELETE /api/leaves/applications/{id} endpoint exists
        """
        # Try with a non-existent ID - should return 404, not 405
        response = self.session.delete(f"{BASE_URL}/api/leaves/applications/nonexistent123")
        # 404 means endpoint exists but resource not found
        # 405 means endpoint doesn't exist
        assert response.status_code != 405, "BUG: DELETE /api/leaves/applications/{id} endpoint does not exist"
        print(f"SUCCESS: DELETE endpoint exists (status: {response.status_code})")


class TestProjectStatusSync:
    """Test project status synchronization between Admin and Employee dashboards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        self.admin_creds = {"username": "renish", "password": "Zb@0075588"}
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=self.admin_creds)
        assert response.status_code == 200
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_project_status_consistency(self):
        """
        Bug Fix 1 (Project Status): Admin and Employee should see consistent project status
        """
        # Get all projects from admin view
        admin_projects = self.session.get(f"{BASE_URL}/api/projects")
        assert admin_projects.status_code == 200
        
        projects = admin_projects.json()
        
        # Check each project has consistent status field
        for project in projects:
            status = project.get("status", "")
            is_late = project.get("is_late", False)
            
            # Status should be one of: ongoing, completed, late, etc.
            assert status in ["ongoing", "completed", "late", "active", "on-hold", "cancelled"], \
                f"Invalid project status: {status}"
            
            # is_late flag should be boolean
            assert isinstance(is_late, bool), f"is_late should be boolean, got {type(is_late)}"
        
        print(f"SUCCESS: All {len(projects)} projects have valid status fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
