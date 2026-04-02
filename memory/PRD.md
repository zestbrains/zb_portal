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

## Recent Changes (December 2025)
- **Fixed**: Team Leader assignment in Employee Edit dialog now saves correctly
- **Added**: Password visibility in Employees table and View dialog (plain_password field)
- **Backend**: Added `team_leader_ids` and `plain_password` to Employee Pydantic response model
- **Added**: NJ (Not Joined) attendance status and pro-rated salary for mid-month joins
- **Added**: Edit/delete individual leave dates within approved applications
- **Added**: Visual Sandwich Leave ("SW") indicators in Attendance module
- **Fixed**: Dashboard Top Performers/Performance graphs to exclude ex-employees
- **Added**: Bank Account Number and IFSC Code fields for employees
- **Added**: ICICI Salary Sheet download feature (openpyxl)
- **Fixed**: ICICI Salary Sheet now correctly filters by `salary_status` (Active vs Hold) instead of employee status
- **Added**: Hexeros Yes Bank Salary Sheet download feature with 5-column format (Name, Account, IFSC, Amount, Description)

## Admin Credentials
- **Username**: renish
- **Password**: Zb@0075588

## Next Action Items
- P2: Configure dynamic thresholds for Late Coming salary deductions (currently hardcoded)
- P2: Bulk bank assignment for employees
- P2: Refactor server.py (5000+ lines) into modular routes/models

## URL
https://leave-sync-hub.preview.emergentagent.com
