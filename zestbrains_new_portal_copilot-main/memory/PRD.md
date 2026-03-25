# Zestbrains Private Limited - Internal Company Portal

## Product Overview
A secure, internal company portal for Zestbrains Private Limited with three user roles: Admin, HR, and Employee.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT with Role-Based Access Control (RBAC)

---

## Core Features

### 1. Authentication
- **Admin/HR**: Login via username + password
- **Employee**: Login via **email** + password
- JWT-based session management with 8-hour token expiry

### 2. Department Management (Admin only)
- Full CRUD operations
- Activate/Deactivate departments

### 3. Employee Management (Admin/HR)
- Full CRUD operations
- **Birth Date** field
- **Multiple departments** per employee (checkbox selection)
- **Active ↔ Ex-Employee Toggle** (reactivate ex-employees)
- Employee fields: ID, Name, Email, Phone, Department(s), Experience, Joining Date, Birth Date
- Auto-generated username from email
- Password management by Admin

### 4. Project Management (Admin only)
- Full CRUD operations
- Fields: Name, Type, Project Code, Start Date, Status, Client, Scope, Timesheet Link
- Employee assignment (multiple employees per project)
- CSV Import/Export
- **Note**: End Date field has been removed from all views

### 5. Working Hours Module (Admin/HR)
- Log daily work hours against projects
- Delete option in main table
- Edit/Delete options in View dialog
- Note explaining multiple entries per day allowed
- Detailed summary view with filters (date range, department, employee)
- CSV Import/Export

### 6. Working Hours Module (Employee)
- **Own data only** - no access to other employees' data
- **No CSV export** option
- **No department/employee filters**
- Simple form to log hours against projects

### 7. Leave Tracker Module (Admin/HR)

#### Leave Policy
- **16 Paid Leaves (PL)** per year per employee
- Leave year = 12 months from joining date
- **No carry forward** - remaining PLs are encashed
- **Encashment Month = Leave Year Completion + 1 Month** (13th month)

#### Main List View
- One row per employee showing **current year data only**
- Columns: Employee ID, Name, Joining Date, PL Taken, CL Taken, Available PL
- **Active/Ex-Employees tabs** for filtering

#### Detailed Year-wise View
- Auto-generated year tabs based on employee tenure
- **Closed Years**: Show Total PL Taken, Settled PL (Encashed), Total CL Taken
- **Active Year**: Show current balance, month-wise records, next encashment month
- Leave date is editable in edit modal
- Edit/Delete functionality for individual leave records

### 8. Leave Tracker Module (Employee)
- **Direct year-wise view** - no employee list
- View-only access to own leave history
- **No edit/delete** options on leave records
- Summary cards showing available PL, PL taken, CL taken

### 9. Leave Application Module (Employee)
- Apply for leave with date range and reason
- **Tabs**: Apply Leave, Pending, Approved, Rejected
- Leave balance shown prominently
- **Note**: Leave deducted only after approval

### 10. Leave Approval Module (Admin/HR)
- View all pending leave applications
- **Approve/Reject** functionality with optional comments
- Leave balance deducted only after approval

---

## User Roles & Permissions

| Feature | Admin | HR | Employee |
|---------|-------|-----|----------|
| Departments | CRUD | View | - |
| Employees | CRUD | CRUD | View Own |
| Projects | CRUD | View | View Assigned |
| Working Hours | CRUD + Filters | CRUD + Filters | Log Own Only |
| Leave Tracker | Full | Full | View Own Only |
| Leave Approval | ✓ | ✓ | - |
| Apply Leave | - | - | ✓ |

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (supports email for employees)
- `GET /api/auth/me` - Current user info

### Departments
- `GET/POST /api/departments`
- `PUT/DELETE /api/departments/{id}`

### Employees
- `GET/POST /api/employees`
- `PUT/DELETE /api/employees/{id}`
- `PUT /api/employees/{id}/status` - Toggle Active/Ex-Employee

### Projects
- `GET/POST /api/projects`
- `PUT/DELETE /api/projects/{id}`
- `POST /api/projects/import`
- `GET /api/projects/{id}/history` - Project work history

### Work Entries
- `GET/POST /api/work-entries`
- `POST /api/work-entries/admin`
- `PUT /api/work-entries/{id}`
- `DELETE /api/work-entries/{id}`
- `POST /api/work-entries/import`
- `GET /api/work-entries/summary`
- `GET /api/work-entries/detailed-summary`
- `GET /api/work-entries/export`

### Leaves
- `GET /api/leaves/tracker` - Main list (current year only)
- `GET /api/leaves/employee-yearwise/{emp_id}` - Year-wise detailed view
- `GET /api/leaves/my-details` - Employee's own leave data
- `PUT /api/leaves/records/{id}` - Edit leave record (includes date)
- `DELETE /api/leaves/records/{id}` - Delete leave record
- `POST /api/leaves/import` - CSV import
- `POST /api/leaves/encash` - Process encashment
- `POST /api/leaves/apply` - Apply for leave
- `GET /api/leaves/applications` - Get leave applications
- `PUT /api/leaves/applications/{id}/approve` - Approve/reject leave (triggers email)

### Email Configuration
- `GET /api/email-config` - Get SMTP configuration (admin only)
- `PUT /api/email-config` - Update SMTP configuration (admin only)
- `POST /api/email-config/test` - Send test email (admin only)

---

## Test Credentials

| Role | Username/Email | Password |
|------|---------------|----------|
| Admin | renish | Zb@0075588 |
| Employee | Any employee email | Zb@123456 |

---

## Completed Tasks

### February 25, 2026 - SMTP Email Notifications ✅
1. **New Feature: Email Notifications for Leave Approval**
   - Admin can configure SMTP settings at `/admin/email-settings`
   - Configuration includes: Host, Port, Sender Email, App Password, SSL toggle, CC list
   - Enable/Disable toggle for the entire email feature
   - Test Email button to verify SMTP configuration works
   - Emails sent automatically when leave is approved OR rejected
   - Email includes: Employee name, applied dates, approved/rejected dates, leave types, rejection reasons, approved by, timestamp

2. **Files Added/Updated:**
   - `/app/frontend/src/pages/admin/EmailSettings.js` - New email configuration page
   - `/app/frontend/src/components/layout/Layout.js` - Added Email Settings to sidebar
   - `/app/frontend/src/App.js` - Added route for email settings
   - `/app/backend/server.py` - Email config endpoints & send_leave_notification_email function

3. **API Endpoints:**
   - `GET /api/email-config` - Get current SMTP configuration
   - `PUT /api/email-config` - Save SMTP configuration
   - `POST /api/email-config/test` - Send test email

4. **Database Collection:**
   - `email_config` - Single document storing SMTP settings

### February 25, 2026 - Weekend/Holiday Approval Flow ✅
1. **New Feature: Weekend/Holiday Work Entry Approval**
   - When employee submits work hours on Saturday, Sunday, or configured Holiday:
     - Entry goes to `weekend_approvals` collection with "pending" status
     - Does NOT save directly to normal `work_entries`
   - Admin/HR can:
     - View all pending approvals
     - Edit date before approval
     - Adjust hours before approval
     - Approve (entry moves to work_entries)
     - Reject with reason
   - History view with month filter (from March 2026)
   - Shows Original vs Approved values for audit

2. **New Submenu: "Working Hours" now has:**
   - All Entries (existing working hours page)
   - Weekend/Holiday Approvals (new approval page)

3. **Files Added/Updated:**
   - `/app/backend/server.py` - Added weekend approval endpoints
   - `/app/frontend/src/pages/admin/WeekendApprovals.js` - New approval page
   - `/app/frontend/src/components/layout/Layout.js` - Updated navigation
   - `/app/frontend/src/App.js` - Added routes
   - `/app/frontend/src/pages/employee/WorkEntry.js` - Updated to show approval message

### February 25, 2026 - Responsive Design Overhaul ✅
1. **Modal Responsiveness Complete**
   - All modals now display as bottom sheets on mobile (< 640px)
   - Form fields stack in single column on mobile, 2 columns on tablet+
   - Department checkboxes use 2-column grid on mobile, 3 columns on desktop
   - Year tabs in Leave Details modal are horizontally scrollable
   - Close button (X) enhanced with circular background for visibility

2. **Page Headers Responsive**
   - All page headers stack properly on mobile
   - Action buttons wrap and use compact text on mobile
   - Page titles scale appropriately (text-2xl mobile → text-4xl desktop)

3. **Tables Responsive**
   - Tables convert to card-based layout on mobile (< 768px)
   - Each row becomes a card with labeled fields
   - Action buttons remain accessible at card footer

4. **Files Updated**
   - `/app/frontend/src/components/ui/dialog.jsx` - Mobile-first responsive dialog
   - `/app/frontend/src/pages/admin/Projects.js` - Responsive forms and modals
   - `/app/frontend/src/pages/admin/Employees.js` - Responsive forms and modals
   - `/app/frontend/src/pages/admin/WorkingHours.js` - Responsive forms and modals
   - `/app/frontend/src/pages/admin/LeaveTracker.js` - Responsive year-wise modal
   - `/app/frontend/src/App.css` - Global responsive CSS utilities

### March 2, 2026 - Bug Fixes Round 2 ✅
1. **Employee Work Entry Date**: Fixed - Past dates limited to 2 days, but **future dates now allowed** (removed max restriction)
2. **Admin Department Filter**: Fixed - Now merges duplicate department names (e.g., both Android depts combined)
3. **Half Day Leave Options**: Updated - Now has 3 options: Full Day, **First Half**, **Second Half**
4. **Admin Leave View Half Day**: Fixed - Admin approval dialog now shows First Half/Second Half labels for each date

### March 2, 2026 - 8 Major Bug Fixes & Features ✅
1. **Employee Side - Weekend Work Refresh**: Page now auto-refreshes pending approvals after submitting weekend/holiday entry
2. **Employee Side - Date Restriction**: Work entries limited to last 2 days + today only
3. **Admin Side - Delete Rejected Entries**: Admins can now delete both approved AND rejected entries from history
4. **Admin Side - Approve All Button**: New green "Approve All" button on pending approvals (only shows when entries exist)
5. **Admin Side - Department Filter Fixed**: Now checks both `department_id` and `department_ids` array
6. **Employee Side - Half-Day Leave**: Multi-date selection with Full Day / Half Day option for each date
7. **Admin Dashboard - Leave Boxes**: New boxes showing employees on leave today and tomorrow
8. **Work Report Formatting**: Work details now display with proper line breaks preserved

### March 2, 2026 - Security Fix & Bug Fixes ✅
1. **Critical Security Fix: Role Tampering Prevention**
   - Previously: Users could change role in localStorage from "employee" to "admin" and see admin views
   - Fix: App now validates session with server on load via `/auth/me` endpoint
   - Server-verified role replaces any tampered localStorage data
   - Invalid/expired tokens now properly clear session

2. **Login Issues Investigation**
   - Created utility script `/app/backend/reset_employee_passwords.py` for password resets
   - Usage: `python reset_employee_passwords.py [email|employee_id|all]`

3. **Work Hours Delete Fix**
   - Fixed missing work entry `id` in API response preventing bulk delete

### March 2, 2026 - Work Hours UI/UX Improvements ✅
1. **Admin Date-Level Bulk Delete**
   - Single delete button per row on Working Hours page
   - Deletes ALL work entries for a specific employee on a specific date
   - Confirmation dialog shows count of entries and total hours being deleted

2. **Admin Weekend/Holiday History Filters**
   - Year and Month dropdown filters on History tab
   - Filters approval history by selected month/year
   - Year shows 2026, Month shows available months

3. **Employee Pending Approvals Section**
   - New section on Employee Working Hours page
   - Shows pending weekend/holiday approval requests
   - Employee can edit hours on pending requests
   - Employee can delete pending requests before approval
   - Orange-themed UI with clear status indicators

4. **Bug Fix: Route Ordering**
   - Fixed `/weekend-approvals/my-pending` being caught by `/{approval_id}` route
   - Moved static routes before dynamic routes in server.py

### Previous Completed Work
- Employee login issues resolved (all 87 employees can login with Zb@123456)
- Employee-side Project module fixed (My Hours calculation, View Hours redirect)
- End Date field removed from all project views
- Data import completed (24,179 work entries)
- Leave Tracker tabs (Active/Ex-Employees) implemented
- Dashboard and Project logic fixes (Late status, custom sorting, count consistency)
- Working Hours module shows project names instead of codes

---

## Upcoming Tasks

### High Priority (P0)
- [ ] **Backend Refactoring (URGENT)**: Modularize server.py (3800+ lines) into proper FastAPI structure with APIRouter modules

### Medium Priority (P1)
- [ ] Data migration strategy from old system

### Nice to Have (P2)
- [x] Email notifications for leave approvals ✅ COMPLETED
- [ ] Export reports to PDF
- [ ] Advanced filtering in reports

---

## Future/Backlog (P3)
- Data migration from old system
- Notification system
- Mobile app version

---

## Known Issues
- **Performance**: Work entries summary API is slow (~3 seconds) - affects Projects page initial load
- **Technical Debt**: Monolithic server.py needs refactoring

---

## Architecture Notes

### Current Structure
```
/app/
├── backend/
│   └── server.py         # Monolithic FastAPI app (URGENT REFACTOR NEEDED)
├── frontend/
│   └── src/
│       ├── App.css       # Global responsive styles
│       ├── App.js
│       ├── components/
│       │   ├── ui/       # Shadcn components (dialog.jsx updated)
│       │   └── layout/
│       │       └── Layout.js  # Responsive sidebar/header
│       ├── pages/
│       │   ├── admin/    # All admin pages (responsive)
│       │   ├── employee/ # All employee pages
│       │   └── hr/       # All HR pages
│       └── utils/
│           └── api.js
└── memory/
    └── PRD.md
```

### Recommended Refactoring Structure
```
/app/backend/
├── main.py              # FastAPI app entry point
├── routes/
│   ├── auth.py
│   ├── departments.py
│   ├── employees.py
│   ├── projects.py
│   ├── work_entries.py
│   └── leaves.py
├── models/
│   ├── user.py
│   ├── employee.py
│   ├── project.py
│   └── leave.py
├── services/
│   └── database.py
└── tests/
```
