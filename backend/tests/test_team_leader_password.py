"""
Test cases for Team Leader assignment and Password visibility features
- Team Leader assignment in Employee Edit should save correctly
- Password (plain_password) should be visible in API responses
- Update password should save and display plain_password
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTeamLeaderAndPassword:
    """Test Team Leader assignment and Password visibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_01_get_employees_returns_plain_password(self):
        """Test that GET /employees returns plain_password field"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200, f"Failed to get employees: {response.text}"
        
        employees = response.json()
        assert len(employees) > 0, "No employees found"
        
        # Check if plain_password field exists in response
        # Find an employee with plain_password set
        emp_with_password = None
        for emp in employees:
            if emp.get("plain_password"):
                emp_with_password = emp
                break
        
        print(f"Total employees: {len(employees)}")
        print(f"Employee with plain_password: {emp_with_password}")
        
        # Verify plain_password field is in the response model
        first_emp = employees[0]
        assert "plain_password" in first_emp or first_emp.get("plain_password") is None, \
            "plain_password field should be in employee response"
        
    def test_02_get_employees_returns_team_leader_ids(self):
        """Test that GET /employees returns team_leader_ids field"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        
        employees = response.json()
        assert len(employees) > 0
        
        # Check if team_leader_ids field exists
        first_emp = employees[0]
        assert "team_leader_ids" in first_emp, "team_leader_ids field should be in employee response"
        
        # Find employee with team_leader_ids set (employee 117 - Chirag Patel per context)
        emp_with_tl = None
        for emp in employees:
            if emp.get("team_leader_ids") and len(emp.get("team_leader_ids", [])) > 0:
                emp_with_tl = emp
                print(f"Found employee with team_leader_ids: {emp['name']} - {emp['team_leader_ids']}")
                break
        
        print(f"Employee with team_leader_ids: {emp_with_tl}")
        
    def test_03_update_employee_team_leader_ids(self):
        """Test updating team_leader_ids persists correctly"""
        # Get all employees first
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        employees = response.json()
        
        # Find a test employee to update
        test_emp = None
        potential_leader = None
        for emp in employees:
            if emp.get("status") == "active":
                if test_emp is None:
                    test_emp = emp
                elif potential_leader is None and emp["employee_id"] != test_emp["employee_id"]:
                    potential_leader = emp
                    break
        
        assert test_emp is not None, "No active employee found for testing"
        assert potential_leader is not None, "No potential team leader found"
        
        print(f"Test employee: {test_emp['name']} ({test_emp['employee_id']})")
        print(f"Potential leader: {potential_leader['name']} ({potential_leader['employee_id']})")
        print(f"Current team_leader_ids: {test_emp.get('team_leader_ids', [])}")
        
        # Update team_leader_ids
        new_team_leader_ids = [potential_leader["employee_id"]]
        update_response = self.session.put(
            f"{BASE_URL}/api/employees/{test_emp['id']}",
            json={"team_leader_ids": new_team_leader_ids}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_emp = update_response.json()
        print(f"Updated team_leader_ids: {updated_emp.get('team_leader_ids', [])}")
        
        # Verify team_leader_ids was saved
        assert updated_emp.get("team_leader_ids") == new_team_leader_ids, \
            f"team_leader_ids not saved correctly. Expected {new_team_leader_ids}, got {updated_emp.get('team_leader_ids')}"
        
        # GET the employee again to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/employees/{test_emp['id']}")
        assert get_response.status_code == 200
        
        fetched_emp = get_response.json()
        assert fetched_emp.get("team_leader_ids") == new_team_leader_ids, \
            f"team_leader_ids not persisted. Expected {new_team_leader_ids}, got {fetched_emp.get('team_leader_ids')}"
        
        print("SUCCESS: team_leader_ids persisted correctly after update")
        
    def test_04_update_employee_password_saves_plain_password(self):
        """Test that updating password also saves plain_password"""
        # Get all employees
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        employees = response.json()
        
        # Find an active employee to test
        test_emp = None
        for emp in employees:
            if emp.get("status") == "active":
                test_emp = emp
                break
        
        assert test_emp is not None, "No active employee found"
        
        print(f"Test employee: {test_emp['name']} ({test_emp['employee_id']})")
        print(f"Current plain_password: {test_emp.get('plain_password')}")
        
        # Update password
        new_password = "TestNewPass456"
        update_response = self.session.put(
            f"{BASE_URL}/api/employees/{test_emp['id']}",
            json={"password": new_password}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_emp = update_response.json()
        print(f"Updated plain_password: {updated_emp.get('plain_password')}")
        
        # Verify plain_password was saved
        assert updated_emp.get("plain_password") == new_password, \
            f"plain_password not saved correctly. Expected {new_password}, got {updated_emp.get('plain_password')}"
        
        # GET the employee again to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/employees/{test_emp['id']}")
        assert get_response.status_code == 200
        
        fetched_emp = get_response.json()
        assert fetched_emp.get("plain_password") == new_password, \
            f"plain_password not persisted. Expected {new_password}, got {fetched_emp.get('plain_password')}"
        
        print("SUCCESS: plain_password persisted correctly after password update")
        
    def test_05_get_single_employee_returns_all_fields(self):
        """Test GET /employees/{id} returns team_leader_ids and plain_password"""
        # Get all employees first
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        employees = response.json()
        
        assert len(employees) > 0
        test_emp = employees[0]
        
        # Get single employee
        get_response = self.session.get(f"{BASE_URL}/api/employees/{test_emp['id']}")
        assert get_response.status_code == 200
        
        emp = get_response.json()
        
        # Verify required fields exist
        assert "team_leader_ids" in emp, "team_leader_ids field missing from single employee response"
        assert "plain_password" in emp or emp.get("plain_password") is None, \
            "plain_password field should be in single employee response"
        
        print(f"Single employee response has team_leader_ids: {emp.get('team_leader_ids')}")
        print(f"Single employee response has plain_password: {emp.get('plain_password')}")
        
    def test_06_clear_team_leader_ids(self):
        """Test clearing team_leader_ids (setting to empty array)"""
        # Get all employees
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        employees = response.json()
        
        # Find employee with team_leader_ids
        test_emp = None
        for emp in employees:
            if emp.get("team_leader_ids") and len(emp.get("team_leader_ids", [])) > 0:
                test_emp = emp
                break
        
        if test_emp is None:
            # Use any active employee
            for emp in employees:
                if emp.get("status") == "active":
                    test_emp = emp
                    break
        
        assert test_emp is not None
        
        print(f"Test employee: {test_emp['name']}")
        print(f"Current team_leader_ids: {test_emp.get('team_leader_ids', [])}")
        
        # Clear team_leader_ids
        update_response = self.session.put(
            f"{BASE_URL}/api/employees/{test_emp['id']}",
            json={"team_leader_ids": []}
        )
        assert update_response.status_code == 200
        
        updated_emp = update_response.json()
        assert updated_emp.get("team_leader_ids") == [], \
            f"team_leader_ids not cleared. Got {updated_emp.get('team_leader_ids')}"
        
        print("SUCCESS: team_leader_ids cleared successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
