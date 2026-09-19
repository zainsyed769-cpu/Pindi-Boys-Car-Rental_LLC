/**
 * The UAE VAT return (FTA form VAT 201).
 *
 * The figures come from the tax codes on the journal lines, not from the
 * balance of 2200. The GL keeps one net VAT control account — what is owed to
 * the FTA — while the return has to declare output tax and recoverable input
 * tax on separate lines. Deriving the boxes from the lines keeps both true at
 * once, and means the return can be re-run for a past quarter and come back
 * with the same numbers it was filed with.
 *
 * ⚠️ This produces the figures. It does not file anything, and it is not
 * tax advice: the return is the owner's to check and submit on the FTA portal.
 * Pindi Boys is a Dubai-registered company, so supplies sit in the Dubai box.
 *
 * Still to confirm with the tax accountant, and recorded as such rather than
 * assumed: the TRN and the quarter end (decisions.md O1), and whether any
 * supply is zero-rated or exempt rather than standard.
 */
import { all, get } from './db.mjs';
import { profitAndLoss } from './ledger.mjs';

const EMIRATE = 'Dubai';

/**
 * @param from  first day of the tax period, 'YYYY-MM-DD'
 * @param to    last day of the tax period
 */
export function vatReturn(from, to) {
  // Output tax: the VAT on what was billed out. Taken from the revenue lines,
  // which is where postCharge records the tax code and the tax amount.
  const output = all(`
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS net,
           COALESCE(SUM(l.tax_amount), 0)       AS vat
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
      JOIN tax_code t ON t.code = l.tax_code
     WHERE j.entry_date BETWEEN ? AND ?
       AND a.type = 'income' AND t.direction = 'output' AND t.rate > 0`, from, to)[0];

  const zeroRated = all(`
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS net
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
      JOIN tax_code t ON t.code = l.tax_code
     WHERE j.entry_date BETWEEN ? AND ?
       AND a.type = 'income' AND t.code = 'Z0'`, from, to)[0];

  const exempt = all(`
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS net
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
      JOIN tax_code t ON t.code = l.tax_code
     WHERE j.entry_date BETWEEN ? AND ?
       AND a.type = 'income' AND t.code = 'EX'`, from, to)[0];

  // Input tax: VAT on costs, recoverable. Expense and asset lines both count —
  // the VAT on a vehicle purchase is reclaimable just as the VAT on tyres is.
  const input = all(`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) AS net,
           COALESCE(SUM(l.tax_amount), 0)       AS vat
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
      JOIN tax_code t ON t.code = l.tax_code
     WHERE j.entry_date BETWEEN ? AND ?
       AND a.type IN ('expense','asset') AND t.direction = 'input'`, from, to)[0];

  const reverseCharge = all(`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) AS net,
           COALESCE(SUM(l.tax_amount), 0)       AS vat
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
     WHERE j.entry_date BETWEEN ? AND ? AND l.tax_code = 'RC'`, from, to)[0];

  const outputTax = output.vat + reverseCharge.vat;
  const inputTax = input.vat + reverseCharge.vat;   // reverse charge nets to nil
  const payable = outputTax - inputTax;

  return {
    period: { from, to },
    emirate: EMIRATE,
    // Box numbers as they appear on VAT 201.
    boxes: {
      '1a': { label: `Standard rated supplies — ${EMIRATE}`, amount: output.net, vat: output.vat },
      '4': { label: 'Zero rated supplies', amount: zeroRated.net, vat: 0 },
      '5': { label: 'Exempt supplies', amount: exempt.net, vat: 0 },
      '6': { label: 'Goods imported into the UAE', amount: reverseCharge.net, vat: reverseCharge.vat },
      '9': { label: 'Standard rated expenses', amount: input.net, vat: input.vat },
      '10': { label: 'Supplies subject to reverse charge', amount: reverseCharge.net, vat: reverseCharge.vat },
    },
    total_output_tax: outputTax,
    total_input_tax: inputTax,
    /** Positive: owed to the FTA. Negative: reclaimable from the FTA. */
    net_vat_payable: payable,
    /**
     * The control account's own movement over the same period. It should equal
     * the net payable; if it does not, a VAT amount was posted without a tax
     * code or with the wrong one, and the return would understate or overstate
     * the liability. Better to surface the disagreement than to file it.
     */
    control_account_movement: controlMovement(from, to),
  };
}

function controlMovement(from, to) {
  const r = get(`
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS net
      FROM journal_line l JOIN journal j ON j.id = l.journal_id
     WHERE l.account_code = '2200' AND j.entry_date BETWEEN ? AND ?`, from, to);
  return r?.net ?? 0;
}

/** True when the return agrees with account 2200 to the fils. */
export const vatReconciles = (r) => r.net_vat_payable === r.control_account_movement;

/**
 * The four quarters of a calendar year. Which one the company actually files
 * on depends on the tax period the FTA gave it — still outstanding as O1 — so
 * this is the default and not a statement of fact about the filing dates.
 */
export function quarters(year) {
  return [
    { q: 1, from: `${year}-01-01`, to: `${year}-03-31` },
    { q: 2, from: `${year}-04-01`, to: `${year}-06-30` },
    { q: 3, from: `${year}-07-01`, to: `${year}-09-30` },
    { q: 4, from: `${year}-10-01`, to: `${year}-12-31` },
  ];
}

/** Revenue for the period straight off the P&L, to sanity-check box 1a against. */
export const revenueForPeriod = (from, to) => profitAndLoss(from, to).total_income;
