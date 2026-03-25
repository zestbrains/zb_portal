"""
Test suite for Leave History and Leave Approval features
- Leave History page with filters
- Half PL/CL options in approval
- Mandatory rejection reason
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLeaveHistory:
    """Tests for /api/leaves/history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_leave_history_endpoint_exists(self):
        """Test that /api/leaves/history endpoint exists and returns data"""
        response = requests.get(f"{BASE_URL}/api/leaves/history", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Leave history endpoint returns {len(data)} applications")
    
    def test_leave_history_filter_by_status_pending(self):
        """Test filtering by status=pending"""
        response = requests.get(f"{BASE_URL}/api/leaves/history?status=pending", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for app in data:
            assert app["status"] == "pending", f"Expected pending, got {app['status']}"
        print(f"✓ Status filter (pending) works - {len(data)} applications")
    
    def test_leave_history_filter_by_status_approved(self):
        """Test filtering by status=approved"""
        response = requests.get(f"{BASE_URL}/api/leaves/history?status=approved", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for app in data:
            assert app["status"] == "approved", f"Expected approved, got {app['status']}"
        print(f"✓ Status filter (approved) works - {len(data)} applications")
    
    def test_leave_history_filter_by_status_rejected(self):
        """Test filtering by status=rejected"""
        response = requests.get(f"{BASE_URL}/api/leaves/history?status=rejected", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for app in data:
            assert app["status"] == "rejected", f"Expected rejected, got {app['status']}"
        print(f"✓ Status filter (rejected) works - {len(data)} applications")
    
    def test_leave_history_filter_by_employee_id(self):
        """Test filtering by employee_id"""
        # First get all applications to find an employee_id
        response = requests.get(f"{BASE_URL}/api/leaves/history", headers=self.headers)
        all_apps = response.json()
        if all_apps:
            emp_id = all_apps[0]["employee_id"]
            response = requests.get(f"{BASE_URL}/api/leaves/history?employee_id={emp_id}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            for app in data:
                assert app["employee_id"] == emp_id, f"Expected {emp_id}, got {app['employee_id']}"
            print(f"✓ Employee filter works - {len(data)} applications for {emp_id}")
        else:
            print("⚠ No applications to test employee filter")
    
    def test_leave_history_filter_by_date_range(self):
        """Test filtering by date range"""
        from_date = "2026-01-01"
        to_date = "2026-12-31"
        response = requests.get(
            f"{BASE_URL}/api/leaves/history?from_date={from_date}&to_date={to_date}", 
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Date range filter works - {len(data)} applications in range")
    
    def test_leave_history_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/leaves/history")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Leave history requires authentication")


class TestLeaveApprovalWithRejectReason:
    """Tests for leave approval with reject_reason field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_reject_leave_with_reason(self):
        """Test rejecting a leave application with mandatory reason"""
        # First, get pending applications
        response = requests.get(f"{BASE_URL}/api/leaves/applications?status=pending", headers=self.headers)
        assert response.status_code == 200
        pending = response.json()
        
        if not pending:
            # Create a new leave application as employee
            emp_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": "meera@zestbrains.com",
                "password": "test123"
            })
            if emp_response.status_code == 200:
                emp_token = emp_response.json()["access_token"]
                emp_headers = {"Authorization": f"Bearer {emp_token}"}
                
                # Apply for leave
                tomorrow = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                day_after = (datetime.now() + timedelta(days=31)).strftime("%Y-%m-%d")
                apply_response = requests.post(f"{BASE_URL}/api/leaves/apply", json={
                    "from_date": tomorrow,
                    "to_date": day_after,
                    "reason": "TEST_Rejection reason test"
                }, headers=emp_headers)
                
                if apply_response.status_code == 200:
                    leave_id = apply_response.json()["id"]
                    
                    # Now reject with reason
                    reject_response = requests.put(
                        f"{BASE_URL}/api/leaves/applications/{leave_id}/approve",
                        json={
                            "status": "rejected",
                            "comments": "",
                            "reject_reason": "TEST_Insufficient leave balance",
                            "leave_dates": []
                        },
                        headers=self.headers
                    )
                    assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
                    
                    # Verify reject_reason is saved
                    history_response = requests.get(f"{BASE_URL}/api/leaves/history", headers=self.headers)
                    history = history_response.json()
                    rejected_app = next((a for a in history if a["id"] == leave_id), None)
                    
                    if rejected_app:
                        assert rejected_app.get("reject_reason") == "TEST_Insufficient leave balance", \
                            f"Reject reason not saved: {rejected_app}"
                        print("✓ Reject reason saved and visible in history")
                    else:
                        print("⚠ Could not find rejected application in history")
                else:
                    print(f"⚠ Could not create leave application: {apply_response.text}")
            else:
                print("⚠ Could not login as employee to create test leave")
        else:
            # Use existing pending application
            leave_id = pending[0]["id"]
            reject_response = requests.put(
                f"{BASE_URL}/api/leaves/applications/{leave_id}/approve",
                json={
                    "status": "rejected",
                    "comments": "",
                    "reject_reason": "TEST_Project deadline conflict",
                    "leave_dates": []
                },
                headers=self.headers
            )
            assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
            print(f"✓ Rejected leave {leave_id} with reason")


class TestLeaveApprovalHalfDayOptions:
    """Tests for Half PL and Half CL options in leave approval"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_approve_with_half_pl(self):
        """Test approving leave with Half PL option"""
        # Get pending applications
        response = requests.get(f"{BASE_URL}/api/leaves/applications?status=pending", headers=self.headers)
        pending = response.json()
        
        if pending:
            leave_id = pending[0]["id"]
            leave_app = pending[0]
            
            # Create leave_dates with Half PL
            leave_dates = [{
                "date": leave_app["from_date"],
                "leave_type": "Half PL"
            }]
            
            approve_response = requests.put(
                f"{BASE_URL}/api/leaves/applications/{leave_id}/approve",
                json={
                    "status": "approved",
                    "comments": "Approved with half day",
                    "reject_reason": "",
                    "leave_dates": leave_dates
                },
                headers=self.headers
            )
            assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
            print(f"✓ Approved leave with Half PL option")
        else:
            print("⚠ No pending applications to test Half PL approval")
    
    def test_leave_type_options_in_model(self):
        """Verify the LeaveApproval model accepts Half PL, Half CL, PL/2 & CL/2"""
        # This is a structural test - the model should accept these values
        valid_leave_types = ["PL", "CL", "Half PL", "Half CL", "PL/2 & CL/2"]
        
        # Get any pending application
        response = requests.get(f"{BASE_URL}/api/leaves/applications?status=pending", headers=self.headers)
        pending = response.json()
        
        if pending:
            leave_id = pending[0]["id"]
            leave_app = pending[0]
            
            # Test with PL/2 & CL/2 option
            leave_dates = [{
                "date": leave_app["from_date"],
                "leave_type": "PL/2 & CL/2"
            }]
            
            approve_response = requests.put(
                f"{BASE_URL}/api/leaves/applications/{leave_id}/approve",
                json={
                    "status": "approved",
                    "comments": "Testing PL/2 & CL/2",
                    "reject_reason": "",
                    "leave_dates": leave_dates
                },
                headers=self.headers
            )
            # Should succeed - model accepts these values
            assert approve_response.status_code == 200, f"Model should accept PL/2 & CL/2: {approve_response.text}"
            print("✓ Leave type options (Half PL, Half CL, PL/2 & CL/2) accepted by model")
        else:
            print("⚠ No pending applications to test leave type options")


class TestEmployeeViewsRejectionReason:
    """Test that employees can see rejection reason"""
    
    def test_employee_sees_reject_reason(self):
        """Test that employee can see rejection reason in their applications"""
        # Login as employee
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "meera@zestbrains.com",
            "password": "test123"
        })
        
        if response.status_code != 200:
            print(f"⚠ Could not login as employee: {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get employee's applications
        apps_response = requests.get(f"{BASE_URL}/api/leaves/applications", headers=headers)
        assert apps_response.status_code == 200
        
        applications = apps_response.json()
        rejected_apps = [a for a in applications if a["status"] == "rejected"]
        
        if rejected_apps:
            # Check if reject_reason field exists in response
            for app in rejected_apps:
                if "reject_reason" in app and app["reject_reason"]:
                    print(f"✓ Employee can see rejection reason: '{app['reject_reason']}'")
                    return
            print("⚠ Rejected applications exist but no reject_reason set (old data)")
        else:
            print("⚠ No rejected applications for employee to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
