import { describe, it, expect } from "vitest";
import { DateRange } from "../src/domain/booking.js";
import { PricingPolicy, quoteRental, lateFee } from "../src/domain/pricing.js";

const range = (startIso: string, endIso: string): DateRange => ({
  start: new Date(startIso),
  end: new Date(endIso),
});

const basePolicy: PricingPolicy = {
  dailyRateFils: 10_000, // 100 AED/day
  vatRate: 0.05,
  depositFils: 50_000, // 500 AED
};

describe("quoteRental", () => {
  it("computes subtotal, VAT and total for a simple rental", () => {
    const q = quoteRental(range("2025-01-01", "2025-01-05"), basePolicy);
    expect(q.days).toBe(4);
    expect(q.subtotalFils).toBe(40_000);
    expect(q.discountFils).toBe(0);
    expect(q.taxableFils).toBe(40_000);
    expect(q.vatFils).toBe(2_000);
    expect(q.totalDueFils).toBe(40_000 + 2_000 + 50_000);
  });

  it("applies a weekly discount once the threshold is reached", () => {
    const policy: PricingPolicy = {
      ...basePolicy,
      weeklyDiscountRate: 0.1,
      weeklyThreshold: 7,
    };
    const q = quoteRental(range("2025-01-01", "2025-01-08"), policy); // 7 days
    expect(q.subtotalFils).toBe(70_000);
    expect(q.discountFils).toBe(7_000);
    expect(q.taxableFils).toBe(63_000);
    expect(q.vatFils).toBe(3_150);
  });

  it("does not apply the discount below the threshold", () => {
    const policy: PricingPolicy = {
      ...basePolicy,
      weeklyDiscountRate: 0.1,
      weeklyThreshold: 7,
    };
    const q = quoteRental(range("2025-01-01", "2025-01-04"), policy); // 3 days
    expect(q.discountFils).toBe(0);
  });

  it("rejects a negative VAT rate", () => {
    expect(() => quoteRental(range("2025-01-01", "2025-01-02"), { ...basePolicy, vatRate: -0.1 })).toThrow(
      RangeError,
    );
  });

  it("rejects a non-integer daily rate", () => {
    expect(() =>
      quoteRental(range("2025-01-01", "2025-01-02"), { ...basePolicy, dailyRateFils: 99.5 }),
    ).toThrow(RangeError);
  });

  it("rejects a discount rate above 1", () => {
    expect(() =>
      quoteRental(range("2025-01-01", "2025-01-10"), {
        ...basePolicy,
        weeklyDiscountRate: 1.5,
        weeklyThreshold: 1,
      }),
    ).toThrow(RangeError);
  });
});

describe("lateFee", () => {
  it("is zero when returned on time", () => {
    expect(lateFee(new Date("2025-01-05T12:00:00Z"), new Date("2025-01-05T12:00:00Z"), 10_000)).toBe(0);
  });

  it("is zero when returned early", () => {
    expect(lateFee(new Date("2025-01-05T12:00:00Z"), new Date("2025-01-04T12:00:00Z"), 10_000)).toBe(0);
  });

  it("charges 1.5x the daily rate per overdue day by default", () => {
    const fee = lateFee(new Date("2025-01-05T12:00:00Z"), new Date("2025-01-07T12:00:00Z"), 10_000);
    expect(fee).toBe(2 * 10_000 * 1.5);
  });

  it("rounds a partial overdue day up to a full day", () => {
    const fee = lateFee(new Date("2025-01-05T12:00:00Z"), new Date("2025-01-05T18:00:00Z"), 10_000);
    expect(fee).toBe(1 * 10_000 * 1.5);
  });

  it("rejects a negative penalty multiplier", () => {
    expect(() => lateFee(new Date("2025-01-05"), new Date("2025-01-06"), 10_000, -1)).toThrow(RangeError);
  });
});
