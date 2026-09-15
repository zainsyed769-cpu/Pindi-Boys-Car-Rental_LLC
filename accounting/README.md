# Manager (managers.io) implementation — Pindi Boys Car Rental L.L.C.

Design, import files and staff SOPs for running the car rental business on
Manager (manager.io). Built phase by phase; each phase is reviewed before the
next one starts.

## Phase tracker

| # | Phase | Status |
|---|---|---|
| 1 | Audit current setup & business requirements | ✅ Delivered — awaiting answers to §5 of `phase-1-audit.md` |
| 2 | Chart of accounts | ✅ Delivered — awaiting your approval (`phase-2-chart-of-accounts.md`) |
| 3 | Customers & suppliers | ⏭ Next, once Phase 2 is approved |
| 4 | Vehicles (divisions + fixed assets) | ⏸ Blocked on loan sheet (O2) + investor car list (O4) |
| 5 | Rental invoicing workflow | ⏸ |
| 6 | Vehicle expenses | ⏸ |
| 7 | Salik & traffic fines | ⏸ |
| 8 | Loans & finance | ⏸ Blocked on loan sheet (O2) |
| 9 | UAE VAT | ⏸ Blocked on TRN + tax period (O1) |
| 10 | P&L and management reports | ⏸ |
| 11 | Dashboard | ⏸ |
| 12 | Opening balances & historical import | ⏸ Go-live 1 Sep 2026 — see Phase 2 §6 |
| 13 | Testing | ⏸ |
| 14 | Staff SOPs | ⏸ |

## Contents

```
accounting/
├── phase-1-audit.md              Phase 1 findings, entity facts, open questions
├── phase-2-chart-of-accounts.md  Chart of accounts design and rationale
├── decisions.md                  Decisions taken, and what is still outstanding
├── data/
│   ├── fleet-report-extract.csv  51 vehicles extracted from the RTA fleet report
│   └── vehicle-master.csv        Fleet register / division list (needs your input)
├── import/
│   ├── chart-of-accounts.tsv     86 accounts, for Manager's Batch Create
│   └── divisions.tsv             51 vehicle divisions, for Manager's Batch Create
└── scripts/
    └── parse_fleet_report.py     Re-extracts any future RTA fleet report PDF
```

## Re-running the fleet extract

```bash
python3 accounting/scripts/parse_fleet_report.py "Fleet report ....pdf" accounting/data/fleet-report-extract.csv
```

Requires `poppler-utils` (`apt-get install poppler-utils`).

## Source documents in this repo

| File | Used for |
|---|---|
| `Pindi Boys Trade Licance 2026.pdf` | Legal entity, capital, ownership, activities |
| `Fleet report 12:Oct:2025 pindi Boys .pdf` | Fleet register, insurance, mortgages, fines |
| `Pindi Boys Car Rental Bank Statement ....pdf` | Transaction volume, cash position, opening balances |
| `Pindi_Boys_Loan_Sheet_2025_Landscape.pdf` | Loan instalments (⚠️ clipped — original xlsx needed) |
