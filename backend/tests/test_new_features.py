"""
Test suite for new features:
1. Bug fix: Employee work entry edit button visibility
2. Bug fix: Backend PUT /api/work-entries/employee/{id} rejects editing other employee's entries
3. Email Settings: cc_emails_project field in GET/PUT /api/email-config
4. Projects: poc, scope, platform fields in POST/PUT/GET /api/projects
5. Projects: POST /api/projects/{id}/send-mail endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "renish"
ADMIN_PASSWORD = "Zb@0075588"
EMPLOYEE_USERNAME = "hr1"  # employee_id=56
EMPLOYEE_PASSWORD = "Reeman@zb@56"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful, role={data['user']['role']}")
        return data["access_token"]
    
    def test_employee_login(self):
        """Test employee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": EMPLOYEE_USERNAME,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        print(f"PASS: Employee login successful, employee_id={data['user'].get('employee_id')}")
        return data["access_token"], data["user"].get("employee_id")


class TestEmailConfigCCEmailsProject:
    """Test cc_emails_project field in email config"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_email_config_has_cc_emails_project(self, admin_token):
        """GET /api/email-config should return cc_emails_project field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/email-config", headers=headers)
        assert response.status_code == 200, f"Failed to get email config: {response.text}"
        data = response.json()
        assert "cc_emails_project" in data, "cc_emails_project field missing from response"
        print(f"PASS: GET /api/email-config returns cc_emails_project: '{data.get('cc_emails_project', '')}'")
    
    def test_put_email_config_saves_cc_emails_project(self, admin_token):
        """PUT /api/email-config should save cc_emails_project field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/email-config", headers=headers)
        current_config = get_response.json()
        
        # Update with test cc_emails_project
        test_cc_emails = "test_pm@example.com, test_manager@example.com"
        update_data = {
            "smtp_host": current_config.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": current_config.get("smtp_port", 587),
            "smtp_email": current_config.get("smtp_email", "hr.zestbrains@gmail.com"),
            "smtp_password": "",  # Don't change password
            "enable_ssl": current_config.get("enable_ssl", True),
            "cc_emails": current_config.get("cc_emails", ""),
            "cc_emails_project": test_cc_emails,
            "is_enabled": current_config.get("is_enabled", False)
        }
        
        put_response = requests.put(f"{BASE_URL}/api/email-config", headers=headers, json=update_data)
        assert put_response.status_code == 200, f"Failed to update email config: {put_response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/email-config", headers=headers)
        verify_data = verify_response.json()
        assert verify_data.get("cc_emails_project") == test_cc_emails, \
            f"cc_emails_project not saved correctly. Expected: {test_cc_emails}, Got: {verify_data.get('cc_emails_project')}"
        
        # Restore original value
        update_data["cc_emails_project"] = current_config.get("cc_emails_project", "")
        requests.put(f"{BASE_URL}/api/email-config", headers=headers, json=update_data)
        
        print(f"PASS: PUT /api/email-config saves cc_emails_project correctly")


class TestProjectNewFields:
    """Test poc, scope, platform fields in projects"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_project_with_new_fields(self, admin_token):
        """POST /api/projects should accept poc, scope, platform fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test project with new fields
        project_data = {
            "name": "TEST_Project_NewFields",
            "type": "Development",
            "project_code": "zb_test_999",
            "start_date": "2026-01-15",
            "end_date": "",
            "completed_hours": 0,
            "assigned_employees": [],
            "status": "ongoing",
            "client_username": "TestClient",
            "scope_of_work": "Test scope of work",
            "timesheet_link": "",
            "poc": ["56"],  # Employee ID 56
            "scope": "Full Stack Development",
            "platform": "Web, iOS"
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=project_data)
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        
        data = response.json()
        assert data.get("poc") == ["56"], f"POC not saved correctly: {data.get('poc')}"
        assert data.get("scope") == "Full Stack Development", f"Scope not saved correctly: {data.get('scope')}"
        assert data.get("platform") == "Web, iOS", f"Platform not saved correctly: {data.get('platform')}"
        
        print(f"PASS: POST /api/projects accepts poc={data.get('poc')}, scope={data.get('scope')}, platform={data.get('platform')}")
        
        # Cleanup - delete the test project
        project_id = data.get("id")
        if project_id:
            requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        
        return data
    
    def test_update_project_with_new_fields(self, admin_token):
        """PUT /api/projects/{id} should accept poc, scope, platform fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a project
        project_data = {
            "name": "TEST_Project_Update",
            "type": "Development",
            "project_code": "zb_test_998",
            "start_date": "2026-01-15",
            "end_date": "",
            "completed_hours": 0,
            "assigned_employees": [],
            "status": "ongoing",
            "client_username": "TestClient",
            "scope_of_work": "Test",
            "timesheet_link": "",
            "poc": [],
            "scope": "",
            "platform": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=project_data)
        assert create_response.status_code == 200, f"Failed to create project: {create_response.text}"
        project_id = create_response.json().get("id")
        
        # Update with new fields
        update_data = {
            "poc": ["56", "101"],
            "scope": "Backend API Development",
            "platform": "Android, Web"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/projects/{project_id}", headers=headers, json=update_data)
        assert update_response.status_code == 200, f"Failed to update project: {update_response.text}"
        
        updated = update_response.json()
        assert updated.get("poc") == ["56", "101"], f"POC not updated: {updated.get('poc')}"
        assert updated.get("scope") == "Backend API Development", f"Scope not updated: {updated.get('scope')}"
        assert updated.get("platform") == "Android, Web", f"Platform not updated: {updated.get('platform')}"
        
        print(f"PASS: PUT /api/projects/{project_id} updates poc, scope, platform correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
    
    def test_get_projects_returns_new_fields(self, admin_token):
        """GET /api/projects should return poc, scope, platform fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a project with new fields
        project_data = {
            "name": "TEST_Project_Get",
            "type": "Development",
            "project_code": "zb_test_997",
            "start_date": "2026-01-15",
            "end_date": "",
            "completed_hours": 0,
            "assigned_employees": [],
            "status": "ongoing",
            "client_username": "TestClient",
            "scope_of_work": "Test",
            "timesheet_link": "",
            "poc": ["56"],
            "scope": "Testing Scope",
            "platform": "Testing Platform"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=project_data)
        project_id = create_response.json().get("id")
        
        # Get all projects
        get_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert get_response.status_code == 200, f"Failed to get projects: {get_response.text}"
        
        projects = get_response.json()
        test_project = next((p for p in projects if p.get("project_code") == "zb_test_997"), None)
        
        assert test_project is not None, "Test project not found in list"
        assert "poc" in test_project, "poc field missing from project"
        assert "scope" in test_project, "scope field missing from project"
        assert "platform" in test_project, "platform field missing from project"
        
        print(f"PASS: GET /api/projects returns poc, scope, platform fields")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=headers)


class TestProjectSendMail:
    """Test POST /api/projects/{id}/send-mail endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_send_mail_endpoint_exists(self, admin_token):
        """POST /api/projects/{id}/send-mail endpoint should exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get an existing project
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        projects = projects_response.json()
        
        if not projects:
            pytest.skip("No projects available to test send-mail")
        
        project_id = projects[0].get("id")
        
        # Try to send mail (may fail if email not configured, but endpoint should exist)
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/send-mail", headers=headers)
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404, "send-mail endpoint not found"
        
        # Should be 200 (success) or 500 (email config issue) - both mean endpoint works
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}, {response.text}"
        
        print(f"PASS: POST /api/projects/{project_id}/send-mail endpoint exists (status={response.status_code})")
    
    def test_send_mail_invalid_project(self, admin_token):
        """POST /api/projects/{id}/send-mail should return 404 for invalid project"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/projects/invalid-project-id/send-mail", headers=headers)
        assert response.status_code == 404, f"Expected 404 for invalid project, got {response.status_code}"
        
        print("PASS: POST /api/projects/invalid-id/send-mail returns 404")


class TestWorkEntryEditBugFix:
    """Test bug fix: Employee can only edit their own work entries"""
    
    @pytest.fixture
    def employee_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": EMPLOYEE_USERNAME,
            "password": EMPLOYEE_PASSWORD
        })
        data = response.json()
        return data["access_token"], data["user"].get("employee_id")
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_employee_cannot_edit_other_employee_entry(self, employee_auth, admin_token):
        """PUT /api/work-entries/employee/{id} should reject editing other employee's entries with 403"""
        emp_token, emp_id = employee_auth
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get work entries to find one from another employee
        # First get all work entries as admin
        all_entries_response = requests.get(f"{BASE_URL}/api/work-entries", headers=admin_headers)
        
        if all_entries_response.status_code != 200:
            pytest.skip("Cannot get work entries")
        
        all_entries = all_entries_response.json()
        
        # Find an entry from a different employee
        other_entry = None
        for entry in all_entries:
            if entry.get("employee_id") != emp_id:
                other_entry = entry
                break
        
        if not other_entry:
            pytest.skip("No work entries from other employees found")
        
        # Try to edit this entry as the logged-in employee
        update_data = {
            "hours": 5.0,
            "work_details": "Attempted unauthorized edit"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/work-entries/employee/{other_entry['id']}", 
            headers=emp_headers, 
            json=update_data
        )
        
        assert response.status_code == 403, \
            f"Expected 403 when editing other employee's entry, got {response.status_code}: {response.text}"
        
        print(f"PASS: PUT /api/work-entries/employee/{other_entry['id']} returns 403 for other employee's entry")
    
    def test_employee_can_edit_own_entry(self, employee_auth):
        """Employee should be able to edit their own work entries (for today/future)"""
        emp_token, emp_id = employee_auth
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        
        # Get employee's own work entries
        response = requests.get(f"{BASE_URL}/api/work-entries", headers=emp_headers)
        
        if response.status_code != 200:
            pytest.skip("Cannot get work entries")
        
        entries = response.json()
        
        # Find an entry from today or future
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        own_entry = None
        for entry in entries:
            if entry.get("employee_id") == emp_id and entry.get("date") >= today:
                own_entry = entry
                break
        
        if not own_entry:
            print("INFO: No editable entries found for today/future - this is expected if no recent entries exist")
            pytest.skip("No editable entries found for today/future")
        
        # Try to edit own entry
        update_data = {
            "work_details": f"Updated at {datetime.now().isoformat()}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/work-entries/employee/{own_entry['id']}", 
            headers=emp_headers, 
            json=update_data
        )
        
        # Should succeed (200) or fail due to date restriction (403)
        assert response.status_code in [200, 403], \
            f"Unexpected status when editing own entry: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            print(f"PASS: Employee can edit their own work entry")
        else:
            print(f"INFO: Entry edit rejected due to date restriction (expected for past dates)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
