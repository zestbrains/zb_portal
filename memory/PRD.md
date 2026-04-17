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

## Recent Changes (April 2026)
- Compensation notes on weekend approvals (approve + history edit)
- Other income notes in salary overview
- PDF letterhead formatting fixes (single page, Poppins font, correct positioning)

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py (6600+ lines) into routes/models

## URL
https://leave-sync-hub.preview.emergentagent.com
