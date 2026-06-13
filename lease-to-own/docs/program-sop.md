# Lease-to-Own Program — Standard Operating Procedure (SOP)

**Prime Hire Car Rental**, Dubai · Internal document

## 1. Goal

Launch a Diamond-Lease-style **lease-to-own** product for Prime Hire Car Rental:
customers pay a fixed monthly amount with insurance and service bundled, and
either own the car at term end (Lease-to-Own) or take a lower monthly with a
buyout (Flexi Lease).

## 2. Pre-launch checklist

- [ ] **Trade licence** confirms leasing / lease-to-own is a permitted activity.
      If not, add the activity or partner with a licensed finance entity.
- [ ] **Bank consent:** for any vehicle financed/mortgaged to a UAE bank,
      confirm with the bank that lease-to-own and eventual title transfer are
      permitted while the mortgage is open, and the settlement process to
      release each car.
- [ ] **Insurance:** confirm the comprehensive policy permits long-term lease
      use and additional named drivers.
- [ ] **Legal review** of the Agreement + T&C by a UAE legal advisor.
- [ ] **Real vehicle valuations** loaded into `cars.js` (replace estimates).
- [ ] **VAT treatment** of the lease service confirmed with the accountant.

## 3. Pricing governance

- Source of truth: `lease-to-own/model/pricing.js` + `cars.js`.
- Regenerate the internal sheet whenever values or assumptions change:
  ```bash
  node lease-to-own/scripts/generate-pricing.js
  ```
- **Rule:** never publish a quote with a non-positive `margin/mo` over the cost
  floor. The generator prints this column.
- Review assumptions (profit rate, insurance %, residuals) quarterly.

## 4. Customer journey

1. **Enquiry** — website calculator or walk-in. Capture car, plan, term, monthly.
2. **Eligibility** — collect Emirates ID, licence, income proof, bank statements;
   run AECB credit check.
3. **Quote & approve** — confirm down payment, monthly, deposit, buyout.
4. **Sign** — Lease-to-Own Agreement + T&C; collect down payment, first month,
   deposit.
5. **Handover** — RTA/insurance checks, photos, mileage, fuel, condition report.
6. **Servicing** — monthly direct debit; track payments, fines, service due.
7. **End of term** — Lease-to-Own: clear bank mortgage → RTA transfer to
   customer. Flexi: buyout / return / re-lease.

## 5. Roles

| Role | Responsibility |
|---|---|
| Sales | Enquiries, quotes, document collection |
| Finance | Credit checks, pricing approval, bank settlement, VAT |
| Operations | Handover, servicing, fines, repossession |
| Management | Assumption sign-off, bank/legal relationships |

## 6. Risks & controls

| Risk | Control |
|---|---|
| Vehicle still mortgaged to bank | Track payoff per unit; transfer only after clearance |
| Customer default | Deposit + late fees + repossession clause + AECB screening |
| Under-pricing | Cost-floor margin guard in the model |
| Insurance gaps | Comprehensive policy, named-driver checks, excess on customer |
| Regulatory | Trade-licence activity + legal review before launch |

## 7. Assets in this folder

```
lease-to-own/
├── README.md                 program overview & quick start
├── data/
│   ├── cars.js               fleet master data (single source of truth)
│   └── pricing-sheet.csv     generated internal pricing (all models × terms)
├── model/
│   ├── pricing.js            shared pricing engine
│   └── PRICING_MODEL.md      methodology & formulae
├── scripts/
│   └── generate-pricing.js   regenerates pricing-sheet.csv
├── web/
│   ├── index.html            customer site + calculator
│   ├── styles.css
│   └── app.js
└── docs/
    ├── lease-to-own-agreement.md
    ├── terms-and-conditions.md
    └── program-sop.md  (this file)
```
