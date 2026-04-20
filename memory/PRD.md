# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Python FastAPI
- Database: MongoDB
- PDF Generation: fpdf2 with Poppins font

## Sandwich Leave Rule (FINAL - April 2026)
**Non-working days (weekends/holidays) are sandwich ONLY when there is full-day leave on BOTH sides.**
- Full day leaves: PL, CL, PL/2 & CL/2
- Half day (NO sandwich): PL/2, CL/2, Half PL, Half CL
- Employee worked on weekend (OT) = present, breaks sandwich chain
- Uses `is_full_day_leave()` helper + "leave before AND after nonworking block" algorithm

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading (needs user clarification)
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
