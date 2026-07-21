# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains - employees, attendance, leave, payroll, banks, projects, clients, and invoicing.

## Admin Credentials
- Username: renish / Password: Zb@0075588

## URL
https://payroll-mgmt-app.preview.emergentagent.com

---

## Recent Changes

### Feb 2026 — Salary Slip Generator (Month-wise, Documents Tab)
- New `/app/backend/salary_slip_generator.py` using fpdf2 + num2words (en_IN locale) recreates the "Form IV B [Rule 26(2)(b)]" sample layout.
- New endpoint `POST /api/documents/salary-slip {employee_id, year, month}` in `/app/backend/server.py` — reuses `get_salary()` for computation, persists to `db.documents` with `letter_type='salary_slip'`.
- CTC split: Basic 50%, HRA 20%, SP.ALL 30%. Payable amounts pro-rated by `(num_days - unpaid_days) / num_days`. Incentive = OT + Extra Hours + Other Income.
- Deductions section: PF, ESI, PT, IT, LWF, Advance, Loan, CPF (Company) or Oth. Ded, Food, E-Mbill.
- Working details: Working Days, Weekoff, Pay Holiday, Present Days, CL, PL, SL, M.L., LWP (= sandwich + not_joined + left).
- Frontend: Documents tab in `EmployeeDetail.js` shows a "Salary Slip (Month-wise)" section (data-testid `salary-slip-section`) with month/year selectors and Generate button. Downloads PDF directly and appends to Generated Documents list.
- Verified: Milan Jul 2026 → Gross 55564.51, PT 200, Net 55364.51, "In Words: Rupees Fifty Five Thousand Three Hundred And Sixty Five Only". Chirag Jul 2026 → LWP 5.00, PL 1.50, CL 1.50 (correctly reflects hybrid sandwich rule).
- num2words==0.5.14 pinned in `/app/backend/requirements.txt`.

### Feb 2026 — Sandwich Leave Rule (Unified Hybrid)
- **Extracted single helper `_chain_triggers_sandwich(statuses)`** in `/app/backend/server.py` (line 48). All 6 sandwich call sites (lines ~5145, 5516, 5935, 6584, 6787, 6952) now call this helper — no more duplicated logic.
- **Unified rule**:
  - **Case A**: Chain has 2+ separate leave blocks → sandwich all nonworking days in chain (Fri+Mon pattern, Mon+Holiday+Wed pattern).
  - **Case B**: Chain has exactly 1 leave block AND that block has nonworking days on BOTH sides within the chain → sandwich all nonworking (Mon-Fri full week between weekends; Mon leave between weekend and holiday).
  - Chirag case (Sat/Sun + Mon-L, chain ends): 1 block at chain end, no nonworking after → NOT sandwich.
- **Verified with all user examples**:
  - Ex 1 (Fri-L + weekend + Mon-L) → 4 days deducted ✅
  - Ex 2 (Sat/Sun + Mon-L + Tue-H + Wed-L) → 5 days ✅
  - Ex 3/Milan (Sat/Sun + Mon-Fri-L + Sat/Sun) → 9 days ✅
  - Rule 3 (Sat/Sun + Mon-L + Tue-H, Wed present) → 4 days ✅
  - Chirag (Sat/Sun + Mon-L only) → 1 day ✅

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
- Sandwich Rule (Feb 2026, unified hybrid): _chain_triggers_sandwich() helper. Case A: 2+ leave blocks in chain → sandwich all. Case B: 1 leave block flanked by nonworking on both sides within chain → sandwich all. Chirag case (1 block at chain end) → no sandwich.
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
