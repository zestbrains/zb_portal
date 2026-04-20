# Zestbrains HR Portal - PRD

## Project Overview
HR Management Portal for Zestbrains

## Sandwich Leave Rule (FINAL)
**Algorithm**: Find chains of consecutive (leave + nonworking) days. If the chain has **2 or more separate leave groups** (leave blocks separated by nonworking days), ALL nonworking days in the chain become sandwich.

- Full day leaves: PL, CL, PL/2 & CL/2
- Half day (NO sandwich): PL/2, CL/2, Half PL, Half CL
- Employee worked on weekend (OT) = present, breaks chain

Examples:
- L(Fri)+WO(Sat-Sun)+L(Mon) → 2 leave groups → Sat,Sun = SW ✓
- L(Mon-Fri)+WO(Sat-Sun)+P(Mon) → 1 leave group → no SW ✓
- WO+CL(Mon-Fri w/ holiday)+WO → 2 leave groups → all WO+H = SW ✓

## Admin Credentials
- Username: renish / Password: Zb@0075588

## Next Action Items
- P1: Weekend working hours slow loading
- P2: Dynamic Late Coming salary deduction thresholds
- P2: Bulk bank assignment
- P2: Refactor server.py into routes/models

## URL
https://admin-leave-module.preview.emergentagent.com
