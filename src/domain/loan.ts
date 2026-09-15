/**
 * Loan / vehicle-finance domain logic.
 *
 * The business finances vehicles (see the loan sheet). This module computes
 * fixed-payment amortization schedules. Money is in fils (integer) and the
 * monthly rate is a decimal fraction.
 */

export interface LoanTerms {
  /** Principal borrowed, in fils. */
  principalFils: number;
  /** Annual nominal interest rate as a fraction, e.g. 0.12 for 12%. */
  annualRate: number;
  /** Number of monthly payments. */
  termMonths: number;
}

export interface AmortizationRow {
  month: number;
  paymentFils: number;
  interestFils: number;
  principalFils: number;
  balanceFils: number;
}

function validateTerms(terms: LoanTerms): void {
  if (!Number.isInteger(terms.principalFils) || terms.principalFils <= 0) {
    throw new RangeError("principalFils must be a positive integer");
  }
  if (terms.annualRate < 0) {
    throw new RangeError("annualRate must be >= 0");
  }
  if (!Number.isInteger(terms.termMonths) || terms.termMonths <= 0) {
    throw new RangeError("termMonths must be a positive integer");
  }
}

/**
 * Fixed monthly payment (rounded to whole fils) using the standard
 * amortization formula. Handles the zero-interest case separately.
 */
export function monthlyPayment(terms: LoanTerms): number {
  validateTerms(terms);
  const r = terms.annualRate / 12;
  if (r === 0) {
    return Math.round(terms.principalFils / terms.termMonths);
  }
  const factor = Math.pow(1 + r, terms.termMonths);
  return Math.round((terms.principalFils * r * factor) / (factor - 1));
}

/**
 * Builds the full amortization schedule. The final payment is adjusted so the
 * balance lands exactly on zero, absorbing any rounding drift.
 */
export function amortizationSchedule(terms: LoanTerms): AmortizationRow[] {
  validateTerms(terms);
  const r = terms.annualRate / 12;
  const payment = monthlyPayment(terms);
  const rows: AmortizationRow[] = [];
  let balance = terms.principalFils;

  for (let month = 1; month <= terms.termMonths; month++) {
    const interestFils = Math.round(balance * r);
    const isLast = month === terms.termMonths;
    let principalPortion = payment - interestFils;
    let paymentFils = payment;

    if (isLast || principalPortion >= balance) {
      // Settle the remaining balance exactly on the final (or fully-covering) payment.
      principalPortion = balance;
      paymentFils = balance + interestFils;
    }

    balance -= principalPortion;
    rows.push({
      month,
      paymentFils,
      interestFils,
      principalFils: principalPortion,
      balanceFils: balance,
    });

    if (balance === 0) break;
  }

  return rows;
}

/** Total interest paid across the life of the loan, in fils. */
export function totalInterest(terms: LoanTerms): number {
  return amortizationSchedule(terms).reduce((sum, row) => sum + row.interestFils, 0);
}
