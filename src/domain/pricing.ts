/**
 * Pricing domain logic.
 *
 * All money is handled in integer fils (1 AED = 100 fils) so we never lose
 * money to floating-point rounding. Functions are pure and return whole fils.
 */

import { DateRange, rentalDays } from "./booking.js";

export interface PricingPolicy {
  /** Base daily rate in fils. */
  dailyRateFils: number;
  /** VAT rate as a fraction, e.g. 0.05 for 5%. */
  vatRate: number;
  /** Refundable security deposit in fils. */
  depositFils: number;
  /** Per-day discount fraction applied once a rental reaches `weeklyThreshold` days. */
  weeklyDiscountRate?: number;
  /** Minimum rental length (in days) at which the weekly discount kicks in. */
  weeklyThreshold?: number;
}

export interface Quote {
  days: number;
  subtotalFils: number;
  discountFils: number;
  taxableFils: number;
  vatFils: number;
  depositFils: number;
  /** What the customer pays up front: taxable + VAT + deposit. */
  totalDueFils: number;
}

function assertNonNegativeInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer (fils), got ${value}`);
  }
}

/**
 * Builds a full price quote for a rental period under a pricing policy.
 * Rounding for discount and VAT uses banker-free half-up on whole fils.
 */
export function quoteRental(period: DateRange, policy: PricingPolicy): Quote {
  assertNonNegativeInt(policy.dailyRateFils, "dailyRateFils");
  assertNonNegativeInt(policy.depositFils, "depositFils");
  if (policy.vatRate < 0) {
    throw new RangeError(`vatRate must be >= 0, got ${policy.vatRate}`);
  }

  const days = rentalDays(period);
  const subtotalFils = policy.dailyRateFils * days;

  let discountFils = 0;
  const threshold = policy.weeklyThreshold ?? 7;
  if (policy.weeklyDiscountRate && days >= threshold) {
    if (policy.weeklyDiscountRate < 0 || policy.weeklyDiscountRate > 1) {
      throw new RangeError(
        `weeklyDiscountRate must be between 0 and 1, got ${policy.weeklyDiscountRate}`,
      );
    }
    discountFils = Math.round(subtotalFils * policy.weeklyDiscountRate);
  }

  const taxableFils = subtotalFils - discountFils;
  const vatFils = Math.round(taxableFils * policy.vatRate);
  const totalDueFils = taxableFils + vatFils + policy.depositFils;

  return {
    days,
    subtotalFils,
    discountFils,
    taxableFils,
    vatFils,
    depositFils: policy.depositFils,
    totalDueFils,
  };
}

/**
 * Late-return fee: each day (or part thereof) past the agreed return is billed
 * at the daily rate times a penalty multiplier.
 */
export function lateFee(
  agreedReturn: Date,
  actualReturn: Date,
  dailyRateFils: number,
  penaltyMultiplier = 1.5,
): number {
  assertNonNegativeInt(dailyRateFils, "dailyRateFils");
  if (penaltyMultiplier < 0) {
    throw new RangeError(`penaltyMultiplier must be >= 0, got ${penaltyMultiplier}`);
  }
  const overdueMs = actualReturn.getTime() - agreedReturn.getTime();
  if (overdueMs <= 0) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  const lateDays = Math.ceil(overdueMs / msPerDay);
  return Math.round(lateDays * dailyRateFils * penaltyMultiplier);
}
