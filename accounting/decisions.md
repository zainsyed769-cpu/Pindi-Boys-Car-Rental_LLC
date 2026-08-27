# Decisions log

Recorded so nobody has to re-litigate these later.

| # | Decision | Answer | Date | Impact |
|---|---|---|---|---|
| D1 | VAT status | Registered, **quarterly** filing | 26 Aug 2026 | 5% tax codes, VAT control account, quarterly close. TRN + tax period still needed. |
| D2 | Go-live date | "Start now, re-enter Jan 2026 and onward later" | 26 Aug 2026 | Live from **1 Sep 2026**; Jul–Aug 2026 back-entered as priority to complete the VAT quarter; Jan–Jun 2026 back-filled later. See `phase-2-chart-of-accounts.md` §6. |
| D3 | Investor model | Investor owns specific cars and shares that car's profit | 26 Aug 2026 | Investors are **creditors, not shareholders** (single-owner LLC). Special Accounts under an "Investor Accounts" liability control account. Company commission is revenue; investor share is a cost. |
| D4 | Rental days data | Excel / Google Sheets already exists | 26 Aug 2026 | Utilisation and ROI built on top of the existing sheet, linked to Manager by vehicle code. Sheet still needed. |
| D5 | Software | Manager (manager.io) | 26 Aug 2026 | Design targets Manager's Divisions, Fixed Assets, Special Accounts, Billable Expenses. |
| D6 | Per-vehicle P&L mechanism | **Divisions**, one per vehicle (51) | 26 Aug 2026 | Not 51 sets of GL accounts. Keeps the chart of accounts at 86 accounts instead of roughly 800. |
| D7 | Build a custom system | Owner asked to build his own software instead of relying on Manager alone | 27 Aug 2026 | Custom system (`../app/`) owns rental operations and management reporting — rentals, utilisation, Salik and fine attribution, per-car P&L, investor share. **Statutory accounting and the VAT return are not yet in it**; see the open question below. |

## Still outstanding

| # | Needed | Blocks |
|---|---|---|
| O1 | TRN + FTA tax period (which months your quarter ends) | Phase 9, and confirms the go-live date in D2 |
| O2 | Original loan spreadsheet (xlsx/csv — the PDF is clipped) | Phase 8, and per-vehicle finance cost |
| O3 | Existing Manager backup, or confirmation the file is empty | Phase 12 |
| O4 | Which vehicles are investor cars, and the split terms per investor | Phase 4 investor divisions |
| O5 | Your rental days Google Sheet / Excel | Phase 11 utilisation and ROI |
| O6 | Confirmation the trade licence has been renewed | Nothing technical — business risk |
| O7 | Depreciation policy confirmed with your auditor | Phase 4, and the custom system's depreciation |
| O8 | Decide whether the custom system replaces Manager entirely, or feeds it | Whether to build a double-entry ledger and FTA VAT return into `../app/` |
| O9 | Where the custom system runs (office machine or cloud) and who logs in | Adding authentication before it is reachable from outside the office |
