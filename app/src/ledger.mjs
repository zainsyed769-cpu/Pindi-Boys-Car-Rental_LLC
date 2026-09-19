/**
 * The general ledger.
 *
 * Every figure in the statutory accounts and in the FTA return comes from here.
 * Three rules are enforced rather than trusted:
 *
 *   1. an entry balances, to the fils, or it does not post at all;
 *   2. an entry inside a locked period does not post — a filed VAT quarter
 *      cannot move underneath the filing;
 *   3. a posted entry is never edited or deleted, only reversed, so the audit
 *      trail is the whole trail and not the surviving half of it.
 */
import { all, get, run, tx } from './db.mjs';
import { today } from './dates.mjs';

export class LedgerError extends Error {}

export const lockedUpto = () =>
  get('SELECT MAX(locked_upto) AS d FROM period_lock')?.d ?? null;

export function lockPeriod(upto, reason) {
  run('INSERT OR REPLACE INTO period_lock (locked_upto, reason) VALUES (?,?)', upto, reason ?? null);
  return lockedUpto();
}

/**
 * Post one balanced entry.
 *
 * `lines` are `{ account, debit|credit, vehicle_id?, customer_id?, tax_code?,
 * tax_amount?, memo? }` with amounts in fils.
 */
export function post({ date = today(), memo = null, source = 'manual', source_id = null, lines }) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new LedgerError('an entry needs at least two lines');
  }

  const lock = lockedUpto();
  if (lock && date <= lock) {
    throw new LedgerError(
      `period is closed to ${lock}; ${date} cannot be posted. Post a correcting entry in an open period instead.`);
  }

  let debits = 0;
  let credits = 0;
  for (const [i, l] of lines.entries()) {
    const code = String(l.account);
    if (!get('SELECT 1 FROM account WHERE code = ?', code)) {
      throw new LedgerError(`line ${i + 1}: account ${code} is not in the chart of accounts`);
    }
    const dr = Math.round(l.debit ?? 0);
    const cr = Math.round(l.credit ?? 0);
    if ((dr === 0) === (cr === 0)) {
      throw new LedgerError(`line ${i + 1} (account ${code}): a line is a debit or a credit, not both and not neither`);
    }
    if (dr < 0 || cr < 0) {
      throw new LedgerError(`line ${i + 1} (account ${code}): negative amount — use the other side instead`);
    }
    if (l.tax_code && !get('SELECT 1 FROM tax_code WHERE code = ?', l.tax_code)) {
      throw new LedgerError(`line ${i + 1}: unknown tax code ${l.tax_code}`);
    }
    debits += dr;
    credits += cr;
  }
  if (debits !== credits) {
    throw new LedgerError(
      `entry does not balance: debits ${debits} fils, credits ${credits} fils, out by ${debits - credits}`);
  }

  return tx(() => {
    const info = run(
      'INSERT INTO journal (entry_date, memo, source, source_id) VALUES (?,?,?,?)',
      date, memo, source, source_id);
    const id = Number(info.lastInsertRowid);
    for (const l of lines) {
      run(`INSERT INTO journal_line
             (journal_id, account_code, vehicle_id, customer_id, debit, credit, tax_code, tax_amount, memo)
           VALUES (?,?,?,?,?,?,?,?,?)`,
        id, String(l.account), l.vehicle_id ?? null, l.customer_id ?? null,
        Math.round(l.debit ?? 0), Math.round(l.credit ?? 0),
        l.tax_code ?? null, Math.round(l.tax_amount ?? 0), l.memo ?? null);
    }
    return id;
  });
}

/**
 * Reverse an entry with its mirror image, dated today or later.
 *
 * The original stays exactly as it was posted. A ledger that lets you delete
 * yesterday's mistake cannot be audited, and an auditor who finds one stops
 * trusting the rest of it.
 */
export function reverse(journalId, { date = today(), reason = null } = {}) {
  const original = get('SELECT * FROM journal WHERE id = ?', journalId);
  if (!original) throw new LedgerError(`journal entry ${journalId} does not exist`);
  if (original.voided) throw new LedgerError(`journal entry ${journalId} is already reversed`);

  const lines = all('SELECT * FROM journal_line WHERE journal_id = ? ORDER BY id', journalId);
  const mirrored = lines.map((l) => ({
    account: l.account_code,
    debit: l.credit,
    credit: l.debit,
    vehicle_id: l.vehicle_id,
    customer_id: l.customer_id,
    tax_code: l.tax_code,
    tax_amount: -l.tax_amount,
    memo: l.memo,
  }));

  return tx(() => {
    // Voided first: it frees the one-live-entry-per-event index, so the
    // corrected version of the same charge can be posted straight after.
    run('UPDATE journal SET voided = 1 WHERE id = ?', journalId);
    const id = post({
      date,
      memo: reason ?? `Reversal of entry ${journalId}${original.memo ? ` — ${original.memo}` : ''}`,
      source: 'reversal',
      lines: mirrored,
    });
    run('UPDATE journal SET reverses_id = ? WHERE id = ?', journalId, id);
    return id;
  });
}

/** The entry raised by an operational event, if it has been posted. */
export const entryFor = (source, sourceId) =>
  get('SELECT * FROM journal WHERE source = ? AND source_id = ? AND voided = 0', source, sourceId);

// ---------------------------------------------------------------- reporting

/**
 * Reporting deliberately does NOT filter on `voided`.
 *
 * A reversal is an entry in its own right: the original and its mirror both
 * stay in the ledger and net to nothing. Hiding the original while keeping the
 * mirror would leave the mirror standing alone — a charge reversed to nil would
 * report as negative revenue. `voided` exists only to free the one-live-entry
 * index so the corrected version of the same event can be posted.
 */
const WHERE_PERIOD = `j.entry_date >= ? AND j.entry_date <= ?`;

/**
 * Trial balance to a date. If this does not balance, nothing downstream of it
 * is worth reading, which is why the totals are returned alongside the rows.
 */
export function trialBalance(asOf = today(), { from = '0000-01-01' } = {}) {
  const rows = all(`
    SELECT a.code, a.name, a.type, a.normal, a.statement, a.acct_group,
           SUM(l.debit) AS debit, SUM(l.credit) AS credit
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
     WHERE ${WHERE_PERIOD}
     GROUP BY a.code
     HAVING SUM(l.debit) <> 0 OR SUM(l.credit) <> 0
     ORDER BY a.code`, from, asOf);

  const accounts = rows.map((r) => ({
    ...r,
    balance: r.normal === 'debit' ? r.debit - r.credit : r.credit - r.debit,
  }));
  const debit = accounts.reduce((s, r) => s + r.debit, 0);
  const credit = accounts.reduce((s, r) => s + r.credit, 0);
  return { as_of: asOf, accounts, total_debit: debit, total_credit: credit, balanced: debit === credit };
}

/** Every movement on one account, with a running balance. */
export function accountLedger(code, from, to) {
  const acct = get('SELECT * FROM account WHERE code = ?', String(code));
  if (!acct) throw new LedgerError(`account ${code} is not in the chart of accounts`);

  const openingRow = get(`
    SELECT COALESCE(SUM(l.debit), 0) AS debit, COALESCE(SUM(l.credit), 0) AS credit
      FROM journal_line l JOIN journal j ON j.id = l.journal_id
     WHERE l.account_code = ? AND j.entry_date < ?`, String(code), from);
  let running = acct.normal === 'debit'
    ? openingRow.debit - openingRow.credit
    : openingRow.credit - openingRow.debit;
  const opening = running;

  const lines = all(`
    SELECT j.id AS journal_id, j.entry_date, j.source, j.source_id, j.memo AS entry_memo,
           l.debit, l.credit, l.memo, l.vehicle_id, v.code AS vehicle_code
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      LEFT JOIN vehicle v ON v.id = l.vehicle_id
     WHERE l.account_code = ? AND ${WHERE_PERIOD}
     ORDER BY j.entry_date, j.id, l.id`, String(code), from, to);

  const movements = lines.map((l) => {
    running += acct.normal === 'debit' ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, balance: running };
  });
  return { account: acct, from, to, opening, movements, closing: running };
}

/**
 * Profit and loss from the ledger, optionally for one vehicle's division.
 *
 * This is the statutory P&L. `reports.mjs` keeps a separate management P&L that
 * also carries depreciation the ledger has not yet been asked to post and the
 * utilisation figures; the two answer different questions and are not merged.
 */
export function profitAndLoss(from, to, { vehicleId = null } = {}) {
  const rows = all(`
    SELECT a.code, a.name, a.acct_group, a.type,
           SUM(l.debit) AS debit, SUM(l.credit) AS credit
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
     WHERE ${WHERE_PERIOD} AND a.statement = 'PL'
       AND (? IS NULL OR l.vehicle_id = ?)
     GROUP BY a.code ORDER BY a.code`, from, to, vehicleId, vehicleId);

  const lines = rows.map((r) => ({
    ...r,
    amount: r.type === 'income' ? r.credit - r.debit : r.debit - r.credit,
  }));
  const income = lines.filter((l) => l.type === 'income');
  const expense = lines.filter((l) => l.type === 'expense');
  const sum = (xs) => xs.reduce((s, l) => s + l.amount, 0);

  const byGroup = (xs) => {
    const groups = new Map();
    for (const l of xs) {
      if (!groups.has(l.acct_group)) groups.set(l.acct_group, { group: l.acct_group, total: 0, lines: [] });
      const g = groups.get(l.acct_group);
      g.lines.push(l);
      g.total += l.amount;
    }
    return [...groups.values()];
  };

  const totalIncome = sum(income);
  const totalExpense = sum(expense);
  return {
    from, to, vehicle_id: vehicleId,
    income: byGroup(income), expense: byGroup(expense),
    total_income: totalIncome, total_expense: totalExpense,
    net_profit: totalIncome - totalExpense,
  };
}

/**
 * Balance sheet at a date.
 *
 * Profit for the year is not stored anywhere: it is the P&L accounts' balance,
 * computed here and shown as retained earnings for the period. A stored figure
 * is a figure that can disagree with the entries behind it.
 */
export function balanceSheet(asOf = today(), { yearStart = `${asOf.slice(0, 4)}-01-01` } = {}) {
  const rows = all(`
    SELECT a.code, a.name, a.acct_group, a.type, a.normal, a.statement, a.contra,
           SUM(l.debit) AS debit, SUM(l.credit) AS credit
      FROM journal_line l
      JOIN journal j ON j.id = l.journal_id
      JOIN account a ON a.code = l.account_code
     WHERE j.entry_date <= ?
     GROUP BY a.code ORDER BY a.code`, asOf);

  const withBalance = rows.map((r) => ({
    ...r, balance: r.normal === 'debit' ? r.debit - r.credit : r.credit - r.debit,
  }));
  const bs = withBalance.filter((r) => r.statement === 'BS' && r.balance !== 0);
  const pick = (type) => bs.filter((r) => r.type === type);

  /**
   * A contra account's balance is stated on its own normal side, so it is
   * always positive — accumulated depreciation of 40,000 reads as 40,000, not
   * −40,000. Against its parent it has to subtract. Adding it instead puts the
   * balance sheet out by twice the accumulated depreciation, which is exactly
   * how this was wrong before the first smoke test caught it.
   */
  const sum = (xs) => xs.reduce((s, r) => s + (r.contra ? -r.balance : r.balance), 0);

  const assets = pick('asset');
  const liabilities = pick('liability');
  const equity = pick('equity');

  const periodProfit = profitAndLoss(yearStart, asOf).net_profit;
  const totalAssets = sum(assets);
  const totalEquity = sum(equity) + periodProfit;
  const totalLiabilities = sum(liabilities);

  return {
    as_of: asOf,
    assets, liabilities, equity,
    profit_for_period: periodProfit,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    // Assets − (liabilities + equity). Anything but zero is a bug, not a
    // rounding difference: every entry that got here balanced on posting.
    out_of_balance: totalAssets - (totalLiabilities + totalEquity),
  };
}
