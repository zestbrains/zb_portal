"""Backend tests for Clients & Invoices modules"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

ADMIN_USER = "renish"
ADMIN_PASS = "Zb@0075588"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def bank_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/banks", headers=auth_headers)
    assert r.status_code == 200, f"GET /api/banks: {r.status_code} {r.text}"
    banks = r.json()
    assert isinstance(banks, list) and len(banks) > 0, "No banks present - cannot run invoice tests"
    return banks[0]["id"]


# ============ CLIENTS ============
class TestClients:
    created_client_id = None

    def test_01_list_clients_initial(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_02_create_client_with_extras(self, auth_headers):
        payload = {
            "name": "TEST_Acme_Corp",
            "address": "1 Main St",
            "country": "USA",
            "city": "NY",
            "email": "billing@acme.test",
            "phone": "+1 555 1234",
            "extra_params": [
                {"key": "PO Number", "value": "PO-2026-001"},
                {"key": "Tax ID", "value": "TX-7788"},
            ],
        }
        r = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Acme_Corp"
        assert data["country"] == "USA"
        assert "id" in data
        assert len(data["extra_params"]) == 2
        assert data["extra_params"][0]["key"] == "PO Number"
        TestClients.created_client_id = data["id"]

        # Verify via GET list
        g = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        names = [c["name"] for c in g.json()]
        assert "TEST_Acme_Corp" in names

    def test_03_duplicate_client_name_rejected(self, auth_headers):
        payload = {"name": "TEST_Acme_Corp", "country": "USA"}
        r = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json=payload)
        assert r.status_code == 400, r.text

    def test_04_update_client(self, auth_headers):
        cid = TestClients.created_client_id
        assert cid
        payload = {
            "name": "TEST_Acme_Corp_Updated",
            "address": "2 Updated Rd",
            "country": "USA",
            "city": "LA",
            "extra_params": [{"key": "PO Number", "value": "PO-2026-002"}],
        }
        r = requests.put(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Acme_Corp_Updated"
        assert data["address"] == "2 Updated Rd"
        assert len(data["extra_params"]) == 1


# ============ INVOICES ============
class TestInvoices:
    created_export_inv_id = None
    second_export_inv_id = None
    created_gst_inv_id = None
    client_id = None

    @pytest.fixture(autouse=True)
    def setup_client(self, auth_headers):
        """Ensure we have a client for invoice tests"""
        if not TestInvoices.client_id:
            # Create dedicated invoice test client
            r = requests.post(
                f"{BASE_URL}/api/clients",
                headers=auth_headers,
                json={"name": "TEST_Invoice_Client", "country": "USA", "city": "NY"},
            )
            if r.status_code == 200:
                TestInvoices.client_id = r.json()["id"]
            else:
                # maybe exists - look up
                g = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers).json()
                for c in g:
                    if c["name"] == "TEST_Invoice_Client":
                        TestInvoices.client_id = c["id"]
                        break

    def test_01_next_number_export_pre_april(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/invoices/next-number",
            headers=auth_headers,
            params={"type": "export", "invoice_date": "2026-02-15"},
        )
        assert r.status_code == 200, r.text
        num = r.json()["invoice_number"]
        assert num.startswith("Exp/"), num
        assert num.endswith("/2025-26"), f"Expected FY 2025-26, got {num}"

    def test_02_next_number_export_post_april(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/invoices/next-number",
            headers=auth_headers,
            params={"type": "export", "invoice_date": "2026-04-15"},
        )
        assert r.status_code == 200, r.text
        num = r.json()["invoice_number"]
        assert num.startswith("Exp/")
        assert num.endswith("/2026-27"), f"Expected FY 2026-27, got {num}"

    def test_03_next_number_gst(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/invoices/next-number",
            headers=auth_headers,
            params={"type": "gst"},
        )
        assert r.status_code == 200, r.text
        num = r.json()["invoice_number"]
        assert num.startswith("GST/"), num

    def test_04_create_export_invoice(self, auth_headers, bank_id):
        cid = TestInvoices.client_id
        assert cid, "No client_id set"
        payload = {
            "type": "export",
            "invoice_date": "2026-04-20",
            "country_of_origin": "India",
            "bank_id": bank_id,
            "client_id": cid,
            "items": [
                {"item": "Dev Hours", "description": "Backend dev", "quantity": 100, "amount": 50, "currency": "USD"},
                {"item": "QA Hours", "description": "Testing", "quantity": 40, "amount": 35, "currency": "USD"},
            ],
            "notes": "TEST export invoice",
            "discount": 0,
            "status": "draft",
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["type"] == "export"
        assert data["invoice_number"].startswith("Exp/")
        assert data["invoice_number"].endswith("/2026-27")
        assert len(data["items"]) == 2
        TestInvoices.created_export_inv_id = data["id"]
        TestInvoices.first_export_number = data["invoice_number"]

    def test_05_auto_increment_export(self, auth_headers, bank_id):
        cid = TestInvoices.client_id
        payload = {
            "type": "export",
            "invoice_date": "2026-05-01",
            "bank_id": bank_id,
            "client_id": cid,
            "items": [{"item": "Item 2", "quantity": 1, "amount": 100, "currency": "USD"}],
            "status": "draft",
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        # Should be a higher sequence than the first one in same FY
        first = TestInvoices.first_export_number  # like Exp/001/2026-27
        first_seq = int(first.split("/")[1])
        new_seq = int(data["invoice_number"].split("/")[1])
        assert new_seq == first_seq + 1, f"Expected seq {first_seq+1}, got {data['invoice_number']}"
        assert data["invoice_number"].endswith("/2026-27")
        TestInvoices.second_export_inv_id = data["id"]

    def test_06_create_gst_invoice(self, auth_headers, bank_id):
        cid = TestInvoices.client_id
        payload = {
            "type": "gst",
            "invoice_date": "2026-04-20",
            "bank_id": bank_id,
            "client_id": cid,
            "items": [
                {"item": "Consulting", "description": "Strategy", "quantity": 10, "amount": 5000,
                 "currency": "INR", "sac": "998314", "tax_percent": 18},
            ],
            "tax_mode": "cgst_sgst",
            "cgst_amount": 4500,
            "sgst_amount": 4500,
            "status": "draft",
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["type"] == "gst"
        assert data["invoice_number"].startswith("GST/")
        assert data["tax_mode"] == "cgst_sgst"
        TestInvoices.created_gst_inv_id = data["id"]

    def test_07_list_invoices_filter_export(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers, params={"type": "export"})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 2
        assert all(i["type"] == "export" for i in items)

    def test_08_get_invoice(self, auth_headers):
        iid = TestInvoices.created_export_inv_id
        r = requests.get(f"{BASE_URL}/api/invoices/{iid}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == iid

    def test_09_pdf_download(self, auth_headers):
        iid = TestInvoices.created_export_inv_id
        r = requests.get(f"{BASE_URL}/api/invoices/{iid}/pdf", headers=auth_headers)
        assert r.status_code == 200, r.text[:400]
        assert "application/pdf" in r.headers.get("Content-Type", "")
        assert r.content[:4] == b"%PDF", f"Bad PDF header: {r.content[:8]}"

    def test_10_pdf_gst(self, auth_headers):
        iid = TestInvoices.created_gst_inv_id
        r = requests.get(f"{BASE_URL}/api/invoices/{iid}/pdf", headers=auth_headers)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_11_update_invoice(self, auth_headers, bank_id):
        iid = TestInvoices.created_export_inv_id
        cid = TestInvoices.client_id
        payload = {
            "type": "export",
            "invoice_date": "2026-04-20",
            "bank_id": bank_id,
            "client_id": cid,
            "items": [{"item": "Updated", "quantity": 5, "amount": 200, "currency": "USD"}],
            "status": "sent",
        }
        r = requests.put(f"{BASE_URL}/api/invoices/{iid}", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "sent"
        assert len(data["items"]) == 1
        assert data["items"][0]["item"] == "Updated"

    def test_12_validation_missing_bank(self, auth_headers):
        cid = TestInvoices.client_id
        payload = {
            "type": "export",
            "invoice_date": "2026-04-20",
            "bank_id": "non-existent-bank-id",
            "client_id": cid,
            "items": [{"item": "x", "quantity": 1, "amount": 1, "currency": "USD"}],
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 400, r.text

    def test_13_validation_missing_client(self, auth_headers, bank_id):
        payload = {
            "type": "export",
            "invoice_date": "2026-04-20",
            "bank_id": bank_id,
            "client_id": "non-existent-client-id",
            "items": [{"item": "x", "quantity": 1, "amount": 1, "currency": "USD"}],
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 400, r.text

    def test_14_validation_empty_items(self, auth_headers, bank_id):
        cid = TestInvoices.client_id
        payload = {
            "type": "export",
            "invoice_date": "2026-04-20",
            "bank_id": bank_id,
            "client_id": cid,
            "items": [],
        }
        r = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=payload)
        assert r.status_code == 400, r.text

    def test_15_delete_client_used_in_invoice(self, auth_headers):
        """Client TEST_Invoice_Client is used in invoices -> should 400"""
        cid = TestInvoices.client_id
        r = requests.delete(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)
        assert r.status_code == 400, r.text

    def test_16_delete_invoices_then_client(self, auth_headers):
        for iid in [TestInvoices.created_export_inv_id, TestInvoices.second_export_inv_id, TestInvoices.created_gst_inv_id]:
            if iid:
                r = requests.delete(f"{BASE_URL}/api/invoices/{iid}", headers=auth_headers)
                assert r.status_code == 200, r.text
        # Now delete client should succeed
        cid = TestInvoices.client_id
        r = requests.delete(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)
        assert r.status_code == 200, r.text

        # Also cleanup the TEST_Acme_Corp_Updated created in TestClients
        g = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers).json()
        for c in g:
            if c["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/clients/{c['id']}", headers=auth_headers)
