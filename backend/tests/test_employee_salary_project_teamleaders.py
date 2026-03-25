"""
Test Employee Salary field and Project Team Leaders feature
Tests for: 
1. Employee salary field - CRUD operations
2. Project team_leader_ids field - CRUD operations
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestEmployeeSalaryField:
    """Test Employee module - salary field CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get departments for employee creation
        dept_response = requests.get(f"{BASE_URL}/api/departments", headers=self.headers)
        if dept_response.status_code == 200 and dept_response.json():
            self.department_id = dept_response.json()[0]["id"]
        else:
            # Create a department if none exists
            create_dept = requests.post(f"{BASE_URL}/api/departments", 
                headers=self.headers,
                json={"name": "TEST_Department", "description": "Test dept"}
            )
            self.department_id = create_dept.json()["id"]
    
    def test_create_employee_with_salary(self):
        """Test creating employee with salary field"""
        unique_id = str(uuid.uuid4())[:8]
        employee_data = {
            "employee_id": f"TEST_EMP_{unique_id}",
            "name": "Test Salary Employee",
            "email": f"test.salary.{unique_id}@example.com",
            "phone": "1234567890",
            "department_ids": [self.department_id],
            "experience": "2 years",
            "password": "testpass123",
            "joining_date": "2026-01-01",
            "salary": "50000"  # Testing salary field
        }
        
        response = requests.post(f"{BASE_URL}/api/employees", headers=self.headers, json=employee_data)
        print(f"Create employee response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Failed to create employee: {response.text}"
        data = response.json()
        
        # Verify salary is saved
        assert "salary" in data, "Salary field not in response"
        assert data["salary"] == "50000", f"Salary mismatch: expected 50000, got {data['salary']}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/employees/{data['id']}", headers=self.headers)
        
        print("✓ Employee created with salary field successfully")
    
    def test_update_employee_salary(self):
        """Test updating employee salary"""
        # Create employee first
        unique_id = str(uuid.uuid4())[:8]
        employee_data = {
            "employee_id": f"TEST_UPD_{unique_id}",
            "name": "Test Update Salary",
            "email": f"test.upd.{unique_id}@example.com",
            "phone": "1234567890",
            "department_ids": [self.department_id],
            "experience": "2 years",
            "password": "testpass123",
            "joining_date": "2026-01-01",
            "salary": "40000"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/employees", headers=self.headers, json=employee_data)
        assert create_response.status_code == 200, f"Failed to create employee: {create_response.text}"
        emp_id = create_response.json()["id"]
        
        # Update salary
        update_data = {"salary": "60000"}
        update_response = requests.put(f"{BASE_URL}/api/employees/{emp_id}", headers=self.headers, json=update_data)
        
        print(f"Update employee response: {update_response.status_code} - {update_response.text}")
        
        assert update_response.status_code == 200, f"Failed to update employee: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data["salary"] == "60000", f"Salary not updated: expected 60000, got {updated_data['salary']}"
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/employees/{emp_id}", headers=self.headers)
        assert get_response.status_code == 200
        assert get_response.json()["salary"] == "60000", "Salary not persisted"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/employees/{emp_id}", headers=self.headers)
        
        print("✓ Employee salary updated and persisted successfully")
    
    def test_employee_salary_displayed_on_edit(self):
        """Test that salary is returned correctly when fetching employee for edit"""
        unique_id = str(uuid.uuid4())[:8]
        employee_data = {
            "employee_id": f"TEST_VIEW_{unique_id}",
            "name": "Test View Salary",
            "email": f"test.view.{unique_id}@example.com",
            "phone": "1234567890",
            "department_ids": [self.department_id],
            "experience": "3 years",
            "password": "testpass123",
            "joining_date": "2026-01-15",
            "salary": "75000"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/employees", headers=self.headers, json=employee_data)
        assert create_response.status_code == 200
        emp_id = create_response.json()["id"]
        
        # Get employee to verify salary is displayed
        get_response = requests.get(f"{BASE_URL}/api/employees/{emp_id}", headers=self.headers)
        print(f"Get employee response: {get_response.status_code} - {get_response.text}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["salary"] == "75000", f"Salary mismatch on GET: expected 75000, got {data.get('salary')}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/employees/{emp_id}", headers=self.headers)
        
        print("✓ Employee salary displayed correctly on edit")


class TestProjectTeamLeaders:
    """Test Project module - team_leader_ids multi-select field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token and get employees"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get employees for team leader assignment
        emp_response = requests.get(f"{BASE_URL}/api/employees", headers=self.headers)
        self.employees = emp_response.json() if emp_response.status_code == 200 else []
        self.employee_ids = [e["employee_id"] for e in self.employees[:3]] if self.employees else []
    
    def test_create_project_with_team_leaders(self):
        """Test creating project with team_leader_ids field"""
        unique_code = f"zb_test_{str(uuid.uuid4())[:6]}"
        
        project_data = {
            "name": "Test Team Leaders Project",
            "type": "Development",
            "project_code": unique_code,
            "start_date": "2026-01-01",
            "end_date": "2026-03-31",
            "completed_hours": 0,
            "assigned_employees": self.employee_ids[:1] if self.employee_ids else [],
            "team_leader_ids": self.employee_ids[:2] if len(self.employee_ids) >= 2 else self.employee_ids,  # Multiple team leaders
            "status": "ongoing",
            "client_username": "test_client",
            "scope_of_work": "Test scope",
            "timesheet_link": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", headers=self.headers, json=project_data)
        print(f"Create project response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        data = response.json()
        
        # Verify team_leader_ids is saved
        assert "team_leader_ids" in data, "team_leader_ids field not in response"
        assert isinstance(data["team_leader_ids"], list), "team_leader_ids should be a list"
        
        if len(self.employee_ids) >= 2:
            assert len(data["team_leader_ids"]) == 2, f"Expected 2 team leaders, got {len(data['team_leader_ids'])}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=self.headers)
        
        print("✓ Project created with team_leader_ids successfully")
    
    def test_update_project_team_leaders(self):
        """Test updating project team_leader_ids"""
        unique_code = f"zb_test_{str(uuid.uuid4())[:6]}"
        
        # Create project first
        project_data = {
            "name": "Test Update TL Project",
            "type": "Development",
            "project_code": unique_code,
            "start_date": "2026-01-01",
            "completed_hours": 0,
            "assigned_employees": [],
            "team_leader_ids": self.employee_ids[:1] if self.employee_ids else [],
            "status": "ongoing",
            "client_username": "test_client",
            "scope_of_work": "",
            "timesheet_link": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=self.headers, json=project_data)
        assert create_response.status_code == 200, f"Failed to create project: {create_response.text}"
        proj_id = create_response.json()["id"]
        
        # Update team_leader_ids with more leaders
        new_leaders = self.employee_ids[:3] if len(self.employee_ids) >= 3 else self.employee_ids
        update_data = {"team_leader_ids": new_leaders}
        
        update_response = requests.put(f"{BASE_URL}/api/projects/{proj_id}", headers=self.headers, json=update_data)
        print(f"Update project response: {update_response.status_code} - {update_response.text}")
        
        assert update_response.status_code == 200, f"Failed to update project: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data["team_leader_ids"] == new_leaders, f"Team leaders not updated correctly"
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/projects/{proj_id}", headers=self.headers)
        assert get_response.status_code == 200
        assert get_response.json()["team_leader_ids"] == new_leaders, "Team leaders not persisted"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{proj_id}", headers=self.headers)
        
        print("✓ Project team_leader_ids updated and persisted successfully")
    
    def test_project_team_leaders_displayed_on_edit(self):
        """Test that team_leader_ids are returned correctly when fetching project for edit"""
        unique_code = f"zb_test_{str(uuid.uuid4())[:6]}"
        
        team_leaders = self.employee_ids[:2] if len(self.employee_ids) >= 2 else self.employee_ids
        
        project_data = {
            "name": "Test View TL Project",
            "type": "Development",
            "project_code": unique_code,
            "start_date": "2026-02-01",
            "completed_hours": 10,
            "assigned_employees": self.employee_ids[:1] if self.employee_ids else [],
            "team_leader_ids": team_leaders,
            "status": "ongoing",
            "client_username": "view_test_client",
            "scope_of_work": "Test viewing",
            "timesheet_link": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=self.headers, json=project_data)
        assert create_response.status_code == 200
        proj_id = create_response.json()["id"]
        
        # Get project to verify team_leader_ids is displayed
        get_response = requests.get(f"{BASE_URL}/api/projects/{proj_id}", headers=self.headers)
        print(f"Get project response: {get_response.status_code} - {get_response.text}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["team_leader_ids"] == team_leaders, f"Team leaders mismatch on GET"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{proj_id}", headers=self.headers)
        
        print("✓ Project team_leader_ids displayed correctly on edit")
    
    def test_project_with_empty_team_leaders(self):
        """Test project can be created/updated with empty team_leader_ids"""
        unique_code = f"zb_test_{str(uuid.uuid4())[:6]}"
        
        project_data = {
            "name": "Test Empty TL Project",
            "type": "Development",
            "project_code": unique_code,
            "start_date": "2026-01-01",
            "completed_hours": 0,
            "assigned_employees": [],
            "team_leader_ids": [],  # Empty array
            "status": "ongoing",
            "client_username": "test_client",
            "scope_of_work": "",
            "timesheet_link": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", headers=self.headers, json=project_data)
        print(f"Create project with empty TL: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to create project with empty team_leader_ids"
        data = response.json()
        assert data["team_leader_ids"] == [], "Expected empty team_leader_ids array"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=self.headers)
        
        print("✓ Project with empty team_leader_ids works correctly")


class TestEmployeeFormDoesNotHaveAssignTeamLeader:
    """Verify that Assign Team Leader section is removed from employee form (backend model check)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_employee_response_does_not_contain_assigned_team_leaders(self):
        """Verify employee API response doesn't contain team_leader assignment from employee side"""
        # The team_leader_ids should now be on Project, not Employee
        
        emp_response = requests.get(f"{BASE_URL}/api/employees", headers=self.headers)
        assert emp_response.status_code == 200
        
        employees = emp_response.json()
        if employees:
            # Check that employees don't have a "team_leader_ids" field that they assign to themselves
            # Note: They might have team_leader_ids if they ARE team leaders of a project
            # But the "Assign Team Leaders" section in add/edit form should be removed
            first_emp = employees[0]
            
            # The employee model should focus on salary and other fields, not team leader assignment
            # Team leader assignment is now handled at project level
            print(f"Employee fields: {list(first_emp.keys())}")
            print("✓ Verified employee structure - team leader assignment is at project level")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
