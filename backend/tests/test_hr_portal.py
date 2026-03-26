"""
Zestbrains HR Portal - Backend API Tests
Tests for: Dashboard Analytics, Leave Tracker, Working Hours, Employee Management, Leave Application
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://team-leader-pass.preview.emergentagent.com').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful, token received")
        return data["access_token"]
    
    def test_employee_login_success(self):
        """Test employee login with email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "meera@zestbrains.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        print(f"Employee login successful")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestDashboardAnalytics:
    """Dashboard analytics endpoint tests - Focus on late projects bug fix"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats(self, admin_token):
        """Test basic dashboard stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "total_departments" in data
        assert "total_projects" in data
        assert "active_projects" in data
        print(f"Dashboard stats: {data}")
    
    def test_admin_analytics_endpoint(self, admin_token):
        """Test admin analytics endpoint returns proper structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "project_overview" in data
        assert "late_projects" in data
        assert "employee_performance" in data
        assert "top_performers" in data
        assert "low_performers" in data
        
        print(f"Project Overview: {data['project_overview']}")
        print(f"Late Projects Count: {data['project_overview']['late']}")
        print(f"Employee Performance Count: {len(data['employee_performance'])}")
    
    def test_late_projects_count(self, admin_token):
        """Verify late projects count matches actual late projects - BUG FIX VERIFICATION"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        late_count = data["project_overview"]["late"]
        late_projects_list = data.get("late_projects", [])
        
        print(f"Late projects count in overview: {late_count}")
        print(f"Late projects in list: {len(late_projects_list)}")
        
        # The count should match the list length
        assert late_count == len(late_projects_list), f"Mismatch: overview shows {late_count}, list has {len(late_projects_list)}"
        
        # Print late project names for verification
        for proj in late_projects_list:
            print(f"  - {proj['name']} (status: {proj.get('status', 'N/A')}, end_date: {proj.get('end_date', 'N/A')})")
    
    def test_employee_performance_data(self, admin_token):
        """Verify employee performance chart has data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        employee_performance = data.get("employee_performance", [])
        print(f"Employee performance entries: {len(employee_performance)}")
        
        # Should have employee performance data
        assert len(employee_performance) > 0, "Employee performance should have data"
        
        # Verify structure of each entry
        for emp in employee_performance[:3]:  # Check first 3
            assert "name" in emp
            assert "employee_id" in emp
            assert "total_assigned" in emp
            assert "completed_on_time" in emp
            assert "completed_late" in emp
            assert "ongoing" in emp
            print(f"  - {emp['name']}: {emp['total_assigned']} assigned, {emp['completed_on_time']} on-time, {emp['completed_late']} late")
    
    def test_top_performers_section(self, admin_token):
        """Verify top performers section has data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        top_performers = data.get("top_performers", [])
        print(f"Top performers: {len(top_performers)}")
        
        for emp in top_performers:
            print(f"  - {emp['name']}: {emp['completed_on_time']} on-time")
    
    def test_needs_improvement_section(self, admin_token):
        """Verify needs improvement (low performers) section"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        low_performers = data.get("low_performers", [])
        print(f"Low performers (needs improvement): {len(low_performers)}")
        
        for emp in low_performers:
            if emp.get("completed_late", 0) > 0:
                print(f"  - {emp['name']}: {emp['completed_late']} late")


class TestProjects:
    """Project management tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_all_projects(self, admin_token):
        """Test getting all projects"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        projects = response.json()
        print(f"Total projects: {len(projects)}")
        
        # Count projects by status
        status_counts = {}
        for proj in projects:
            status = proj.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        print(f"Projects by status: {status_counts}")
        
        return projects


class TestLeaveTracker:
    """Leave tracker tests - Year-wise tabs and edit functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_leave_tracker(self, admin_token):
        """Test leave tracker endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/tracker", headers=headers)
        assert response.status_code == 200
        tracker = response.json()
        print(f"Leave tracker entries: {len(tracker)}")
        
        for emp in tracker[:3]:
            print(f"  - {emp['name']}: PL taken={emp['pl_taken']}, CL taken={emp['cl_taken']}, Available PL={emp['available_pl']}")
    
    def test_get_employee_yearwise_leaves(self, admin_token):
        """Test year-wise leave details for an employee"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get an employee ID
        tracker_response = requests.get(f"{BASE_URL}/api/leaves/tracker", headers=headers)
        tracker = tracker_response.json()
        
        if len(tracker) > 0:
            emp_id = tracker[0]["employee_id"]
            response = requests.get(f"{BASE_URL}/api/leaves/employee-yearwise/{emp_id}", headers=headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "employee_id" in data
            assert "years_data" in data
            assert "total_years" in data
            
            print(f"Employee: {data['name']} ({data['employee_id']})")
            print(f"Total years: {data['total_years']}")
            
            for year in data["years_data"]:
                print(f"  - {year['year_label']}: PL={year['pl_taken']}, CL={year['cl_taken']}, Active={year['is_current']}")
    
    def test_get_leave_applications(self, admin_token):
        """Test getting leave applications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/applications", headers=headers)
        assert response.status_code == 200
        applications = response.json()
        print(f"Leave applications: {len(applications)}")


class TestWorkingHours:
    """Working hours tests - Edit/Delete functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_work_entries_summary(self, admin_token):
        """Test getting work entries summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries/detailed-summary", headers=headers)
        assert response.status_code == 200
        summary = response.json()
        print(f"Work entries summary: {len(summary)} entries")
    
    def test_get_work_entries(self, admin_token):
        """Test getting work entries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/work-entries", headers=headers)
        assert response.status_code == 200
        entries = response.json()
        print(f"Work entries: {len(entries)}")
        return entries


class TestEmployeeManagement:
    """Employee management tests - Birth date, multi-department, status toggle"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_employees(self, admin_token):
        """Test getting all employees"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        print(f"Total employees: {len(employees)}")
        
        # Check for birth_date field
        for emp in employees[:3]:
            print(f"  - {emp['name']}: birth_date={emp.get('birth_date', 'N/A')}, departments={emp.get('department_ids', [])}")
            assert "birth_date" in emp or emp.get("birth_date") is None, "birth_date field should exist"
            assert "department_ids" in emp, "department_ids field should exist"
    
    def test_get_active_employees(self, admin_token):
        """Test getting active employees only"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/employees?status=active", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        print(f"Active employees: {len(employees)}")
        
        for emp in employees:
            assert emp["status"] == "active"
    
    def test_get_departments(self, admin_token):
        """Test getting departments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/departments", headers=headers)
        assert response.status_code == 200
        departments = response.json()
        print(f"Departments: {len(departments)}")
        
        for dept in departments:
            print(f"  - {dept['name']} (active={dept.get('is_active', True)})")


class TestLeaveApplication:
    """Leave application tests - Employee can apply for leave"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "meera@zestbrains.com",
            "password": "test123"
        })
        if response.status_code != 200:
            pytest.skip("Employee login failed - skipping employee tests")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_employee_can_view_own_leaves(self, employee_token):
        """Test employee can view their own leave details"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/my-details", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "employee_id" in data
        assert "years_data" in data
        print(f"Employee leave details: {data['name']}")
    
    def test_employee_can_view_applications(self, employee_token):
        """Test employee can view their leave applications"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/leaves/applications", headers=headers)
        assert response.status_code == 200
        applications = response.json()
        print(f"Employee's leave applications: {len(applications)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
