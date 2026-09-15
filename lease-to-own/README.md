# Prime Hire Car Rental — Lease-to-Own Program

A Diamond-Lease-style **lease-to-own** product for **Prime Hire Car Rental**
(Dubai). Customers pay a fixed monthly amount — with **insurance, service,
registration and VAT included** — and either **own the car** at the end
(Lease-to-Own) or take a lower monthly with a **buyout option** (Flexi Lease).

> Brand: **Prime Hire Car Rental**, Dubai, UAE.

## What's inside

| Part | Where | What it does |
|---|---|---|
| **Pricing model** | `model/pricing.js`, `model/PRICING_MODEL.md` | Shared engine + documented methodology |
| **Fleet data** | `data/cars.js` | Single source of truth (from RTA fleet report + loan sheet) |
| **Pricing sheet** | `data/pricing-sheet.csv` | Generated: every model × term, both products, with margins |
| **Web calculator** | `web/index.html` | Customer site, fleet grid, live payment calculator |
| **Contract & docs** | `docs/` | Agreement template, T&C, launch SOP |

## Two products

- **Lease-to-Own** — monthly fully amortises the car; **you own it** at term end.
- **Flexi Lease** — lower monthly with a residual **buyout** to own, return, or re-lease.

Terms: **12 / 24 / 36 / 48 months**. Down payment: **0–40%**.

## Quick start

**View the website** (no build step — static files):
```bash
cd lease-to-own/web
python3 -m http.server 8080
# open http://localhost:8080
```

**Regenerate the internal pricing sheet:**
```bash
node lease-to-own/scripts/generate-pricing.js
# writes data/pricing-sheet.csv + prints a 36-month summary
```

## Before going live

See `docs/program-sop.md` — the key items are: confirm leasing is on the trade
licence, get **bank consent** for title transfer on mortgaged vehicles, replace
the **estimated vehicle values** in `cars.js` with real valuations, and have the
**Agreement + T&C legally reviewed** for the UAE.

> All quoted figures are **indicative** and subject to credit approval, bank
> mortgage clearance, and a signed agreement.
