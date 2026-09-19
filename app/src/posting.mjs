/**
 * Posting rules: how an operational event becomes a ledger entry.
 *
 * This file is the whole of the accounting policy. It is deliberately one
 * readable file rather than logic scattered through the HTTP routes, because
 * the question "why is 4070 credited when a Salik trip is recharged?" has to
 * have one place to be answered — and because an auditor will ask it.
 *
 * Every rule below is stated in the accounting design: see
 * ../accounting/phase-2-chart-of-accounts.md.
 */
import { get, run } from './db.mjs';
import { post, entryFor, reverse } from './ledger.mjs';
import { vatOn } from './money.mjs';

/** Where each kind of billable charge lands in revenue. */
const REVENUE_ACCOUNT = {
  rent: { daily: '4000', weekly: '4010', monthly: '4020', long_term: '4030' },
  delivery: '4040',
  late: '4050',
  mileage: '4060',
  salik: '4070',
  fine: '4080',
  fine_admin: '4080',
  damage: '4090',
  other: '4100',
};

/** Where each expense category lands. Anything unlisted falls to 6150. */
export const EXPENSE_ACCOUNT = {
  insurance: '5000', registration: '5010', mulkia: '5010',
  maintenance: '5020', servicing: '5020', repairs: '5030', accident: '5030',
  tyres: '5040', batteries: '5050', fuel: '5060',
  salik: '5070', fine: '5080', fines: '5080', parking: '5090',
  cleaning: '5100', detailing: '5100', recovery: '5110', towing: '5110',
  inspection: '5120', rta: '5130', accessories: '5140',
  salaries: '6000', visa: '6010', gratuity: '6020', accommodation: '6030',
  rent: '6040', utilities: '6050', telephone: '6060', internet: '6060',
  software: '6070', advertising: '6080', marketing: '6080', commission: '6090',
  professional: '6100', legal: '6100', licence: '6110', supplies: '6120',
  travel: '6130', bank: '6140',
};

/**
 * Lump sums that belong to more than the month they were paid in sit in a
 * prepayment until the months they cover arrive. Insurance is the reason this
 * exists: one premium a year, and without it four months a year look ruinous.
 */
const PREPAID_ACCOUNT = { 5000: '1200', 5010: '1210', 6110: '1220', 6040: '1230' };

const CASH_ACCOUNT = {
  cash: '1000', card: '1010', bank: '1010', cheque: '1010',
  nbd: '1020', islamic: '1010',
};

export const revenueAccountFor = (charge, rental) =>
  charge.kind === 'rent'
    ? (REVENUE_ACCOUNT.rent[rental?.rate_type ?? 'daily'] ?? '4000')
    : (REVENUE_ACCOUNT[charge.kind] ?? '4100');

export const expenseAccountFor = (category) =>
  EXPENSE_ACCOUNT[String(category ?? '').toLowerCase()] ?? '6150';

/**
 * A charge raised on a rental.
 *
 *   Dr 1100 Accounts Receivable        gross
 *     Cr 4xxx revenue                   net
 *     Cr 2200 VAT Payable               VAT
 *
 * A recharged fine is the exception the design calls out: it is recovered at
 * cost, so the fine itself carries no VAT and only the admin fee is taxed.
 * Charging VAT on the fine would be charging the customer tax on a government
 * penalty that never carried any.
 */
export function postCharge(chargeId) {
  const c = get('SELECT * FROM charge WHERE id = ?', chargeId);
  if (!c) throw new Error(`charge ${chargeId} does not exist`);
  if (entryFor('charge', chargeId)) return entryFor('charge', chargeId).id;

  const rental = get('SELECT * FROM rental WHERE id = ?', c.rental_id);
  const revenue = revenueAccountFor(c, rental);
  const gross = c.amount + c.vat_amount;

  const lines = [
    { account: '1100', debit: gross, customer_id: rental?.customer_id, vehicle_id: rental?.vehicle_id,
      memo: c.description },
    { account: revenue, credit: c.amount, vehicle_id: rental?.vehicle_id,
      customer_id: rental?.customer_id,
      tax_code: c.vat_amount ? 'S5' : 'OS', tax_amount: c.vat_amount, memo: c.description },
  ];
  if (c.vat_amount) lines.push({ account: '2200', credit: c.vat_amount, memo: 'Output VAT' });

  return post({
    date: c.charge_date,
    memo: c.description ?? `${c.kind} charge on rental ${c.rental_id}`,
    source: 'charge', source_id: c.id, lines,
  });
}

/**
 * Money in.
 *
 * A rental payment settles the receivable. A deposit does not: it is the
 * customer's money held by us, so it is a liability on 2100 and never touches
 * income or the customer's balance. Treating a deposit as revenue overstates
 * profit and understates what the company owes back.
 */
export function postPayment(paymentId) {
  const p = get('SELECT * FROM payment WHERE id = ?', paymentId);
  if (!p) throw new Error(`payment ${paymentId} does not exist`);
  if (entryFor('payment', paymentId)) return entryFor('payment', paymentId).id;

  const cash = CASH_ACCOUNT[String(p.method ?? 'cash').toLowerCase()] ?? '1000';
  const rental = p.rental_id ? get('SELECT * FROM rental WHERE id = ?', p.rental_id) : null;
  const common = { customer_id: p.customer_id, vehicle_id: rental?.vehicle_id };

  let lines;
  if (p.kind === 'deposit') {
    lines = [
      { account: cash, debit: p.amount, ...common, memo: 'Security deposit received' },
      { account: '2100', credit: p.amount, ...common, memo: 'Security deposit held' },
    ];
  } else if (p.kind === 'deposit_refund') {
    lines = [
      { account: '2100', debit: p.amount, ...common, memo: 'Security deposit returned' },
      { account: cash, credit: p.amount, ...common, memo: 'Security deposit returned' },
    ];
  } else {
    lines = [
      { account: cash, debit: p.amount, ...common, memo: 'Rental payment received' },
      { account: '1100', credit: p.amount, ...common, memo: 'Settles receivable' },
    ];
  }

  return post({
    date: p.paid_on,
    memo: p.notes ?? `${p.kind} payment`,
    source: 'payment', source_id: p.id, lines,
  });
}

/**
 * Money out.
 *
 * Input VAT is claimed on the expense, so it is debited to the same 2200 the
 * output tax is credited to: the account carries the net position owed to the
 * FTA, and the return separates the two sides from the tax codes on the lines.
 *
 * A cost that is being recharged to a customer is not the company's cost. It
 * parks on 1110 Billable Expenses until it is recharged, which is what keeps
 * recoverable Salik out of the per-car expense figure.
 */
export function postExpense(expenseId) {
  const e = get('SELECT * FROM expense WHERE id = ?', expenseId);
  if (!e) throw new Error(`expense ${expenseId} does not exist`);
  if (entryFor('expense', expenseId)) return entryFor('expense', expenseId).id;

  const account = expenseAccountFor(e.category);
  const prepaid = e.amortise_months > 1 ? PREPAID_ACCOUNT[account] : null;
  const debitAccount = e.recoverable ? '1110' : (prepaid ?? account);
  const gross = e.amount + e.vat_amount;

  const lines = [
    { account: debitAccount, debit: e.amount, vehicle_id: e.vehicle_id,
      tax_code: e.vat_amount ? 'S5I' : 'OS', tax_amount: e.vat_amount,
      memo: e.description ?? e.category },
  ];
  if (e.vat_amount) lines.push({ account: '2200', debit: e.vat_amount, memo: 'Input VAT' });
  lines.push({ account: '2000', credit: gross, vehicle_id: e.vehicle_id,
    memo: e.supplier ?? 'Supplier' });

  return post({
    date: e.expense_date,
    memo: e.description ?? `${e.category}${e.supplier ? ` — ${e.supplier}` : ''}`,
    source: 'expense', source_id: e.id, lines,
  });
}

/**
 * Release one month of a prepayment into the month it belongs to.
 *
 *   Dr 5000 Vehicle Insurance     one month
 *     Cr 1200 Prepaid Insurance   one month
 *
 * The final month takes the rounding remainder, so twelve releases add back to
 * the premium exactly and the prepayment closes at nil rather than at four fils.
 */
export function postAmortisation(expenseId, monthIndex, date) {
  const e = get('SELECT * FROM expense WHERE id = ?', expenseId);
  if (!e) throw new Error(`expense ${expenseId} does not exist`);
  const account = expenseAccountFor(e.category);
  const prepaid = PREPAID_ACCOUNT[account];
  if (!prepaid || e.amortise_months <= 1) {
    throw new Error(`expense ${expenseId} is not a prepayment (${e.category})`);
  }
  if (monthIndex < 0 || monthIndex >= e.amortise_months) {
    throw new Error(`month ${monthIndex} is outside the ${e.amortise_months}-month term`);
  }

  const perMonth = Math.floor(e.amount / e.amortise_months);
  const amount = monthIndex === e.amortise_months - 1
    ? e.amount - perMonth * (e.amortise_months - 1)
    : perMonth;

  return post({
    date,
    memo: `${e.description ?? e.category} — month ${monthIndex + 1} of ${e.amortise_months}`,
    source: 'expense', source_id: null,
    lines: [
      { account, debit: amount, vehicle_id: e.vehicle_id },
      { account: prepaid, credit: amount, vehicle_id: e.vehicle_id },
    ],
  });
}

/**
 * Depreciation for one vehicle for a period.
 *
 *   Dr 7000 Depreciation — Rental Vehicles
 *     Cr 1510 Accumulated Depreciation
 *
 * Carried on the vehicle's division, because on this fleet depreciation is
 * usually the largest cost on a car and a per-car P&L without it is not a
 * profit figure at all.
 */
export function postDepreciation(vehicleId, amount, date, memo) {
  if (amount <= 0) throw new Error('depreciation must be positive');
  return post({
    date,
    memo: memo ?? `Depreciation to ${date}`,
    source: 'depreciation', source_id: null,
    lines: [
      { account: '7000', debit: amount, vehicle_id: vehicleId },
      { account: '1510', credit: amount, vehicle_id: vehicleId },
    ],
  });
}

/** One lender, one liability account — the design keeps them apart on purpose. */
const FINANCE_ACCOUNT = {
  'emirates nbd': '2400', 'emirates islamic': '2410', 'dubai islamic': '2420',
  'first abu dhabi': '2430', 'al habtoor': '2440',
};

export function financeAccountFor(bank) {
  const b = String(bank ?? '').toLowerCase();
  for (const [name, code] of Object.entries(FINANCE_ACCOUNT)) if (b.includes(name)) return code;
  throw new Error(`no finance liability account for lender "${bank}" — add it to the chart first`);
}

/**
 * A loan instalment, split the way the bank splits it.
 *
 *   Dr 2xxx vehicle finance    principal
 *   Dr 8000 finance interest   interest
 *     Cr bank                  the instalment
 *
 * The whole instalment is not an expense: most of it repays the loan. Booking
 * it all to cost understates profit and leaves the liability on the balance
 * sheet for ever.
 */
export function postInstalment(instalmentId, { cashAccount = '1010' } = {}) {
  const i = get('SELECT * FROM loan_instalment WHERE id = ?', instalmentId);
  if (!i) throw new Error(`instalment ${instalmentId} does not exist`);
  if (entryFor('loan', instalmentId)) return entryFor('loan', instalmentId).id;

  const loan = get('SELECT * FROM loan WHERE id = ?', i.loan_id);
  const liability = financeAccountFor(loan.bank);

  return post({
    date: i.due_date,
    memo: `${loan.bank} instalment ${i.seq}${loan.reference ? ` (${loan.reference})` : ''}`,
    source: 'loan', source_id: i.id,
    lines: [
      { account: liability, debit: i.principal, vehicle_id: loan.vehicle_id, memo: 'Principal' },
      { account: '8000', debit: i.interest, vehicle_id: loan.vehicle_id, memo: 'Interest / profit' },
      { account: cashAccount, credit: i.total, vehicle_id: loan.vehicle_id },
    ],
  });
}

/**
 * Selling a vehicle: remove it and its accumulated depreciation from the books
 * and recognise whatever the difference to the sale price turns out to be.
 *
 * The gain or loss is not a figure anyone chooses — it falls out of cost less
 * depreciation against proceeds, which is why it is computed here and not
 * accepted as an input.
 */
export function postDisposal(vehicleId, { proceeds, date, accumulated, cashAccount = '1010' }) {
  const v = get('SELECT * FROM vehicle WHERE id = ?', vehicleId);
  if (!v) throw new Error(`vehicle ${vehicleId} does not exist`);
  if (!v.purchase_price) throw new Error(`vehicle ${v.code} has no purchase price — cannot compute the gain`);

  const netBook = v.purchase_price - accumulated;
  const gain = proceeds - netBook;

  const lines = [
    { account: cashAccount, debit: proceeds, vehicle_id: vehicleId, memo: `Sale of ${v.code}` },
    { account: '1510', debit: accumulated, vehicle_id: vehicleId, memo: 'Depreciation removed' },
    { account: '1500', credit: v.purchase_price, vehicle_id: vehicleId, memo: 'Vehicle removed at cost' },
  ];
  if (gain > 0) lines.push({ account: '9000', credit: gain, vehicle_id: vehicleId, memo: 'Gain on disposal' });
  if (gain < 0) lines.push({ account: '9010', debit: -gain, vehicle_id: vehicleId, memo: 'Loss on disposal' });

  return post({
    date, memo: `Disposal of ${v.code} ${v.plate}`,
    source: 'disposal', source_id: vehicleId, lines,
  });
}

/**
 * The investor's share of a car's profit.
 *
 * The investor is a creditor, not a shareholder: this is a single-owner LLC and
 * the investor owns a share of the profit, not of the company. So the share is
 * a cost on 5900 and a liability on 2500 — never a movement in equity.
 */
export function postInvestorShare(vehicleId, amount, date, memo) {
  if (amount <= 0) throw new Error('investor share must be positive');
  return post({
    date, memo: memo ?? 'Investor profit share',
    source: 'investor', source_id: null,
    lines: [
      { account: '5900', debit: amount, vehicle_id: vehicleId },
      { account: '2500', credit: amount, vehicle_id: vehicleId },
    ],
  });
}

/** Re-post an operational event after correcting it: reverse, then post again. */
export function repost(source, sourceId, { date, reason } = {}) {
  const existing = entryFor(source, sourceId);
  if (existing) reverse(existing.id, { date, reason });
  const poster = { charge: postCharge, payment: postPayment, expense: postExpense, loan: postInstalment };
  if (!poster[source]) throw new Error(`no posting rule for source "${source}"`);
  return poster[source](sourceId);
}

export { vatOn };
