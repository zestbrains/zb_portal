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
- OT Threshold bypass for admin-approved weekend entries
- Sandwich Rule: last present → next present, contiguous absence blocks
- PL/2 & CL/2 (full day) correctly triggers sandwich
- Leave Balance in Approval Dialog (Available PL, This Month PL, This Month CL)

## Sandwich Leave Rules (April 2026)
1. Full day leaves (PL, CL, PL/2 & CL/2) trigger sandwich. Half day (PL/2, CL/2, Half PL, Half CL) do NOT.
2. If employee worked on weekend (OT), no sandwich for those days.
3. All non-working days (weekends, holidays) in a contiguous absence block count as sandwich if block contains at least one full-day leave.
4. Applied across: Admin Attendance, Admin Salary, Employee Attendance/Salary, ICICI/Hexeros sheets, Sandwich Warning API.

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py (6700+ lines) into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
