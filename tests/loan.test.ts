import { describe, it, expect } from "vitest";
import {
  LoanTerms,
  monthlyPayment,
  amortizationSchedule,
  totalInterest,
} from "../src/domain/loan.js";

describe("monthlyPayment", () => {
  it("splits principal evenly for a zero-interest loan", () => {
    const terms: LoanTerms = { principalFils: 120_000, annualRate: 0, termMonths: 12 };
    expect(monthlyPayment(terms)).toBe(10_000);
  });

  it("matches the standard amortization formula for an interest-bearing loan", () => {
    // 100,000 fils @ 12% annual (1% monthly) over 12 months ≈ 8885 fils/month.
    const terms: LoanTerms = { principalFils: 100_000, annualRate: 0.12, termMonths: 12 };
    expect(monthlyPayment(terms)).toBe(8_885);
  });

  it("rejects a non-positive principal", () => {
    expect(() => monthlyPayment({ principalFils: 0, annualRate: 0.1, termMonths: 12 })).toThrow(
      RangeError,
    );
  });

  it("rejects a non-positive term", () => {
    expect(() => monthlyPayment({ principalFils: 1000, annualRate: 0.1, termMonths: 0 })).toThrow(
      RangeError,
    );
  });

  it("rejects a negative interest rate", () => {
    expect(() => monthlyPayment({ principalFils: 1000, annualRate: -0.1, termMonths: 12 })).toThrow(
      RangeError,
    );
  });
});

describe("amortizationSchedule", () => {
  it("produces one row per month", () => {
    const terms: LoanTerms = { principalFils: 100_000, annualRate: 0.12, termMonths: 12 };
    expect(amortizationSchedule(terms)).toHaveLength(12);
  });

  it("ends with a zero balance", () => {
    const terms: LoanTerms = { principalFils: 100_000, annualRate: 0.12, termMonths: 12 };
    const rows = amortizationSchedule(terms);
    expect(rows[rows.length - 1]!.balanceFils).toBe(0);
  });

  it("keeps payment = interest + principal for every row", () => {
    const terms: LoanTerms = { principalFils: 250_000, annualRate: 0.09, termMonths: 24 };
    for (const row of amortizationSchedule(terms)) {
      expect(row.paymentFils).toBe(row.interestFils + row.principalFils);
    }
  });

  it("repays exactly the principal across all rows", () => {
    const terms: LoanTerms = { principalFils: 333_333, annualRate: 0.075, termMonths: 18 };
    const rows = amortizationSchedule(terms);
    const principalRepaid = rows.reduce((s, r) => s + r.principalFils, 0);
    expect(principalRepaid).toBe(terms.principalFils);
  });

  it("handles a zero-interest schedule", () => {
    const terms: LoanTerms = { principalFils: 120_000, annualRate: 0, termMonths: 12 };
    const rows = amortizationSchedule(terms);
    expect(rows.every((r) => r.interestFils === 0)).toBe(true);
    expect(rows[rows.length - 1]!.balanceFils).toBe(0);
  });
});

describe("totalInterest", () => {
  it("is zero for a zero-interest loan", () => {
    expect(totalInterest({ principalFils: 120_000, annualRate: 0, termMonths: 12 })).toBe(0);
  });

  it("is positive for an interest-bearing loan", () => {
    expect(totalInterest({ principalFils: 100_000, annualRate: 0.12, termMonths: 12 })).toBeGreaterThan(0);
  });
});
