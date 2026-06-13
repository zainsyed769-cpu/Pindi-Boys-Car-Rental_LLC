# Lease-to-Own Pricing Model — Prime Hire Car Rental

Operated on the Pindi Boys Car Rental L.L.C fleet (Dubai, RTA-registered).
All amounts in **AED**. This document explains *how* monthly payments are
calculated so pricing stays consistent and always above the internal cost
floor.

> Engine: `lease-to-own/model/pricing.js` · Fleet data: `lease-to-own/data/cars.js`
> Generated sheet: `lease-to-own/data/pricing-sheet.csv`

---

## 1. Two products (like Diamond Lease)

| Product | Monthly | End of term | Best for |
|---|---|---|---|
| **Lease-to-Own** | Higher — fully amortises the car | **Customer owns the car** (title transfer) | Customers who want to own |
| **Flexi Lease** | Lower — a residual is deferred | Pay **buyout** to own, return, or re-lease | Customers who want flexibility / lower monthly |

---

## 2. Inputs per vehicle

- **Vehicle value `P`** — estimated UAE on-road value (`price` in `cars.js`).
- **Down payment %** — 0–40% (default 10%). Reduces the financed amount.
- **Term** — 12 / 24 / 36 / 48 months.
- **Bank instalment** — the unit's monthly bank financing cost; used only as
  the internal **cost floor** (never shown to customers).

## 3. Program assumptions (tunable in `DEFAULTS`)

| Parameter | Value | Meaning |
|---|---|---|
| `annualProfitRate` | **14% p.a. (flat)** | Murabaha-style markup on the financed amount |
| `insurancePctOfValue` | **4% of value / yr** | Comprehensive insurance bundled in |
| `annualMaintenance` | **AED 2,400 / yr** | Service + tyres allowance |
| `annualRegistration` | **AED 1,200 / yr** | RTA registration + inspection |
| `vatRate` | **5%** | UAE VAT on the lease service |
| `residualPct` | 12m 55% · 24m 40% · 36m 25% · 48m 10% | Flexi buyout as % of value |

## 4. Formulae

**Operating cost / month** (both products):
```
operating = (P × 4%  +  2,400  +  1,200) / 12
```

**Lease-to-Own**
```
down      = P × down%
financed  = P − down
markup    = financed × 14% × (term / 12)
monthly   = ((financed + markup) / term  +  operating) × 1.05 (VAT)
```

**Flexi Lease**
```
residual  = P × residualPct[term]
down      = P × down%
financed  = P − down − residual          (residual deferred to buyout)
markup    = (P − down) × 14% × (term / 12)
monthly   = ((financed + markup) / term  +  operating) × 1.05 (VAT)
buyout    = residual                      (pay at end to own)
```

## 5. Cost floor & margin guard

```
costFloor = bankInstalment + operating          (internal only)
margin    = customerMonthly − costFloor
```
The generator (`scripts/generate-pricing.js`) prints `margin/mo` for every
quote. **Every published quote must keep a positive margin.** With the
defaults above, all current fleet quotes do.

## 6. Regenerating the sheet

```bash
node lease-to-own/scripts/generate-pricing.js
```
Produces `lease-to-own/data/pricing-sheet.csv` (every model × every term, both
products, with margins) and prints a 36-month summary.

## 7. Important caveats

- `price` values are **working estimates** by model/year. Replace each with the
  real purchase invoice or current market valuation before quoting a customer.
- The flat-rate markup is a pricing convention, **not** a regulated APR/profit
  rate disclosure. For a Sharia-compliant or RTA/finance-regulated product,
  have the structure reviewed by a UAE legal/finance advisor (see
  `docs/program-sop.md`).
