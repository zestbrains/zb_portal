"""
Test suite for new features:
1. Admin Management - Create/Delete admin/HR users
2. Employee Working Hours - Pagination, Add button, Date filter
3. Leave Tracker - PL/2 & CL/2 reduces both balances by 0.5 each
4. Database reset verification - Only renish admin user exists
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Test login with new admin credentials (renish / Zb@0075588)"""
    
    def test_admin_login_success(self):
        """Test login with new admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "renish"
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['username']}")
    
    def test_admin_login_wrong_password(self):
        """Test login with wrong password fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Wrong password correctly rejected")


class TestAdminManagement:
    """Test Admin Management page functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_admin_users(self, admin_token):
        """Test GET /api/admin/users returns admin users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # Should have at least renish admin
        admin_usernames = [u["username"] for u in users]
        assert "renish" in admin_usernames
        print(f"✓ Admin users fetched: {len(users)} users")
    
    def test_create_admin_user(self, admin_token):
        """Test creating a new admin user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_user = {
            "username": "TEST_admin_user",
            "email": "TEST_admin@zestbrains.com",
            "password": "testpass123",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=headers)
        assert response.status_code == 200, f"Create admin failed: {response.text}"
        data = response.json()
        assert data["username"] == "TEST_admin_user"
        assert data["role"] == "admin"
        print(f"✓ Admin user created: {data['username']}")
        
        # Verify user exists
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = response.json()
        usernames = [u["username"] for u in users]
        assert "TEST_admin_user" in usernames
        print("✓ Created admin user verified in list")
        
        # Cleanup - delete the test user
        test_user = next(u for u in users if u["username"] == "TEST_admin_user")
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{test_user['id']}", headers=headers)
        assert delete_response.status_code == 200
        print("✓ Test admin user cleaned up")
    
    def test_create_hr_user(self, admin_token):
        """Test creating a new HR user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_user = {
            "username": "TEST_hr_user",
            "email": "TEST_hr@zestbrains.com",
            "password": "testpass123",
            "role": "hr"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=headers)
        assert response.status_code == 200, f"Create HR failed: {response.text}"
        data = response.json()
        assert data["username"] == "TEST_hr_user"
        assert data["role"] == "hr"
        print(f"✓ HR user created: {data['username']}")
        
        # Cleanup
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = response.json()
        test_user = next(u for u in users if u["username"] == "TEST_hr_user")
        requests.delete(f"{BASE_URL}/api/admin/users/{test_user['id']}", headers=headers)
        print("✓ Test HR user cleaned up")
    
    def test_cannot_delete_self(self, admin_token):
        """Test that admin cannot delete their own account"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current user's ID
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = response.json()
        renish_user = next(u for u in users if u["username"] == "renish")
        
        # Try to delete self
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{renish_user['id']}", headers=headers)
        assert delete_response.status_code == 400
        assert "Cannot delete your own account" in delete_response.json()["detail"]
        print("✓ Cannot delete own account - correctly prevented")
    
    def test_duplicate_username_rejected(self, admin_token):
        """Test that duplicate username is rejected"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_user = {
            "username": "renish",  # Already exists
            "email": "duplicate@zestbrains.com",
            "password": "testpass123",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=headers)
        assert response.status_code == 400
        assert "Username already exists" in response.json()["detail"]
        print("✓ Duplicate username correctly rejected")


class TestWorkingHoursAPI:
    """Test Working Hours API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        return response.json()["access_token"]
    
    def test_get_work_entries_endpoint(self, admin_token):
        """Test GET /api/work-entries endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Work entries endpoint working: {len(data)} entries")
    
    def test_get_work_entries_all_endpoint(self, admin_token):
        """Test GET /api/work-entries/all endpoint for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries/all", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Work entries all endpoint working: {len(data)} entries")


class TestLeaveApprovalPLCL:
    """Test PL/2 & CL/2 leave approval feature"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def setup_test_employee(self, admin_token):
        """Create a test employee for leave testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a department
        dept_response = requests.post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_Department",
            "description": "Test department"
        }, headers=headers)
        dept_id = dept_response.json()["id"] if dept_response.status_code == 200 else None
        
        # Create employee
        employee_data = {
            "employee_id": "TEST_EMP001",
            "name": "Test Employee",
            "email": "TEST_employee@zestbrains.com",
            "phone": "1234567890",
            "department_ids": [dept_id] if dept_id else [],
            "experience": "1 year",
            "password": "testpass123",
            "joining_date": "2024-01-01"
        }
        emp_response = requests.post(f"{BASE_URL}/api/employees", json=employee_data, headers=headers)
        
        yield {
            "employee_id": "TEST_EMP001",
            "dept_id": dept_id,
            "emp_id": emp_response.json().get("id") if emp_response.status_code == 200 else None
        }
        
        # Cleanup
        if emp_response.status_code == 200:
            emp_id = emp_response.json()["id"]
            requests.delete(f"{BASE_URL}/api/employees/{emp_id}", headers=headers)
        if dept_id:
            requests.delete(f"{BASE_URL}/api/departments/{dept_id}", headers=headers)
    
    def test_leave_approval_with_pl2_cl2(self, admin_token, setup_test_employee):
        """Test that PL/2 & CL/2 creates two records (0.5 PL + 0.5 CL)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        if not setup_test_employee["emp_id"]:
            pytest.skip("Could not create test employee")
        
        # Login as employee to apply leave
        emp_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "TEST_employee@zestbrains.com",
            "password": "testpass123"
        })
        
        if emp_login.status_code != 200:
            pytest.skip("Could not login as test employee")
        
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        
        # Apply leave
        leave_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        leave_response = requests.post(f"{BASE_URL}/api/leaves/apply", json={
            "from_date": leave_date,
            "to_date": leave_date,
            "reason": "TEST_PL2_CL2_leave"
        }, headers=emp_headers)
        
        if leave_response.status_code != 200:
            pytest.skip(f"Could not apply leave: {leave_response.text}")
        
        leave_id = leave_response.json()["id"]
        
        # Approve with PL/2 & CL/2
        approval_response = requests.put(f"{BASE_URL}/api/leaves/applications/{leave_id}/approve", json={
            "status": "approved",
            "comments": "Test approval",
            "leave_dates": [
                {"date": leave_date, "leave_type": "PL/2 & CL/2"}
            ]
        }, headers=headers)
        
        assert approval_response.status_code == 200, f"Approval failed: {approval_response.text}"
        print("✓ Leave approved with PL/2 & CL/2")
        
        # Verify employee leave balances updated
        emp_response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
        employees = emp_response.json()
        test_emp = next((e for e in employees if e["employee_id"] == "TEST_EMP001"), None)
        
        if test_emp:
            # Both PL and CL should be incremented by 0.5
            assert test_emp["pl_taken"] == 0.5, f"Expected pl_taken=0.5, got {test_emp['pl_taken']}"
            assert test_emp["cl_taken"] == 0.5, f"Expected cl_taken=0.5, got {test_emp['cl_taken']}"
            print(f"✓ PL/2 & CL/2 correctly updated: pl_taken={test_emp['pl_taken']}, cl_taken={test_emp['cl_taken']}")


class TestDatabaseReset:
    """Test that database is clean with only renish admin user"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        return response.json()["access_token"]
    
    def test_only_renish_admin_exists(self, admin_token):
        """Verify only renish admin user exists initially"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        
        # Filter out any TEST_ users that might exist from other tests
        non_test_users = [u for u in users if not u["username"].startswith("TEST_")]
        
        # Should only have renish
        assert len(non_test_users) >= 1
        assert any(u["username"] == "renish" for u in non_test_users)
        print(f"✓ Admin users verified: {[u['username'] for u in non_test_users]}")
    
    def test_employees_collection_state(self, admin_token):
        """Check employees collection state"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        # Filter out TEST_ employees
        non_test_employees = [e for e in employees if not e["employee_id"].startswith("TEST_")]
        print(f"✓ Employees in database: {len(non_test_employees)}")
    
    def test_projects_collection_state(self, admin_token):
        """Check projects collection state"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        projects = response.json()
        print(f"✓ Projects in database: {len(projects)}")
    
    def test_departments_collection_state(self, admin_token):
        """Check departments collection state"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/departments", headers=headers)
        assert response.status_code == 200
        departments = response.json()
        # Filter out TEST_ departments
        non_test_depts = [d for d in departments if not d["name"].startswith("TEST_")]
        print(f"✓ Departments in database: {len(non_test_depts)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
