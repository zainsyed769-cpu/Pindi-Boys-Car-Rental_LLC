/**
 * The chart of accounts, loaded from the same TSV the accounting design ships:
 * ../accounting/import/chart-of-accounts.tsv.
 *
 * It is read rather than re-typed on purpose. The design document and the
 * running system have to agree about what account 4070 is, and the only way to
 * guarantee that is to have one file and no copy of it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, run, tx } from './db.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CHART_PATH =
  process.env.PB_CHART ?? join(APP, '..', 'accounting', 'import', 'chart-of-accounts.tsv');

/**
 * The leading digit of the code gives the type. That is the convention the
 * chart was built on, and keeping the rule here means a new account added to
 * the TSV needs no code change — it classifies itself.
 */
const TYPE_BY_LEADING_DIGIT = {
  1: 'asset', 2: 'liability', 3: 'equity', 4: 'income',
  5: 'expense', 6: 'expense', 7: 'expense', 8: 'expense',
};

/**
 * The exceptions, each one named rather than pattern-matched.
 *
 * 9000–9200 are a mixed group: gains and claim income are income, the disposal
 * loss is an expense, and no digit rule can tell them apart.
 *
 * The rest are contra accounts. They belong to their parent type — accumulated
 * depreciation is an asset account, it nets against the vehicle at cost — but
 * they increase on the opposite side. Treating one as an ordinary asset makes
 * the balance sheet wrong by twice the accumulated depreciation.
 */
const EXCEPTIONS = {
  1510: { type: 'asset', normal: 'credit', contra: 1 },   // Accum. depreciation — vehicles
  1560: { type: 'asset', normal: 'credit', contra: 1 },   // Accum. depreciation — office
  3200: { type: 'equity', normal: 'debit', contra: 1 },   // Owner's Drawings
  9000: { type: 'income', normal: 'credit', contra: 0 },  // Gain on disposal
  9010: { type: 'expense', normal: 'debit', contra: 0 },  // Loss on disposal
  9100: { type: 'income', normal: 'credit', contra: 0 },  // Insurance claim income
  9200: { type: 'income', normal: 'credit', contra: 0 },  // Other income
};

const NORMAL_BY_TYPE = {
  asset: 'debit', expense: 'debit',
  liability: 'credit', equity: 'credit', income: 'credit',
};

export function classify(code) {
  const hit = EXCEPTIONS[code];
  if (hit) return hit;
  const type = TYPE_BY_LEADING_DIGIT[Number(String(code)[0])];
  if (!type) throw new Error(`account ${code}: no type for leading digit`);
  return { type, normal: NORMAL_BY_TYPE[type], contra: 0 };
}

export function parseChart(tsv) {
  const [header, ...rows] = tsv.trim().split('\n');
  const cols = header.split('\t');
  if (cols[0] !== 'Code' || cols[1] !== 'Name') {
    throw new Error(`chart of accounts: unexpected header ${JSON.stringify(header)}`);
  }
  return rows.filter((r) => r.trim()).map((row) => {
    const [code, name, acct_group, statement, notes = ''] = row.split('\t');
    const { type, normal, contra } = classify(code);
    // A cross-check the TSV can fail: an income or expense account filed on the
    // balance sheet is a typo in the design, and silently importing it would
    // put revenue where the auditor looks for a liability.
    const expected = type === 'asset' || type === 'liability' || type === 'equity' ? 'BS' : 'PL';
    if (statement !== expected) {
      throw new Error(`account ${code} "${name}": ${type} marked ${statement}, expected ${expected}`);
    }
    return { code, name, acct_group, statement, type, normal, contra, notes };
  });
}

/** VAT treatments. Rates are the FTA's; a change here is a change in the law. */
export const TAX_CODES = [
  { code: 'S5', name: 'Standard rated 5%', rate: 0.05, direction: 'output' },
  { code: 'S5I', name: 'Standard rated 5% (input)', rate: 0.05, direction: 'input' },
  { code: 'Z0', name: 'Zero rated', rate: 0, direction: 'output' },
  { code: 'EX', name: 'Exempt', rate: 0, direction: 'output' },
  { code: 'OS', name: 'Out of scope', rate: 0, direction: 'none' },
  { code: 'RC', name: 'Reverse charge (imports)', rate: 0.05, direction: 'input' },
];

/**
 * Load the chart into the database. Existing accounts are updated in place and
 * none are ever removed: an account that has been posted to is part of the
 * company's history whether or not the design still lists it.
 */
export function syncChart({ path = CHART_PATH, quiet = false } = {}) {
  const accounts = parseChart(readFileSync(path, 'utf8'));
  return tx(() => {
    for (const t of TAX_CODES) {
      run(`INSERT INTO tax_code (code, name, rate, direction) VALUES (?,?,?,?)
             ON CONFLICT(code) DO UPDATE SET name = excluded.name,
               rate = excluded.rate, direction = excluded.direction`,
        t.code, t.name, t.rate, t.direction);
    }
    for (const a of accounts) {
      run(`INSERT INTO account (code, name, acct_group, statement, type, normal, contra, notes)
             VALUES (?,?,?,?,?,?,?,?)
             ON CONFLICT(code) DO UPDATE SET name = excluded.name,
               acct_group = excluded.acct_group, statement = excluded.statement,
               type = excluded.type, normal = excluded.normal,
               contra = excluded.contra, notes = excluded.notes`,
        a.code, a.name, a.acct_group, a.statement, a.type, a.normal, a.contra, a.notes);
    }
    const stale = all(`SELECT code, name FROM account WHERE code NOT IN (${
      accounts.map(() => '?').join(',')})`, ...accounts.map((a) => a.code));
    if (stale.length && !quiet) {
      console.warn(`  ${stale.length} account(s) in the database are no longer in the TSV ` +
        `and were left alone: ${stale.map((s) => s.code).join(', ')}`);
    }
    if (!quiet) console.log(`  chart of accounts: ${accounts.length} accounts, ${TAX_CODES.length} tax codes`);
    return accounts.length;
  });
}

export const account = (code) => get('SELECT * FROM account WHERE code = ?', String(code));
