import requests
import sys
import json
from datetime import datetime, timedelta

class CompanyPortalAPITester:
    def __init__(self, base_url="https://internal-workspace-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.hr_token = None
        self.employee_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'departments': [],
            'employees': [],
            'projects': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin user: {response.get('user', {}).get('username')}")
            return True
        return False

    def test_employee_login(self):
        """Test employee login (john)"""
        success, response = self.run_test(
            "Employee Login (john)",
            "POST",
            "auth/login",
            200,
            data={"username": "john", "password": "john123"}
        )
        if success and 'access_token' in response:
            self.employee_token = response['access_token']
            print(f"   Employee user: {response.get('user', {}).get('username')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "wrong"}
        )
        return success

    def test_token_validation(self):
        """Test token validation"""
        success, response = self.run_test(
            "Token Validation (/auth/me)",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )
        return success

    def test_department_crud(self):
        """Test Department CRUD operations"""
        print("\n📁 Testing Department CRUD Operations...")
        
        # Create Department
        dept_data = {
            "name": "Test Engineering",
            "description": "Test department for engineering"
        }
        success, response = self.run_test(
            "Create Department",
            "POST",
            "departments",
            200,
            data=dept_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        dept_id = response.get('id')
        self.created_resources['departments'].append(dept_id)
        
        # Read Departments
        success, _ = self.run_test(
            "Get All Departments",
            "GET",
            "departments",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Update Department
        update_data = {
            "name": "Updated Engineering",
            "description": "Updated description"
        }
        success, _ = self.run_test(
            "Update Department",
            "PUT",
            f"departments/{dept_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Toggle Department Status
        success, _ = self.run_test(
            "Toggle Department Status",
            "PUT",
            f"departments/{dept_id}/status?is_active=false",
            200,
            token=self.admin_token
        )
        
        return success

    def test_employee_crud(self):
        """Test Employee CRUD operations"""
        print("\n👥 Testing Employee CRUD Operations...")
        
        # First create a department for the employee
        dept_data = {"name": "HR Department", "description": "Human Resources"}
        success, dept_response = self.run_test(
            "Create Department for Employee",
            "POST",
            "departments",
            200,
            data=dept_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        dept_id = dept_response.get('id')
        self.created_resources['departments'].append(dept_id)
        
        # Create Employee
        emp_data = {
            "employee_id": "EMP001",
            "name": "Test Employee",
            "email": "test@company.com",
            "phone": "1234567890",
            "department_id": dept_id,
            "role": "employee",
            "username": "testuser",
            "password": "testpass123",
            "joining_date": datetime.now().isoformat()
        }
        success, response = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data=emp_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        emp_id = response.get('id')
        self.created_resources['employees'].append(emp_id)
        
        # Read Employees
        success, _ = self.run_test(
            "Get All Employees",
            "GET",
            "employees",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Get Single Employee
        success, _ = self.run_test(
            "Get Single Employee",
            "GET",
            f"employees/{emp_id}",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Update Employee
        update_data = {
            "name": "Updated Test Employee",
            "phone": "9876543210"
        }
        success, _ = self.run_test(
            "Update Employee",
            "PUT",
            f"employees/{emp_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Update Employee Status
        success, _ = self.run_test(
            "Update Employee Status",
            "PUT",
            f"employees/{emp_id}/status?status=inactive",
            200,
            token=self.admin_token
        )
        
        return success

    def test_project_crud(self):
        """Test Project CRUD operations"""
        print("\n📋 Testing Project CRUD Operations...")
        
        # Create Project
        proj_data = {
            "name": "Test Project",
            "type": "Development",
            "project_code": "PROJ001",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "assigned_employees": ["EMP001"],
            "status": "active",
            "client_username": "testclient",
            "scope_of_work": "Test project scope",
            "timesheet_link": "https://example.com/timesheet"
        }
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=proj_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        proj_id = response.get('id')
        self.created_resources['projects'].append(proj_id)
        
        # Read Projects
        success, _ = self.run_test(
            "Get All Projects",
            "GET",
            "projects",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Get Single Project
        success, _ = self.run_test(
            "Get Single Project",
            "GET",
            f"projects/{proj_id}",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Update Project
        update_data = {
            "name": "Updated Test Project",
            "status": "completed"
        }
        success, _ = self.run_test(
            "Update Project",
            "PUT",
            f"projects/{proj_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        if not success:
            return False
        
        # Mark Project as Late
        success, _ = self.run_test(
            "Mark Project Late",
            "PUT",
            f"projects/{proj_id}/late?is_late=true",
            200,
            token=self.admin_token
        )
        
        return success

    def test_work_entries(self):
        """Test Work Entry functionality"""
        print("\n⏰ Testing Work Entry Operations...")
        
        # First, try to login as employee to create work entries
        if not self.employee_token:
            print("❌ No employee token available for work entry testing")
            return False
        
        # Get projects for employee
        success, projects = self.run_test(
            "Get Employee Projects",
            "GET",
            "projects",
            200,
            token=self.employee_token
        )
        if not success or not projects:
            print("❌ No projects available for employee")
            return False
        
        project_id = projects[0].get('id') if projects else None
        if not project_id:
            print("❌ No valid project ID found")
            return False
        
        # Create Work Entry
        work_data = {
            "project_id": project_id,
            "hours": 8.0,
            "work_details": "Test work entry",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        success, _ = self.run_test(
            "Create Work Entry",
            "POST",
            "work-entries",
            200,
            data=work_data,
            token=self.employee_token
        )
        if not success:
            return False
        
        # Test exceeding daily limit
        excess_work_data = {
            "project_id": project_id,
            "hours": 1.0,  # This should exceed 8.5 hours limit
            "work_details": "Excess work entry",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        success, _ = self.run_test(
            "Create Excess Work Entry (should fail)",
            "POST",
            "work-entries",
            400,
            data=excess_work_data,
            token=self.employee_token
        )
        
        # Get Work Entries
        success, _ = self.run_test(
            "Get Work Entries",
            "GET",
            "work-entries",
            200,
            token=self.employee_token
        )
        
        return success

    def test_leave_system(self):
        """Test Leave Application and Approval system"""
        print("\n🏖️ Testing Leave System...")
        
        if not self.employee_token:
            print("❌ No employee token available for leave testing")
            return False
        
        # Apply for Leave
        leave_data = {
            "from_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "to_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "leave_type": "PL",
            "reason": "Test leave application"
        }
        success, response = self.run_test(
            "Apply for Leave",
            "POST",
            "leaves/apply",
            200,
            data=leave_data,
            token=self.employee_token
        )
        if not success:
            return False
        
        leave_id = response.get('id')
        
        # Get Leave Applications (Employee view)
        success, _ = self.run_test(
            "Get Employee Leave Applications",
            "GET",
            "leaves/applications",
            200,
            token=self.employee_token
        )
        if not success:
            return False
        
        # Admin/HR approve leave
        approval_data = {
            "status": "approved",
            "comments": "Approved by admin"
        }
        success, _ = self.run_test(
            "Approve Leave (Admin)",
            "PUT",
            f"leaves/applications/{leave_id}/approve",
            200,
            data=approval_data,
            token=self.admin_token
        )
        
        return success

    def test_dashboard_stats(self):
        """Test Dashboard Statistics"""
        print("\n📊 Testing Dashboard Statistics...")
        
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            token=self.admin_token
        )
        
        if success:
            stats = response
            print(f"   Total Employees: {stats.get('total_employees', 0)}")
            print(f"   Total Departments: {stats.get('total_departments', 0)}")
            print(f"   Total Projects: {stats.get('total_projects', 0)}")
            print(f"   Active Projects: {stats.get('active_projects', 0)}")
        
        return success

    def test_leave_tracker(self):
        """Test Leave Tracker (Admin/HR only)"""
        print("\n📋 Testing Leave Tracker...")
        
        success, _ = self.run_test(
            "Get Leave Tracker",
            "GET",
            "leaves/tracker",
            200,
            token=self.admin_token
        )
        
        return success

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete employees (this also deletes associated users)
        for emp_id in self.created_resources['employees']:
            self.run_test(
                f"Delete Employee {emp_id}",
                "DELETE",
                f"employees/{emp_id}",
                200,
                token=self.admin_token
            )
        
        # Delete projects
        for proj_id in self.created_resources['projects']:
            self.run_test(
                f"Delete Project {proj_id}",
                "DELETE",
                f"projects/{proj_id}",
                200,
                token=self.admin_token
            )
        
        # Delete departments
        for dept_id in self.created_resources['departments']:
            self.run_test(
                f"Delete Department {dept_id}",
                "DELETE",
                f"departments/{dept_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Company Portal API Tests...")
    print("=" * 60)
    
    tester = CompanyPortalAPITester()
    
    # Authentication Tests
    print("\n🔐 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    tester.test_employee_login()  # Continue even if employee login fails
    tester.test_invalid_login()
    tester.test_token_validation()
    
    # CRUD Tests (Admin functionality)
    print("\n🛠️ ADMIN CRUD TESTS")
    print("-" * 30)
    
    tester.test_department_crud()
    tester.test_employee_crud()
    tester.test_project_crud()
    
    # Business Logic Tests
    print("\n💼 BUSINESS LOGIC TESTS")
    print("-" * 30)
    
    tester.test_work_entries()
    tester.test_leave_system()
    tester.test_dashboard_stats()
    tester.test_leave_tracker()
    
    # Cleanup
    tester.cleanup_resources()
    
    # Final Results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())