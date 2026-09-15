# Pindi-Boys-Car-Rental_LLC

Pindi Boys Car Rental Project.

This repository contains the core **domain logic** for the car-rental business —
fleet management, bookings, pricing, and vehicle finance — written in TypeScript
with a comprehensive, fast unit-test suite.

## Why this exists

The repo originally held only business documents (fleet report, bank statement,
loan sheet, trade licence). This scaffold turns the implied business rules in
those documents into tested, reusable code so the rest of the application
(API, UI, persistence) can be built on a trustworthy foundation.

## Modules (`src/domain`)

| Module | Responsibility | Key functions |
|--------|----------------|---------------|
| `vehicle.ts` | Fleet status machine | `transitionStatus`, `isBookable`, `recordReturn` |
| `booking.ts` | Reservations & conflict detection | `createBooking`, `isVehicleAvailable`, `rangesOverlap`, `rentalDays` |
| `pricing.ts` | Quotes, VAT, discounts, late fees | `quoteRental`, `lateFee` |
| `loan.ts` | Vehicle-finance amortization | `monthlyPayment`, `amortizationSchedule`, `totalInterest` |

### Design notes

- **Money is integer fils** (1 AED = 100 fils) everywhere to avoid
  floating-point rounding errors in financial calculations.
- Functions are **pure and immutable** — they never mutate their inputs — which
  keeps them easy to test and safe to compose.
- Dates use half-open intervals `[start, end)`, so back-to-back rentals do not
  count as a double-booking.

## Getting started

```bash
npm install        # install dev dependencies
npm test           # run the test suite
npm run coverage   # run tests with a coverage report
npm run typecheck  # type-check without emitting
npm run build      # compile to dist/
```

## Test coverage

The suite currently has **49 tests at 100% coverage** of the domain modules,
with thresholds enforced in `vitest.config.ts` (lines/functions/statements ≥ 90%,
branches ≥ 85%). CI runs type-checking and the coverage gate on every push and
pull request (`.github/workflows/ci.yml`).

### Where to grow tests next

As the application expands beyond pure domain logic, prioritise:

1. **Persistence / repository layer** — round-tripping bookings and vehicles to
   the database, transactional double-booking prevention under concurrency.
2. **API / input validation** — auth, request-body validation, error responses.
3. **Bank-statement reconciliation** — matching payments to bookings, partial
   and duplicate payments (data lives in the bank-statement PDF).
4. **Customer & compliance** — driver-licence validation, trade-licence expiry.
5. **End-to-end booking flow** — quote → reserve → pick up → return → invoice.
