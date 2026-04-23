# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Python FastAPI
- Database: MongoDB (ZestBrainsStaging)
- PDF Generation: fpdf2 with Poppins font

## Recent Changes (April 2026)
- Bug Fix: Employees can only edit their own work hours (not other employees')
- Email Settings: Added "CC Email List for Project" field
- Projects: Added POC (multi-employee), Scope (text), Platform (text) fields
- Projects: Email sent to PM/Management dept on project creation
- Projects: "Send Mail" button on all projects for manual email trigger
- Sandwich Rule: 2+ leave groups in chain = all nonworking = sandwich
- OT Threshold: Admin-approved weekend entries bypass 4.5h limit

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
