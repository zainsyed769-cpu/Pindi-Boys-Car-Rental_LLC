# Pindi Boys Fleet & Rental System

A rental management system for Pindi Boys Car Rental L.L.C. — 51 vehicles, Dubai, AED.

It answers the questions no off-the-shelf accounting package can:
**is this car making money, who is in it right now, who owes us, and which fines are recoverable?**

## Running it

```bash
cd app
node src/seed.mjs --reset    # load the 51 vehicles from the fleet report
node src/demo.mjs            # optional: one worked rental so the screens aren't empty
npm start                    # http://localhost:3000
```

**No dependencies. No build step. No `npm install`.** It uses Node's own HTTP server and
Node's built-in SQLite. That is deliberate: a business system should not stop working
because a package updated three years from now. It needs Node 22.5 or newer, nothing else.

The whole database is one file — `app/data/pindiboys.db`. Backing up means copying that
file. It is gitignored, because live business data does not belong in a git repository.

## What it does today

| Screen | What it gives you |
|---|---|
| **Dashboard** | Fleet on rent vs idle, revenue, net profit, receivables, deposits held, unallocated fines, and how many cars lost money |
| **Fleet** | All 51 vehicles, who is in each one right now, insurance expiry flagged red when expired and amber inside 45 days |
| **Rentals** | Open a rental, check a car back in, see billed vs paid vs balance per contract |
| **Customers** | Customer records with ID details, and what each one owes |
| **Fines** | Every fine split into unallocated / recharged / company-borne, and one click to bill it to whoever had the car |
| **Expenses** | Per-vehicle costs, with lump sums spreadable over months |
| **Car P&L** | Profit per car — worst first — after direct costs, depreciation and finance |
| **Utilisation** | Days rented, days idle, utilisation %, revenue per available day — least used first |

### Rules built into it, not left to staff memory

- **A car cannot be double-booked.** Opening a second rental on a car that is already out
  is rejected, naming the contract it is already on.
- **Opening a rental raises the rent charge automatically.** Revenue is never "to be
  invoiced later" — the commonest way a rental business quietly loses money on paper.
- **Deposits are never income.** A deposit is held against the rental and does not reduce
  the customer's balance. In the worked example the customer paid AED 1,500 deposit and
  AED 2,625 rent, and still correctly shows AED 478.50 owing.
- **A fine can only be billed to a rental that actually covers its date.** Try to recharge
  a fine issued while the car was off-hire and the system refuses: that one is a company
  cost, and it says so.
- **Fines are recharged at cost; only the handling fee carries VAT.** Confirm the treatment
  with your tax accountant — the split is coded so it can be changed in one place.
- **Lump sums are spread.** An annual insurance premium entered with "spread over 12
  months" hits each month with a twelfth, instead of making one month look terrible.
- **Money is stored in fils as whole numbers**, never floating point. What a customer owes
  is never decided by a rounding error.
- **Depreciation is charged per day owned**, straight line to a 20% residual over 5 years
  by default, adjustable per vehicle.

### The worked example, and why it matters

The demo loads the exact scenario from the original brief: Toyota Highlander, AED 250/day,
10 days, AED 1,500 deposit, AED 120 Salik.

```
REVENUE                    2,970.00     rent 2,500 + salik 120 + fine 300 + admin 50
DIRECT COSTS              -1,316.67     insurance 416.67 + service 700 + absorbed fine 200
DEPRECIATION              -1,970.41
                          ----------
NET PROFIT                  -317.08

Utilisation   10 of 31 days = 32.3%     idle 21 days
```

On cash it looks like a good month. Once depreciation is counted **that car lost AED 317**,
and the real problem is that it sat idle for 21 days. That single view is the reason to
build this.

## Architecture

```
app/
├── schema.sql          Tables. Money in fils, dates as ISO strings.
├── src/
│   ├── db.mjs          SQLite connection and transaction helper
│   ├── money.mjs       Fils/AED conversion and 5% VAT
│   ├── dates.mjs       Inclusive day counting and period overlap
│   ├── reports.mjs     P&L, depreciation, utilisation — the business logic
│   ├── server.mjs      HTTP + REST API
│   ├── seed.mjs        Loads the fleet from accounting/data/*.csv
│   └── demo.mjs        One worked rental
└── public/             index.html, app.js, styles.css — no framework
```

Reports are computed from transactions on every request rather than stored. At this size
that is instant, and it means a corrected expense immediately corrects every report — there
are no stale totals to rebuild.

## Not built yet

Listed honestly, because a half-built system that pretends to be complete is worse than none:

- **Login and user accounts.** Right now anyone who can reach the port can use it. This
  must be added before it goes on the internet.
- **Double-entry ledger and VAT return.** It records VAT per charge but does not produce an
  FTA return. See `../accounting/decisions.md`.
- **Loan schedules.** The tables (`loan`, `loan_instalment`) exist and the P&L reads from
  them, but nothing populates them yet — that needs the original loan spreadsheet.
- **Salik import.** The `salik_trip` table and its P&L treatment exist; the CSV importer does not.
- **Investor statements.** The profit-share calculation is in the P&L; the monthly statement
  screen is not built.
- **Rental agreement PDFs, WhatsApp reminders, photo capture at check-out.**
- **Automated tests.** The workflows above were verified by hand against a running server.
