# Manager (managers.io) implementation — Pindi Boys Car Rental L.L.C.

Design, import files and staff SOPs for running the car rental business on
Manager (manager.io). Built phase by phase; each phase is reviewed before the
next one starts.

## Phase tracker

| # | Phase | Status |
|---|---|---|
| 1 | Audit current setup & business requirements | ✅ Delivered — awaiting answers to §5 of `phase-1-audit.md` |
| 2 | Chart of accounts | ⏸ Blocked on Q1 (VAT) and Q4 (investors) |
| 3 | Customers & suppliers | ⏸ |
| 4 | Vehicles (divisions + fixed assets) | ⏸ Blocked on Q5 (loan sheet) |
| 5 | Rental invoicing workflow | ⏸ |
| 6 | Vehicle expenses | ⏸ |
| 7 | Salik & traffic fines | ⏸ |
| 8 | Loans & finance | ⏸ Blocked on Q5 |
| 9 | UAE VAT | ⏸ Blocked on Q1 |
| 10 | P&L and management reports | ⏸ |
| 11 | Dashboard | ⏸ |
| 12 | Opening balances & historical import | ⏸ Blocked on Q2 |
| 13 | Testing | ⏸ |
| 14 | Staff SOPs | ⏸ |

## Contents

```
accounting/
├── phase-1-audit.md              Phase 1 findings, entity facts, open questions
├── data/
│   ├── fleet-report-extract.csv  51 vehicles extracted from the RTA fleet report
│   └── vehicle-master.csv        Fleet register / division list (needs your input)
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
