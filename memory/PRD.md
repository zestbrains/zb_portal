# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Python FastAPI
- Database: MongoDB
- PDF Generation: fpdf2 with Poppins font

## What's Implemented
- Admin Dashboard, Department/Employee/Project Management
- Working Hours Tracking, Weekend Approvals (with compensation notes)
- Leave Management (Apply, Approve, History, Tracker)
- Sandwich Leave Warning on leave application
- Holiday Management, Email Settings, Role-based access
- Late Coming tracking with salary deductions
- Bank-wise salary (ICICI & Hexeros Yes Bank sheets)
- Employee Detail Full Page with Documents tab
- HR Letter Generation (7 types) with company letterhead PDF
- Compensation notes on weekend/holiday approvals (new + edit history)
- Other Income notes in Salary Overview
- Secured /api/employees endpoint (admin/hr only)
- Bug Fix: Admin-approved weekend entries with < 4.5 hours now show in Attendance/Salary
- Sandwich Rule Update: last present → next present, all non-working days in absence block are sandwich
- **Leave Balance in Approval Dialog**: Shows Available PL (year), This Month PL, This Month CL before admin approves

## Recent Changes (April 2026)
- Fixed OT threshold bypass for admin-approved weekend entries
- Updated sandwich leave rule to count all weekends/holidays in continuous absence blocks
- Added leave balance display in approval dialog (API: /api/leaves/balance/{emp_id})

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py (6700+ lines) into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
