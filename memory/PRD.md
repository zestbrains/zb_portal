# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains - migrated from another Emergent account

## Tech Stack
- Frontend: React + Tailwind CSS
- Backend: Python FastAPI
- Database: MongoDB

## Deployment Date
- **Migrated**: March 25, 2026

## Database Collections Restored
| Collection | Documents |
|------------|-----------|
| employees | 86 |
| users | 89 |
| projects | 416 |
| work_entries | 47,716 |
| leave_records | 1,336 |
| departments | 12 |
| holidays | 8 |
| leave_applications | 7 |
| weekend_approvals | 6 |
| banks | 3 |
| leave_encashments | 3 |
| salary_adjustments | 2 |
| email_config | 1 |

## What's Implemented
- Admin Dashboard with project/employee overview
- Department Management
- Employee Management (with Team Leader assignment and Password visibility)
- Project Management
- Working Hours Tracking
- Leave Management (Apply, Approve, History, Tracker)
- Holiday Management
- Weekend Approvals
- Email Settings
- Role-based access (Admin, HR, Employee)
- Late Coming attendance tracking with salary deductions
- Late Marks for delayed projects
- Bank-wise salary grouping
- ICICI & Hexeros Yes Bank Salary Sheet downloads
- Sandwich Leave detection & salary deduction
- Email notifications on leave application
- Secured /api/employees endpoint (admin/hr only)
- Employee Attendance: Late marks & deduction summary (no full salary details exposed)
- Sandwich Leave Warning on leave application (pre-submission check)

## Recent Changes (April 2026)
- **Added**: Employee Attendance page now shows "Late Marks & Deduction" section (only visible when late marks exist) - replaces hidden salary summary
- **Added**: Sandwich Leave Warning on Apply Leave page - checks proposed leave dates against sandwich rules before submission, shows clear warning with affected dates and deduction impact
- **Backend**: New `POST /api/leaves/check-sandwich` endpoint for sandwich leave pre-check

## Admin Credentials
- **Username**: renish
- **Password**: Zb@0075588

## Next Action Items
- P1: Verify weekend working hours slow loading (needs user clarification)
- P2: Configure dynamic thresholds for Late Coming salary deductions (currently hardcoded)
- P2: Bulk bank assignment for employees
- P2: Refactor server.py (6000+ lines) into modular routes/models

## URL
https://leave-sync-hub.preview.emergentagent.com
