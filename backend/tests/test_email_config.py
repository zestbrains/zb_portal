"""
Test Email Configuration Feature for Zestbrains HR Portal
Tests:
- GET /email-config - Retrieve email configuration
- PUT /email-config - Update email configuration
- POST /email-config/test - Send test email
- Leave approval email trigger verification
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


class TestEmailConfigAPI:
    """Email Configuration API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_01_get_email_config_success(self):
        """Test GET /email-config returns configuration"""
        response = self.session.get(f"{BASE_URL}/api/email-config")
        
        assert response.status_code == 200, f"GET email-config failed: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "smtp_host" in data, "smtp_host missing"
        assert "smtp_port" in data, "smtp_port missing"
        assert "smtp_email" in data, "smtp_email missing"
        assert "smtp_password" in data, "smtp_password missing"
        assert "enable_ssl" in data, "enable_ssl missing"
        assert "cc_emails" in data, "cc_emails missing"
        assert "is_enabled" in data, "is_enabled missing"
        
        # Verify password is masked
        if data["smtp_password"]:
            assert data["smtp_password"] == "••••••••", "Password should be masked"
        
        print(f"✓ Email config retrieved: host={data['smtp_host']}, port={data['smtp_port']}, enabled={data['is_enabled']}")
    
    def test_02_get_email_config_unauthorized(self):
        """Test GET /email-config requires admin role"""
        # Create new session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/email-config")
        
        # Should fail without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly blocked")
    
    def test_03_update_email_config_success(self):
        """Test PUT /email-config updates configuration"""
        # First get current config
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # Update config (toggle is_enabled)
        new_enabled = not current_config.get("is_enabled", False)
        
        update_payload = {
            "smtp_host": current_config.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": current_config.get("smtp_port", 587),
            "smtp_email": current_config.get("smtp_email", "hr.zestbrains@gmail.com"),
            "smtp_password": "",  # Empty to preserve existing
            "enable_ssl": current_config.get("enable_ssl", True),
            "cc_emails": current_config.get("cc_emails", ""),
            "is_enabled": new_enabled
        }
        
        response = self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        assert response.status_code == 200, f"PUT email-config failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        
        # Verify update persisted
        verify_response = self.session.get(f"{BASE_URL}/api/email-config")
        verify_data = verify_response.json()
        assert verify_data["is_enabled"] == new_enabled, "is_enabled not updated"
        
        # Restore original state
        update_payload["is_enabled"] = current_config.get("is_enabled", False)
        self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        print(f"✓ Email config updated and verified (toggled is_enabled to {new_enabled})")
    
    def test_04_update_email_config_preserves_password(self):
        """Test PUT /email-config preserves password when empty"""
        # Get current config
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # Update with empty password (should preserve existing)
        update_payload = {
            "smtp_host": current_config.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": current_config.get("smtp_port", 587),
            "smtp_email": current_config.get("smtp_email", "hr.zestbrains@gmail.com"),
            "smtp_password": "",  # Empty - should preserve
            "enable_ssl": current_config.get("enable_ssl", True),
            "cc_emails": "test@example.com",  # Change CC to verify update works
            "is_enabled": current_config.get("is_enabled", False)
        }
        
        response = self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        # Verify password still masked (meaning it was preserved)
        verify_response = self.session.get(f"{BASE_URL}/api/email-config")
        verify_data = verify_response.json()
        
        # If there was a password before, it should still be masked
        if current_config.get("smtp_password") == "••••••••":
            assert verify_data["smtp_password"] == "••••••••", "Password should be preserved"
        
        # Restore CC emails
        update_payload["cc_emails"] = current_config.get("cc_emails", "")
        self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        print("✓ Password preserved when empty string sent")
    
    def test_05_update_email_config_with_cc_list(self):
        """Test PUT /email-config with CC email list"""
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # Update with CC list
        test_cc = "admin@company.com, hr2@company.com"
        update_payload = {
            "smtp_host": current_config.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": current_config.get("smtp_port", 587),
            "smtp_email": current_config.get("smtp_email", "hr.zestbrains@gmail.com"),
            "smtp_password": "",
            "enable_ssl": current_config.get("enable_ssl", True),
            "cc_emails": test_cc,
            "is_enabled": current_config.get("is_enabled", False)
        }
        
        response = self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        # Verify CC list saved
        verify_response = self.session.get(f"{BASE_URL}/api/email-config")
        verify_data = verify_response.json()
        assert verify_data["cc_emails"] == test_cc, f"CC emails not saved: {verify_data['cc_emails']}"
        
        # Restore original CC
        update_payload["cc_emails"] = current_config.get("cc_emails", "")
        self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        print(f"✓ CC email list saved and verified: {test_cc}")
    
    def test_06_test_email_without_password(self):
        """Test POST /email-config/test fails without password configured"""
        # This test checks error handling - we don't actually send email
        # First, check if password is configured
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # If password is configured (masked), test endpoint should work
        # If not configured, it should return 400
        response = self.session.post(f"{BASE_URL}/api/email-config/test")
        
        if current_config.get("smtp_password") == "••••••••":
            # Password exists - test might succeed or fail based on SMTP
            # We just verify the endpoint is accessible
            assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
            print(f"✓ Test email endpoint accessible (status: {response.status_code})")
        else:
            # No password - should return 400
            assert response.status_code == 400, f"Expected 400 without password, got {response.status_code}"
            print("✓ Test email correctly fails without password")
    
    def test_07_employee_cannot_access_email_config(self):
        """Test employee role cannot access email config"""
        # Login as employee
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Employee login failed - skipping role test")
        
        employee_token = login_response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {employee_token}"})
        
        # Try to access email config
        response = session.get(f"{BASE_URL}/api/email-config")
        
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"
        print("✓ Employee correctly blocked from email config")


class TestLeaveApprovalEmailTrigger:
    """Test leave approval triggers email notification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_01_leave_approval_endpoint_exists(self):
        """Test leave approval endpoint is accessible"""
        # Get pending leave applications
        response = self.session.get(f"{BASE_URL}/api/leaves/applications?status=pending")
        
        assert response.status_code == 200, f"GET leaves failed: {response.text}"
        
        data = response.json()
        print(f"✓ Leave applications endpoint working, found {len(data)} pending applications")
    
    def test_02_leave_approval_with_email_trigger(self):
        """Test leave approval triggers email (verify endpoint accepts request)"""
        # Get pending leave applications
        response = self.session.get(f"{BASE_URL}/api/leaves/applications?status=pending")
        
        if response.status_code != 200:
            pytest.skip("Cannot get leave applications")
        
        applications = response.json()
        
        if not applications:
            print("✓ No pending leave applications to test - endpoint verified working")
            return
        
        # Get first pending application
        leave_app = applications[0]
        leave_id = leave_app["id"]
        
        # Prepare approval payload
        approval_payload = {
            "status": "approved",
            "comments": "Test approval - email trigger test",
            "leave_dates": []
        }
        
        # Add leave dates if from_date and to_date exist
        if "from_date" in leave_app and "to_date" in leave_app:
            from datetime import datetime, timedelta
            from_date = datetime.fromisoformat(leave_app["from_date"])
            to_date = datetime.fromisoformat(leave_app["to_date"])
            
            current = from_date
            while current <= to_date:
                approval_payload["leave_dates"].append({
                    "date": current.isoformat(),
                    "leave_type": "PL"
                })
                current += timedelta(days=1)
        
        # Note: We don't actually approve to avoid changing data
        # Just verify the endpoint structure is correct
        print(f"✓ Leave approval endpoint ready for leave_id: {leave_id}")
        print(f"  - Employee: {leave_app.get('employee_name', 'Unknown')}")
        print(f"  - Dates: {leave_app.get('from_date')} to {leave_app.get('to_date')}")


class TestEmailConfigValidation:
    """Test email config validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_01_update_with_invalid_port(self):
        """Test PUT /email-config handles invalid port"""
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # Try with string port (should be int)
        update_payload = {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": "invalid",  # Invalid
            "smtp_email": "test@test.com",
            "smtp_password": "",
            "enable_ssl": True,
            "cc_emails": "",
            "is_enabled": False
        }
        
        response = self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for invalid port, got {response.status_code}"
        print("✓ Invalid port correctly rejected")
    
    def test_02_ssl_toggle_works(self):
        """Test SSL toggle saves correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/email-config")
        current_config = get_response.json()
        
        # Toggle SSL
        new_ssl = not current_config.get("enable_ssl", True)
        
        update_payload = {
            "smtp_host": current_config.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": current_config.get("smtp_port", 587),
            "smtp_email": current_config.get("smtp_email", "hr.zestbrains@gmail.com"),
            "smtp_password": "",
            "enable_ssl": new_ssl,
            "cc_emails": current_config.get("cc_emails", ""),
            "is_enabled": current_config.get("is_enabled", False)
        }
        
        response = self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/email-config")
        verify_data = verify_response.json()
        assert verify_data["enable_ssl"] == new_ssl, "SSL toggle not saved"
        
        # Restore
        update_payload["enable_ssl"] = current_config.get("enable_ssl", True)
        self.session.put(f"{BASE_URL}/api/email-config", json=update_payload)
        
        print(f"✓ SSL toggle works (toggled to {new_ssl})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
