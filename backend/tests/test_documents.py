"""
Backend tests for Document Generation API endpoints
Tests: POST /documents/generate, GET /documents/{employee_id}, GET /documents/download/{doc_id}, DELETE /documents/{doc_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDocumentAPI:
    """Document generation and management API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_user = login_response.json().get("user")
        
        # Get an employee for testing
        emp_response = self.session.get(f"{BASE_URL}/api/employees")
        if emp_response.status_code == 200 and emp_response.json():
            self.test_employee = emp_response.json()[0]
            self.test_employee_id = self.test_employee.get("employee_id")
        else:
            pytest.skip("No employees found for testing")
    
    def test_get_employees_list(self):
        """Test that employees list is accessible"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)
        assert len(employees) > 0
        print(f"SUCCESS: Found {len(employees)} employees")
    
    def test_generate_offer_letter(self):
        """Test generating an offer letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "offer_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/001",
                "designation": "Software Engineer",
                "department": "Development",
                "offered_salary": "50000",
                "joining_date": "2026-02-01",
                "probation_period": "6 Months",
                "work_location": "Ahmedabad"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate offer letter: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "letter_title" in data
        assert data["letter_title"] == "Offer Letter"
        assert "pdf_base64" in data
        assert len(data["pdf_base64"]) > 100  # PDF should have substantial content
        assert "created_at" in data
        
        # Store doc_id for later tests
        self.generated_doc_id = data["id"]
        print(f"SUCCESS: Generated offer letter with ID: {self.generated_doc_id}")
        return data["id"]
    
    def test_generate_appointment_letter(self):
        """Test generating an appointment letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "appointment_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/002",
                "designation": "Software Engineer",
                "department": "Development",
                "salary": "50000",
                "joining_date": "2026-02-01",
                "probation_period": "6 Months",
                "work_location": "Ahmedabad",
                "working_hours": "9:30 AM to 6:30 PM, Monday to Friday"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate appointment letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Appointment Letter"
        print(f"SUCCESS: Generated appointment letter with ID: {data['id']}")
    
    def test_generate_experience_letter(self):
        """Test generating an experience letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "experience_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/003",
                "designation": "Software Engineer",
                "joining_date": "2024-01-01",
                "last_working_date": "2026-01-15",
                "performance_note": "Excellent performance throughout the tenure."
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate experience letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Experience Letter"
        print(f"SUCCESS: Generated experience letter with ID: {data['id']}")
    
    def test_generate_relieving_letter(self):
        """Test generating a relieving letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "relieving_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/004",
                "designation": "Software Engineer",
                "joining_date": "2024-01-01",
                "last_working_date": "2026-01-15"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate relieving letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Relieving Letter"
        print(f"SUCCESS: Generated relieving letter with ID: {data['id']}")
    
    def test_generate_internship_appointment_letter(self):
        """Test generating an internship appointment letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "internship_appointment",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/005",
                "department": "Development",
                "internship_duration": "3 Months",
                "start_date": "2026-02-01",
                "end_date": "2026-04-30",
                "stipend": "15000",
                "work_location": "Ahmedabad",
                "working_hours": "9:30 AM to 6:30 PM, Monday to Friday"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate internship appointment letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Internship Appointment Letter"
        print(f"SUCCESS: Generated internship appointment letter with ID: {data['id']}")
    
    def test_generate_internship_completion_letter(self):
        """Test generating an internship completion certificate PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "internship_completion",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/006",
                "department": "Development",
                "start_date": "2025-10-01",
                "end_date": "2025-12-31",
                "project_details": "Web application development using React and FastAPI",
                "performance_note": "Demonstrated excellent technical skills and teamwork."
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate internship completion letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Internship Completion Certificate"
        print(f"SUCCESS: Generated internship completion certificate with ID: {data['id']}")
    
    def test_generate_increment_letter(self):
        """Test generating an increment letter PDF"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "increment_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "ref_no": "ZB/2026/TEST/007",
                "designation": "Software Engineer",
                "new_designation": "Senior Software Engineer",
                "old_salary": "50000",
                "new_salary": "60000",
                "increment_percentage": "20",
                "effective_date": "2026-02-01"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 200, f"Failed to generate increment letter: {response.text}"
        
        data = response.json()
        assert data["letter_title"] == "Increment Letter"
        print(f"SUCCESS: Generated increment letter with ID: {data['id']}")
    
    def test_get_employee_documents(self):
        """Test getting all documents for an employee"""
        response = self.session.get(f"{BASE_URL}/api/documents/{self.test_employee_id}")
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        
        docs = response.json()
        assert isinstance(docs, list)
        print(f"SUCCESS: Found {len(docs)} documents for employee {self.test_employee_id}")
        
        # Verify document structure
        if docs:
            doc = docs[0]
            assert "id" in doc
            assert "employee_id" in doc
            assert "letter_type" in doc
            assert "letter_title" in doc
            assert "created_at" in doc
            # pdf_data should NOT be included in list response
            assert "pdf_data" not in doc
            print(f"SUCCESS: Document structure is correct")
        
        return docs
    
    def test_download_document(self):
        """Test downloading a document as PDF"""
        # First generate a document
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "offer_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "designation": "Test Engineer",
                "department": "QA",
                "offered_salary": "40000",
                "joining_date": "2026-02-01"
            }
        }
        
        gen_response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert gen_response.status_code == 200
        doc_id = gen_response.json()["id"]
        
        # Now download it
        download_response = self.session.get(f"{BASE_URL}/api/documents/download/{doc_id}")
        assert download_response.status_code == 200, f"Failed to download document: {download_response.text}"
        
        # Check content type is PDF
        content_type = download_response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check content disposition header
        content_disp = download_response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got: {content_disp}"
        
        # Check PDF content starts with PDF magic bytes
        pdf_content = download_response.content
        assert pdf_content[:4] == b'%PDF', "Downloaded content is not a valid PDF"
        
        print(f"SUCCESS: Downloaded PDF document ({len(pdf_content)} bytes)")
        return doc_id
    
    def test_delete_document(self):
        """Test deleting a document"""
        # First generate a document to delete
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "offer_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "designation": "To Be Deleted",
                "department": "Test",
                "offered_salary": "10000",
                "joining_date": "2026-02-01"
            }
        }
        
        gen_response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert gen_response.status_code == 200
        doc_id = gen_response.json()["id"]
        
        # Delete the document
        delete_response = self.session.delete(f"{BASE_URL}/api/documents/{doc_id}")
        assert delete_response.status_code == 200, f"Failed to delete document: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("status") == "deleted"
        
        # Verify document is gone
        download_response = self.session.get(f"{BASE_URL}/api/documents/download/{doc_id}")
        assert download_response.status_code == 404, "Document should not exist after deletion"
        
        print(f"SUCCESS: Deleted document {doc_id}")
    
    def test_generate_invalid_letter_type(self):
        """Test generating with invalid letter type returns error"""
        payload = {
            "employee_id": self.test_employee_id,
            "letter_type": "invalid_type",
            "inputs": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid letter type, got: {response.status_code}"
        print("SUCCESS: Invalid letter type correctly rejected")
    
    def test_generate_missing_employee_id(self):
        """Test generating without employee_id returns error"""
        payload = {
            "letter_type": "offer_letter",
            "inputs": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing employee_id, got: {response.status_code}"
        print("SUCCESS: Missing employee_id correctly rejected")
    
    def test_generate_nonexistent_employee(self):
        """Test generating for non-existent employee returns error"""
        payload = {
            "employee_id": "NONEXISTENT_999",
            "letter_type": "offer_letter",
            "inputs": {
                "letter_date": "2026-01-15",
                "designation": "Test",
                "department": "Test",
                "offered_salary": "10000",
                "joining_date": "2026-02-01"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/documents/generate", json=payload)
        assert response.status_code == 404, f"Expected 404 for non-existent employee, got: {response.status_code}"
        print("SUCCESS: Non-existent employee correctly rejected")
    
    def test_download_nonexistent_document(self):
        """Test downloading non-existent document returns 404"""
        response = self.session.get(f"{BASE_URL}/api/documents/download/nonexistent-doc-id")
        assert response.status_code == 404, f"Expected 404 for non-existent document, got: {response.status_code}"
        print("SUCCESS: Non-existent document download correctly returns 404")
    
    def test_delete_nonexistent_document(self):
        """Test deleting non-existent document returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/documents/nonexistent-doc-id")
        assert response.status_code == 404, f"Expected 404 for non-existent document, got: {response.status_code}"
        print("SUCCESS: Non-existent document delete correctly returns 404")


class TestEmployeeDetailPage:
    """Tests for employee detail page API requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "renish",
            "password": "Zb@0075588"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_employees_for_detail_page(self):
        """Test getting employees list for detail page"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        
        employees = response.json()
        assert len(employees) > 0
        
        # Check employee has required fields for detail page
        emp = employees[0]
        required_fields = ["employee_id", "name", "email", "phone", "status", "role"]
        for field in required_fields:
            assert field in emp, f"Missing required field: {field}"
        
        print(f"SUCCESS: Employee data has all required fields")
    
    def test_get_departments(self):
        """Test getting departments for employee detail"""
        response = self.session.get(f"{BASE_URL}/api/departments")
        assert response.status_code == 200
        
        departments = response.json()
        assert isinstance(departments, list)
        print(f"SUCCESS: Found {len(departments)} departments")
    
    def test_get_banks(self):
        """Test getting banks for employee detail"""
        response = self.session.get(f"{BASE_URL}/api/banks")
        assert response.status_code == 200
        
        banks = response.json()
        assert isinstance(banks, list)
        print(f"SUCCESS: Found {len(banks)} banks")


# Cleanup test documents after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_documents():
    """Cleanup test-generated documents after all tests"""
    yield
    # Cleanup would go here if needed
    # For now, we leave test documents as they may be useful for manual verification


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
