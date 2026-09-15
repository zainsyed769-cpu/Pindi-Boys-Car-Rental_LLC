# Phase 2 — Chart of Accounts

**Status:** proposed, awaiting your approval before anything is keyed into Manager.
Built on decisions D1–D6 in `decisions.md`.

---

## 1. The design principle

A car rental company has two questions that pull in opposite directions:

- *"What did the business earn?"* → wants a **short** chart of accounts
- *"Did the Toyota Highlander make money?"* → tempts you into a **long** one

The wrong answer is an account per car. With 51 vehicles and ~15 expense types that
is ~800 accounts, and your P&L becomes unreadable.

The right answer in Manager is to separate the two dimensions:

| Dimension | Manager feature | Answers |
|---|---|---|
| **What kind of cost is it?** | Chart of accounts (86 accounts) | "How much did we spend on tyres?" |
| **Which car was it for?** | **Divisions** — one per vehicle, V-001…V-051 | "What did V-013 cost us?" |
| **What is the car worth?** | **Fixed Assets** — one per vehicle, same code | "What is V-013's book value?" |

Every vehicle transaction gets an account *and* a division. Manager then produces a
Profit & Loss Statement per division — that is your per-car P&L, with no extra accounts.

**One rule your staff must never break:** *every line that relates to a car must carry
that car's division.* If they forget it, the money still lands in the right account and
your company P&L is correct, but the car-level report is wrong. Phase 14's SOPs are
built around making this hard to get wrong, and Phase 13 includes a monthly check for
un-divisioned vehicle costs.

---

## 2. Accounts Manager creates by itself

Do **not** create these manually — Manager makes them when you use the related feature.
Listed so you recognise them and don't duplicate:

| Account | Created when |
|---|---|
| Accounts receivable | First customer created |
| Accounts payable | First supplier created |
| Billable expenses | First billable expense recorded (this is how Salik/fines work) |
| Tax payable | First tax code used |
| Retained earnings | Automatically |
| Suspense | Automatically — **must be zero at month end**, it is Manager's error bucket |
| Bank/cash accounts | Each Bank & Cash Account created |
| Fixed assets, Fixed assets – accumulated depreciation | First fixed asset created |
| Capital accounts | First capital account created |
| Special accounts | First special account created |

---

## 3. The chart of accounts

Import-ready in `import/chart-of-accounts.tsv`. Codes are grouped so reports sort correctly.

### 1000 — Assets

| Code | Account | Notes |
|---|---|---|
| 1000 | Petty Cash | Cash & Cash Accounts, not a manual GL account |
| 1010 | Emirates Islamic Bank – Current A/C ···939001 | IBAN AE700400000332982939001 |
| 1020 | *(further bank accounts as needed)* | |
| 1100 | Accounts Receivable | auto — customers |
| 1110 | Billable Expenses | auto — Salik & fines awaiting recharge |
| 1150 | Other Receivables | staff advances, insurance claims receivable |
| 1200 | Prepaid Insurance | **important — see §4** |
| 1210 | Prepaid Registration & Mulkia | |
| 1220 | Prepaid Trade Licence | |
| 1230 | Prepaid Rent | |
| 1250 | Advances to Suppliers | |
| 1300 | Deposits Paid | RTA, Salik, landlord, utility deposits |
| 1500 | Rental Vehicles – at Cost | fixed asset control account |
| 1510 | Rental Vehicles – Accumulated Depreciation | |
| 1550 | Office Equipment & Computers – at Cost | separate control account |
| 1560 | Office Equipment – Accumulated Depreciation | |

### 2000 — Liabilities

| Code | Account | Notes |
|---|---|---|
| 2000 | Accounts Payable | auto — suppliers |
| 2100 | Customer Security Deposits | control account made of **Special Accounts**, one per customer — see §5 |
| 2200 | VAT Payable (FTA) | auto "Tax payable", renamed |
| 2300 | Accrued Expenses | |
| 2310 | Salaries & WPS Payable | |
| 2320 | End of Service Gratuity Provision | UAE labour law — **do not skip this**, see §4 |
| 2350 | Traffic Fines Payable | fines incurred, not yet paid to RTA |
| 2400 | Vehicle Finance – Emirates NBD | 18 vehicles |
| 2410 | Vehicle Finance – Emirates Islamic Bank | 13 vehicles |
| 2420 | Vehicle Finance – Dubai Islamic Bank | 8 vehicles |
| 2430 | Vehicle Finance – First Abu Dhabi Bank | 1 vehicle |
| 2440 | Vehicle Finance – Al Habtoor Motors | 1 vehicle |
| 2500 | Investor Accounts | control account made of **Special Accounts**, one per investor — see §5 |
| 2700 | Credit Cards | |

One liability account **per lender**, not one "Loan" account — so each balance can be
tied back to that bank's own statement of outstanding. This is why your five lenders
matter more than your 41 loans.

### 3000 — Equity

| Code | Account | Notes |
|---|---|---|
| 3000 | Share Capital – Paid Up | AED 300,000 per the trade licence |
| 3100 | Owner's Current Account | money you put in |
| 3200 | Owner's Drawings | money you take out — **keep separate from expenses** |
| 3900 | Retained Earnings | auto |

Single-owner LLC, so there is one owner's account. Investors do **not** belong here
(D3) — they sit in 2500 as creditors.

### 4000 — Revenue

| Code | Account |
|---|---|
| 4000 | Daily Rental Income |
| 4010 | Weekly Rental Income |
| 4020 | Monthly Rental Income |
| 4030 | Long-Term / Lease Rental Income |
| 4040 | Delivery & Collection Charges |
| 4050 | Late Return & Extension Charges |
| 4060 | Excess Mileage Charges |
| 4070 | Salik Recharged to Customers |
| 4080 | Traffic Fines & Admin Fees Recharged |
| 4090 | Damage Recovery Income |
| 4100 | Other Rental Income |
| 4200 | Investor Commission Income |

Splitting daily / weekly / monthly / long-term is the point of this section: it is how
you learn which *rental type* is actually profitable, not just which car.

### 5000 — Direct vehicle costs

| Code | Account |
|---|---|
| 5000 | Vehicle Insurance |
| 5010 | Vehicle Registration & Mulkia |
| 5020 | Vehicle Maintenance & Servicing |
| 5030 | Vehicle Repairs & Accident Repairs |
| 5040 | Tyres |
| 5050 | Batteries |
| 5060 | Fuel |
| 5070 | Salik – Company Borne |
| 5080 | Traffic Fines – Company Borne |
| 5090 | Parking |
| 5100 | Vehicle Cleaning & Detailing |
| 5110 | Recovery & Towing |
| 5120 | Vehicle Inspection & Testing |
| 5130 | RTA & Government Fees – Vehicles |
| 5140 | Vehicle Accessories |

Note 5070/5080 versus revenue 4070/4080. Salik and fines you **recover** hit revenue;
what you **can't** recover hits these two accounts. The gap between them is a number
worth watching monthly — it is pure leakage. Today it is invisible; the Oct 2025 fleet
report showed AED 67,675 of open fines with no split at all.

### 5900 — Investor share

| Code | Account |
|---|---|
| 5900 | Investor Profit Share |

Its own group, placed after direct costs, so each car's P&L shows profit **before** and
**after** the investor's cut.

### 6000 — Operating expenses

| Code | Account |
|---|---|
| 6000 | Salaries & Wages |
| 6010 | Staff Visa, Medical & Emirates ID |
| 6020 | End of Service Gratuity |
| 6030 | Staff Accommodation |
| 6040 | Office Rent |
| 6050 | Utilities |
| 6060 | Telephone & Internet |
| 6070 | Software & Subscriptions |
| 6080 | Advertising & Marketing |
| 6090 | Commission to Agents & Brokers |
| 6100 | Professional & Legal Fees |
| 6110 | Trade Licence & Government Fees |
| 6120 | Office Supplies & Printing |
| 6130 | Travel & Entertainment |
| 6140 | Bank Charges |
| 6150 | Miscellaneous Expenses |

These are **not** divisioned — they belong to the business, not to a car. Spreading
office rent across 51 cars produces a fake per-car number. §7 explains how to handle
that when judging a car.

### 7000 — Depreciation · 8000 — Finance costs · 9000 — Other

| Code | Account |
|---|---|
| 7000 | Depreciation – Rental Vehicles |
| 7010 | Depreciation – Office Equipment |
| 8000 | Vehicle Finance Interest / Profit |
| 8010 | Loan Processing & Early Settlement Fees |
| 8020 | Merchant & Card Processing Fees |
| 9000 | Gain on Disposal of Vehicles |
| 9010 | Loss on Disposal of Vehicles |
| 9100 | Insurance Claim Income |
| 9200 | Other Income |

Depreciation (7000) and finance cost (8000) are divisioned per vehicle — they are the
two largest costs of a young financed fleet, and a per-car P&L without them is fiction.
This is exactly why your fleet matters: 27 vehicles are 2024 models and 15 are 2025.

---

## 4. Three accounts that will change your reported profit

**1200 Prepaid Insurance.** Your insurance renews in a few large lumps — 25 Dec,
20 Jan, 16 May, 27 Jul. If you expense each payment when paid, those four months show
a fake loss and the other eight show a fake profit. Book the payment to 1200, then
release 1/12 to 5000 each month. Same treatment for registration (1210) and the trade
licence (1220).

**2320 End of Service Gratuity Provision.** UAE labour law requires end-of-service
benefits: 21 days' basic pay per year for the first five years, 30 days per year after.
It accrues whether or not you book it. Ignoring it overstates profit every month and
produces a nasty surprise when someone resigns. Accrue monthly to 2320.

**7000 Depreciation – Rental Vehicles.** Proposed policy, **to confirm with your
auditor (O7)**: straight line over **5 years to a 20% residual value** — 16% of cost
per year. On a 2024 fleet this is likely your single largest expense, ahead of finance
cost. Get this wrong and every per-car profit number is wrong.

---

## 5. Two structures that are not ordinary GL accounts

**Customer security deposits (2100).** A deposit is not income — it is the customer's
money you are holding. In Manager, create a **Special Account per customer** grouped
under a custom control account "Customer Security Deposits" (liability). You then see
exactly whose money you hold and how much, and a refund is a payment against that
customer's special account, never a reduction of revenue. Full workflow in Phase 5.

**Investor accounts (2500).** Same mechanism: a **Special Account per investor** under
an "Investor Accounts" liability control account. Because your LLC has a single owner
(the licence confirms this), an investor sharing a car's profit is a **creditor**, not
a shareholder. Their money must never touch equity, and their share of profit is a cost
(5900), not a drawing. Full workflow in Phase 4 once you send the investor car list (O4).

---

## 6. Go-live date — your answer needs one adjustment

You said "start now, re-enter Jan 2026 and onward later." That works, with one problem:
**you file VAT quarterly**, and a mid-quarter go-live splits a VAT return across two
systems. Assembling one return half from Manager and half from spreadsheets is exactly
where FTA penalties come from.

Recommended plan:

| Period | Treatment |
|---|---|
| **From 1 Sep 2026** | Manager is live. Staff enter every rental, expense and payment as it happens. |
| **Jul + Aug 2026** | Back-entered as a **priority**, right after go-live, so the Jul–Sep VAT quarter is complete inside Manager. |
| **Jan – Jun 2026** | Back-filled later, as you wanted. |
| **2025 and earlier** | Opening balances only. |

You start now, and you still get a clean first VAT return. Total back-entry for Jul–Aug
is roughly two months of transactions — meaningful but manageable.

⚠️ **This assumes your FTA tax period ends in September.** Not every business is on the
Jan/Apr/Jul/Oct cycle — the FTA assigns it. Send me your TRN and tax period (O1) and I
will confirm or shift the plan. If your quarter ends in October, go-live moves to
1 Oct 2026 and there is no back-entry at all.

Opening balances at 31 Aug 2026 will be entered as **one journal entry**, deliberately,
so that when you back-fill Jan–Jun 2026 later it can be reversed cleanly instead of
being unpicked line by line.

---

## 7. What this chart of accounts will and will not tell you

**Will:**
- P&L per vehicle, including depreciation and finance cost
- Recoverable vs company-borne Salik and fines, separately
- Balance owed per customer, and deposit held per customer
- Loan outstanding per lender
- Amount owed to each investor
- VAT position

**Will not, honestly:**
- **Utilisation, days rented, days idle.** Manager has no concept of a rental period.
  This comes from your existing Google Sheet (D4), joined on vehicle code. Phase 11.
- **ROI and payback period.** These are cash-and-time calculations, not ledger balances.
  Built in Sheets from Manager data. Phase 11.
- **A loan amortisation schedule.** Manager holds the *balance*, not the schedule.
  The split of each instalment between principal and interest comes from a Sheet built
  from your loan file (O2). Phase 8.
- **Overhead per car.** Operating expenses are not divisioned, on purpose. When you ask
  "should I sell this car?", the right test is whether it covers its *own* direct costs,
  depreciation and finance — not an arbitrary slice of office rent.

---

## 8. How to load this into Manager

Manager has no chart-of-accounts file import, but it does have **Batch Create**, which
takes tab-separated rows pasted from a spreadsheet.

1. Back up first: **Settings → Backup**. Keep the file. Do this before every phase.
2. Create the groups first (Settings → Chart of Accounts → New Group), in code order.
3. Create **one** account manually in each of Balance Sheet and P&L.
4. Click **Batch Update** on the Chart of Accounts to see the exact column headers your
   version uses, and copy that header row.
5. Match `import/chart-of-accounts.tsv` to that header, then **Batch Create** the rest.

Step 4 is not optional. Manager's batch columns differ between versions, and I would be
guessing if I handed you a fixed header. Send me a screenshot of your Batch Update
header row and I will produce the exact paste-ready file for your version.

**Nothing gets deleted in this phase.** If accounts already exist in your file, send me
the backup (O3) and I will map old to new before you change anything.

---

## Next: Phase 3 — customers, suppliers and the Salik/fines recharge chain

Blocked on nothing. Starts once you approve this chart of accounts.
