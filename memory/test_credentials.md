# Test Credentials (Updated after DB restore - April 22, 2026)

## Admin
- **Username**: renish
- **Password**: Zb@0075588

## Employee - Reeman Saiyed (emp 56)
- **Username**: hr1 (email hr@zestbrains.com is shared with emp 101, use username instead)
- **Password**: Reeman@zb@56
- **Note**: Account currently returns "Account is inactive" during login (as of Feb 2026). Use hr/Prashant@zb@101 for employee flows.

## Employee - Prashant (emp 101)
- **Username**: hr (or email: hr@zestbrains.com)
- **Password**: Prashant@zb@101

## Note
- Database: ZestBrainsStaging (restored from mongo_backup_2026-04-22)
- All 97 employee passwords rehashed. Stored in `plain_password` field.
- Password format: `Name@zb@{employee_id}`
- If email is shared between users, login with username instead
