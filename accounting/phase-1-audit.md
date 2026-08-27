# Phase 1 — Audit & Business Requirements

**Company:** Pindi Boys Car Rental L.L.C. · Dubai, UAE · AED
**Prepared:** 26 Aug 2026 · Status: awaiting owner input on the questions in §5

---

## 1. What I can and cannot do (read this first)

I do **not** have a connection to your Manager / Managers.io account. There is no
Manager connector available in this session, so I cannot log in, click through your
setup, read your existing chart of accounts, or create anything inside the software
myself.

What that means practically:

| Task | Who does it |
|---|---|
| Design the chart of accounts, workflows, reports | Me — delivered as files in this repo |
| Prepare import files (CoA, customers, vehicles, opening balances) | Me — CSV ready to import |
| Write click-by-click staff SOPs | Me |
| Actually clicking inside Manager | You (or you give me an export and I check it) |
| Verifying the result | Me, from an export you send back |

The working loop is: I produce the design + import file → you apply it → you send
back an export or screenshot → I verify before we move to the next phase.

**A note on the product name.** "Managers.io" is almost certainly **Manager**
(manager.io) — the free/desktop-and-server accounting package. Everything below is
designed for Manager. If you are actually using a different product, tell me now,
because the whole design changes.

---

## 2. Legal entity facts (extracted from your trade licence)

| Field | Value |
|---|---|
| Legal name | PINDI BOYS CAR RENTAL L.L.C |
| Trade licence no. | 969076 (DED Dubai) |
| Commercial register no. | 2200434 |
| Legal form | Limited Liability Company – Single Owner (LLC-SO) |
| Licence issued / expires | 02 Aug 2021 / **01 Aug 2026 — ⚠️ EXPIRED 25 days ago** |
| Paid-up capital | AED 300,000 (300 shares) |
| Owner | Zain Ul Abideen Syed Sohail Ibrar Syed — 100% |
| Managers | Zain Ul Abideen Syed Sohail Ibrar Syed; Mohit Rajesh Sharma |
| Licensed activities | Car Rental; Motorcycles Rental |
| Registered address | Office 615E, Seven Tides Ltd, Jebel Ali First, Dubai |

Consequences for the setup:

- Single-owner LLC → equity is **Owner's Capital / Owner's Drawings**, not multiple
  partner accounts. If investors exist, they are creditors or profit-share partners,
  **not** shareholders — that changes their accounting treatment (see §5 Q4).
- Paid-up capital AED 300,000 must appear as an opening equity balance.
- **No TRN is shown on the licence.** VAT registration status is Question 1 below and
  it is the single biggest branch in the design.
- ⚠️ **The trade licence on file expired 01 Aug 2026.** Either it has been renewed and
  I am looking at the superseded copy, or renewal is overdue. Trading on an expired
  DED licence carries fines and blocks bank/RTA transactions. Please confirm — and if
  renewed, upload the 2026-27 licence so I can record the correct expiry. Licence
  renewal cost is a prepaid expense amortised over the licence year.

---

## 3. Fleet audit (from `Fleet report 12:Oct:2025 pindi Boys .pdf`)

Extracted to `data/fleet-report-extract.csv` (reproducible via
`scripts/parse_fleet_report.py`).

**51 assets: 49 cars + 2 Honda Unicorn motorcycles.**

Model-year mix: 2021 ×3 · 2022 ×1 · 2023 ×5 · 2024 ×27 · 2025 ×15 — a young fleet,
so depreciation and finance cost will dominate the P&L, not maintenance.

### Financing spread — 41 of 51 vehicles are mortgaged

| Mortgagee | Vehicles |
|---|---:|
| Emirates NBD Bank (P.J.S.C) | 18 |
| Emirates Islamic Bank | 13 |
| Dubai Islamic Bank | 8 |
| First Abu Dhabi Bank P.J.S.C | 1 |
| Al Habtoor Motors | 1 |
| **No mortgage (owned outright)** | **10** |

This tells me you need **at least 5 separate finance-liability accounts**, one per
lender, not a single "Loan" account — otherwise you can never reconcile to a bank's
statement of outstanding.

### Insurance

| Insurer | Vehicles |
|---|---:|
| Dubai Insurance Company (P.S.C.) | 42 |
| Adamjee Insurance Company Ltd (Dubai) | 8 |
| Al Ain Ahlia Insurance Co. (Dubai) | 1 |

Renewals cluster on a few dates (25 Dec, 20 Jan, 16 May, 27 Jul) — which means
insurance is paid in **large lumps**. It must be booked as *prepaid insurance* and
amortised monthly, otherwise four months of the year will look artificially loss-making.

### ⚠️ Compliance exposures visible in the report (as at 12 Oct 2025)

**This report is 10 months old.** Every figure below is the position on 12 Oct 2025,
not today. Please pull a fresh Report of Vehicles from RTA/Salik before we build
opening balances — the parser in `scripts/` will re-extract it in one command.

**Registration shows 0 days valid — 4 vehicles:**

| Model | Plate |
|---|---|
| Toyota Fortuner | H 82490 |
| Kia Sportage | M 28158 |
| Nissan Patrol | K 91297 |
| Cadillac CT4 | I 64842 |

**Insurance already expired at report date — 4 vehicles:** Toyota Fortuner H 82490
(expired 22 Jan 2025), Kia Sportage M 28158, Nissan Patrol K 91297, Cadillac CT4
I 64842. A rented-out vehicle with expired insurance is an uninsured-loss exposure,
not an accounting problem — worth checking today regardless of this project.

**Open traffic fines: 147 fines totalling AED 67,675** across 34 vehicles. Worst:
Nissan Patrol LE 11417 EE (AED 4,950), Ford Territory N 80942 (AED 4,650),
MG RX 9 I 67594 (AED 4,650), JAC S3 T 23013 (AED 4,250), Toyota Veloz H 95272
(AED 4,100 over 10 fines).

That AED 67,675 was the position 10 months ago and has almost certainly grown. It is
the first real number this system has to answer: **how much of it
is recoverable from customers and how much is the company's own cost?** Right now
nothing in your records can tell you. Fixing that is Phase 7.

---

## 4. Other source documents reviewed

**Bank statement — 01 Jan to 30 Sep 2025** (168 pages, Emirates Islamic,
A/C ···939001, IBAN AE700400000332982939001, Umm Hurrair branch):

| | AED |
|---|---:|
| Opening balance 01 Jan 2025 | 12,121.65 |
| Total deposits (9 months) | 2,271,744.75 |
| Total withdrawals (9 months) | 2,283,161.69 |
| Closing balance 30 Sep 2025 | 704.71 |

Two observations. First, ~AED 2.27m of collections over 9 months (≈AED 252k/month)
is the revenue scale the system must handle — roughly 250–400 transactions a month,
which is well within Manager's capacity. Second, **withdrawals exceeded deposits and
the account closed at AED 705.** With AED 65,840/month of loan instalments (below),
cash timing is tight; the cash-flow report in Phase 10 is not a nice-to-have.

**Loan sheet 2025** — the PDF is **clipped**: it was exported too wide, so the
vehicle-name and 2025 columns are cut off the page. What survives:

- **43 loan lines**, monthly instalments ranging AED 839 – 5,901
- **Total ≈ AED 65,840/month**, dropping to AED 61,340 from Jul 2026 when one
  AED 4,500 facility ends
- Individual instalments visible: 2741, 1481, 916, 1803, 839×4, 1010, 2021, 1072,
  1444, 2008×2, 1136, 1185, 1606, 1403×8, 1609, 1635, 1091×2, 3039, 2418, 1791,
  5901, 1003×4, 2632, 2513, 4500

I cannot tell **which instalment belongs to which car**, and that mapping is required
for per-vehicle profit. **Please send the original Excel/Google Sheet** (not a PDF)
— see Q5.

---

## 5. Questions I need answered to start Phase 2

Only these six. Everything else I can decide or default sensibly.

**Q1 — VAT.** Is Pindi Boys registered for UAE VAT? If yes: TRN, effective date, and
filing period (monthly or quarterly). If no: current 12-month turnover, since
AED 2.27m in 9 months is far above the AED 375,000 mandatory registration threshold
and suggests you should already be registered.

**Q2 — Accounting start date.** From which date should Manager be the book of record?
Options: (a) 1 Jan 2025 — rebuild the full year from the bank statement I already
have; (b) 1 Jan 2026 — clean start with opening balances only; (c) another date.
This decides whether Phase 12 is a data-entry project or a one-page opening journal.

**Q3 — Existing books.** Is there anything already in Manager (or Excel/Zoho/QuickBooks)?
If Manager already has data, export **Settings → Backup** and put the file in this
repo — I will audit before touching anything. If nothing exists, say "empty" and I
build clean.

**Q4 — Investors.** You mentioned investor arrangements. For each: is the investor
(a) lending money at a fixed return, (b) owning specific cars and taking a share of
those cars' profit, or (c) a silent partner in the whole business? These are three
completely different accounting treatments and I must not guess. If there are no
investors yet, say so and I will design the structure but leave it dormant.

**Q5 — Loan sheet source.** Please upload the original loan spreadsheet (xlsx/csv) —
the PDF lost the vehicle names. I need, per loan: vehicle, bank, finance amount,
instalment, start date, tenor, and outstanding balance.

**Q6 — Rental days data.** Where do you record who rented which car and for which
dates today — WhatsApp, a paper contract, an Excel sheet, or a rental system? Manager
**cannot** track rental days, idle days, or utilisation %. I need to know what exists
before I design where utilisation comes from.

---

## 6. Architecture I intend to propose in Phase 2 (preview, not final)

So you know where this is heading:

- **Divisions** (Manager's tracking dimension) — one per vehicle, 51 of them. This is
  what produces a P&L per car without polluting the chart of accounts with hundreds
  of GL codes.
- **Fixed Assets** — one per vehicle, same name/code as its division. Carries cost,
  accumulated depreciation and book value per car.
- **Billable Expenses** — for Salik and fines, so they become customer receivables
  rather than company costs by default.
- **Special Accounts** — for customer security deposits, so deposits are a liability
  per customer and never touch income.
- **One liability account per lender** — five accounts, reconcilable to each bank.
- **Outside Manager (Google Sheets):** rental days / utilisation, loan amortisation
  schedules, and vehicle ROI. Manager genuinely cannot do these; I will not pretend
  otherwise, and I will build the sheets.

Vehicle codes V-001 … V-051 are already assigned in `data/vehicle-master.csv`.
