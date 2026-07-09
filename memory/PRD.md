# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains - employees, attendance, leave, payroll, banks, projects, clients, and invoicing.

## Admin Credentials
- Username: renish / Password: Zb@0075588

## URL
https://payroll-mgmt-app.preview.emergentagent.com

---

## Recent Changes

### Feb 2026 — Sandwich Leave Rule (Aggressive)
- **Changed sandwich detection threshold from `leave_groups >= 2` to `leave_groups >= 1`** across 6 code sites in `/app/backend/server.py` (lines 5117, 5496, 5923, 6580, 6791, 6964).
- **New rule**: A weekend/holiday counts as sandwich if it belongs to a consecutive (leave|nonworking) chain containing **at least one full-day leave** (PL, CL, PL/2 & CL/2). Half-day leaves (Half PL, Half CL, PL/2) still break the chain.
- **Examples**:
  1. Fri leave + Sat WO + Sun WO + Mon leave → 4 days deducted
  2. Mon leave + Tue Public Holiday + Wed leave → 3 days deducted
  3. Mon–Fri leave (5) → weekends before AND after become sandwich → 9 days deducted
- **Verified**: Milan Tandel (emp 1) July 2026 → sandwich_days=4 (weekends 11,12,18,19) + 5 leaves = 9 days total.
- Testing agent iteration_9 all 7 backend cases passed.

### May 2026 — Clients & Invoices Modules
- **Clients module** (under Admin > Settings > Clients): CRUD for client master data (name, address, country, city, email, phone, PAN, GST). Supports dynamic extra parameters (key/value pairs) that render on the invoice PDF.
- **Invoices module** (top-level Admin menu): Export & GST tabs. Auto-incrementing invoice number per Indian Financial Year (Apr 1 to Mar 31).
  - Format: `Exp/001/2026-27` or `GST/001/2026-27`
  - Sequence resets per FY per invoice type
- **Invoice fields**: invoice_date, country_of_origin, billed_by (Bank dropdown), billed_to (Client dropdown), items (item, description, qty, amount, currency, SAC, tax_percent for GST), notes, discount, status (draft/sent/paid)
- **GST invoices**: supports `cgst_sgst` (intra-state) or `igst` (inter-state) tax modes; tax auto-calculated from per-item tax_percent or manually overridden
- **PDF generation**: New `/app/backend/invoice_generator.py` uses FPDF + Poppins font + Zestbrains logo. Branded header, side-by-side Billed By / Billed To, items table, totals box, bank details, footer: "For any enquiry, reach out via email at hello@zestbrains.com, call on +91 72260 62508. This is an electronically generated document, no signature is required."

### April 2026
- Ex-employee salary pro-rating with last_working_date; auto left_days & deductions; "L" in attendance
- Project Email: Separate SMTP config + async BackgroundTask on project create
- Projects: POC, Platform fields + Send Mail button
- Bank module: Added 7 fields (PAN, GST, Address, IFSC, Swift, A/c Holder, Bank Name)
- Sandwich Rule (Feb 2026): 1+ leave group in chain → all adjacent non-working days = sandwich (aggressive)
- OT: Admin-approved weekend entries bypass 4.5h threshold
- Duplicate email login fix (checks password across all accounts sharing the email)

---

## Backend API Endpoints (new)

### Clients
- `GET /api/clients`
- `POST /api/clients`
- `PUT /api/clients/{id}`
- `DELETE /api/clients/{id}` (blocks if referenced by any invoice)

### Invoices
- `GET /api/invoices?type=export|gst`
- `GET /api/invoices/next-number?type=export|gst&invoice_date=YYYY-MM-DD`
- `GET /api/invoices/{id}`
- `POST /api/invoices`
- `PUT /api/invoices/{id}`
- `DELETE /api/invoices/{id}`
- `GET /api/invoices/{id}/pdf` — returns `application/pdf`

---

## DB Collections (new)
- `clients`: {id, name, address, country, city, pancard, gst, email, phone, extra_params: [{key,value}], is_active, created_at, updated_at}
- `invoices`: {id, invoice_number, type, invoice_date, country_of_origin, bank_id, client_id, items[], notes, discount, tax_mode, cgst_amount, sgst_amount, igst_amount, status, created_at, updated_at, created_by}

---

## Backlog / Roadmap

### P1
- Weekend working hours: investigate reported slowness (awaiting user repro details)

### P2
- Configure dynamic thresholds for Late Coming salary deductions (currently hardcoded)
- Bulk bank assignment for employees
- Refactor `server.py` (>7400 lines) into modular `routes/`, `models/`, `services/` folders
- Suppress non-fatal `bcrypt __about__` warning polluting logs
- Add Send Invoice via Email (using existing SMTP config) directly from Invoices list

---

## Tech Stack
React 18 (CRA) · FastAPI · MongoDB (Motor) · FPDF2 · Poppins font · Tailwind + shadcn/ui · supervisor

## File References
- `/app/backend/server.py` — main monolith (clients & invoices CRUD appended at end)
- `/app/backend/invoice_generator.py` — invoice PDF generator
- `/app/backend/document_generator.py` — HR letter PDF generator
- `/app/backend/zestbrains_logo.png` — logo used in invoice PDFs
- `/app/frontend/src/pages/admin/Clients.js`
- `/app/frontend/src/pages/admin/Invoices.js`
- `/app/frontend/src/components/layout/Layout.js`
