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
- Compensation notes on weekend/holiday approvals
- Other Income notes in Salary Overview
- OT Threshold bypass for admin-approved weekend entries
- Leave Balance in Approval Dialog

## Sandwich Leave Rules
- Full day leaves: PL, CL, PL/2 & CL/2 → trigger sandwich
- Half day: PL/2, CL/2, Half PL, Half CL → treated as present, no sandwich
- Employee worked on weekend (OT) → present, no sandwich
- Algorithm: find contiguous (leave+nonworking) blocks. If block has at least one full-day leave, all nonworking days in block = sandwich
- Uses helper function `is_full_day_leave()` across all 6 endpoints

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
