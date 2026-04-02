# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains - migrated from another Emergent account

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Python FastAPI
- Database: MongoDB
- PDF Generation: fpdf2

## What's Implemented
- Admin Dashboard with project/employee overview
- Department, Employee, Project Management
- Working Hours Tracking, Weekend Approvals
- Leave Management (Apply, Approve, History, Tracker)
- Holiday Management, Email Settings
- Role-based access (Admin, HR, Employee)
- Late Coming tracking with salary deductions
- Bank-wise salary grouping (ICICI & Hexeros Yes Bank sheets)
- Sandwich Leave detection & salary deduction (corrected: leave-weekend-leave rule)
- Sandwich Leave Warning on leave application (only warns about NEW sandwich, ignores existing approved)
- Email notifications on leave application
- Secured /api/employees endpoint (admin/hr only)
- Employee Attendance: Late marks & deduction summary only
- **Employee Detail Full Page** (replaced modal) with 5 tabs: Personal, Work, Bank, Salary, Documents
- **HR Letter/Document Generation** - 7 letter types with company letterhead, signature, saved to DB:
  - Offer Letter, Appointment Letter, Experience Letter, Relieving Letter
  - Internship Appointment, Internship Completion, Increment Letter

## Key Files
- `/app/backend/server.py` - Main API (6600+ lines)
- `/app/backend/document_generator.py` - PDF letter generation with letterhead
- `/app/backend/static/letterhead/` - Header, footer, signature images
- `/app/frontend/src/pages/admin/EmployeeDetail.js` - Employee detail full page
- `/app/frontend/src/pages/admin/Employees.js` - Employee list (View navigates to detail page)

## API Endpoints (Documents)
- `POST /api/documents/generate` - Generate letter PDF, save to DB
- `GET /api/documents/{employee_id}` - List documents for employee
- `GET /api/documents/download/{doc_id}` - Download PDF
- `DELETE /api/documents/{doc_id}` - Delete document

## Admin Credentials
- **Username**: renish
- **Password**: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic thresholds for Late Coming salary deductions
- P2: Bulk bank assignment for employees
- P2: Refactor server.py into modular routes/models

## URL
https://leave-sync-hub.preview.emergentagent.com
