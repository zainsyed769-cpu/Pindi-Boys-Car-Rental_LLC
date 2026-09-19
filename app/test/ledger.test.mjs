/**
 * Ledger tests. `node --test`.
 *
 * These exist because this is the book of record. Two of them are here because
 * the first run of the code failed them:
 *
 *   - "a reversal nets to nothing" — reporting hid the voided original while
 *     keeping its mirror, so a reversed invoice read as negative revenue;
 *   - "the balance sheet balances with accumulated depreciation" — the contra
 *     asset was added to total assets instead of subtracted, putting the sheet
 *     out by twice the depreciation.
 *
 * Neither is the kind of bug that announces itself. Both would have been found
 * by an auditor rather than by us.
 */
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PB_DB = join(mkdtempSync(join(tmpdir(), 'pb-ledger-')), 'test.db');

const { syncChart, classify, parseChart } = await import('../src/chart.mjs');
const { post, reverse, trialBalance, balanceSheet, profitAndLoss, accountLedger,
        lockPeriod, LedgerError } = await import('../src/ledger.mjs');
const { postCharge, postPayment, postExpense, postInstalment, postDepreciation,
        postAmortisation, financeAccountFor } = await import('../src/posting.mjs');
const { vatReturn, vatReconciles } = await import('../src/vat.mjs');
const { run, get, open } = await import('../src/db.mjs');

before(() => syncChart({ quiet: true }));

beforeEach(() => {
  const d = open();
  for (const t of ['journal_line', 'journal', 'period_lock', 'loan_instalment', 'loan',
                   'charge', 'payment', 'expense', 'rental', 'customer', 'vehicle']) {
    d.exec(`DELETE FROM ${t}`);
  }
});

const vehicle = () => Number(run(
  `INSERT INTO vehicle (code,plate,model,ownership,purchase_price,purchase_date)
   VALUES ('V-001','A 1','JAC S3','company_financed',6000000,'2026-01-01')`).lastInsertRowid);
const customer = () => Number(run("INSERT INTO customer (name) VALUES ('Test')").lastInsertRowid);
const rental = (v, c) => Number(run(
  `INSERT INTO rental (vehicle_id,customer_id,rate_type,rate_amount,start_date,end_date)
   VALUES (?,?,'daily',10000,'2026-09-01','2026-09-10')`, v, c).lastInsertRowid);
const balanceOf = (code) => {
  const r = get(`SELECT COALESCE(SUM(debit),0) d, COALESCE(SUM(credit),0) c
                   FROM journal_line WHERE account_code = ?`, code);
  return r.d - r.c;
};

// ------------------------------------------------------------ chart of accounts

test('the chart classifies by code, with the contra accounts named', () => {
  assert.deepEqual(classify('1000'), { type: 'asset', normal: 'debit', contra: 0 });
  assert.deepEqual(classify('4000'), { type: 'income', normal: 'credit', contra: 0 });
  // Accumulated depreciation is an asset account that increases on the credit side.
  assert.deepEqual(classify('1510'), { type: 'asset', normal: 'credit', contra: 1 });
  assert.deepEqual(classify('3200'), { type: 'equity', normal: 'debit', contra: 1 });
  // 9000-9200 is a mixed group; the loss is the only expense in it.
  assert.equal(classify('9000').type, 'income');
  assert.equal(classify('9010').type, 'expense');
});

test('the chart rejects an account filed on the wrong statement', () => {
  assert.throws(
    () => parseChart('Code\tName\tGroup\tStatement\tNotes\n4000\tRental Income\tRevenue\tBS\t'),
    /income marked BS, expected PL/);
});

test('every account in the design file loads', () => {
  assert.equal(get('SELECT COUNT(*) c FROM account').c, 87);
  assert.equal(get("SELECT name FROM account WHERE code='1020'").name,
    'Emirates NBD - Current A/C 6605790976501');
});

// ------------------------------------------------------------------- posting

test('an entry that does not balance is refused', () => {
  assert.throws(() => post({ lines: [
    { account: '1000', debit: 100 }, { account: '4000', credit: 90 }] }),
    (e) => e instanceof LedgerError && /out by 10/.test(e.message));
});

test('a line cannot be both a debit and a credit, or neither', () => {
  assert.throws(() => post({ lines: [
    { account: '1000', debit: 100, credit: 100 }, { account: '4000', credit: 100 }] }),
    /not both and not neither/);
  assert.throws(() => post({ lines: [
    { account: '1000', debit: 0 }, { account: '4000', credit: 0 }] }),
    /not both and not neither/);
});

test('an account outside the chart is refused', () => {
  assert.throws(() => post({ lines: [
    { account: '9999', debit: 1 }, { account: '4000', credit: 1 }] }),
    /not in the chart of accounts/);
});

test('a closed period refuses new entries', () => {
  lockPeriod('2026-09-30', 'Q3 filed');
  assert.throws(() => post({ date: '2026-09-15', lines: [
    { account: '1000', debit: 1 }, { account: '4000', credit: 1 }] }),
    /period is closed to 2026-09-30/);
  // The next open day still posts.
  assert.ok(post({ date: '2026-10-01', lines: [
    { account: '1000', debit: 1 }, { account: '4000', credit: 1 }] }));
});

test('an operational event cannot post twice', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const ch = Number(run(`INSERT INTO charge (rental_id,kind,description,amount,vat_amount,charge_date)
    VALUES (?,'rent','10 days',100000,5000,'2026-09-01')`, r).lastInsertRowid);
  const first = postCharge(ch);
  assert.equal(postCharge(ch), first, 'the second call returns the existing entry, it does not post again');
  assert.equal(get('SELECT COUNT(*) c FROM journal WHERE source=?', 'charge').c, 1);
});

// ------------------------------------------------------------------ reversal

test('a reversal nets to nothing, and both halves stay in the ledger', () => {
  const id = post({ date: '2026-09-19', memo: 'invoice', lines: [
    { account: '1100', debit: 10500 },
    { account: '4000', credit: 10000, tax_code: 'S5', tax_amount: 500 },
    { account: '2200', credit: 500 }] });
  assert.equal(profitAndLoss('2026-09-01', '2026-09-30').total_income, 10000);

  reverse(id, { date: '2026-09-19' });

  assert.equal(profitAndLoss('2026-09-01', '2026-09-30').total_income, 0,
    'a reversed invoice must read as nil revenue, not negative revenue');
  assert.equal(vatReturn('2026-09-01', '2026-09-30').net_vat_payable, 0);
  assert.equal(balanceOf('1100'), 0);
  // Both entries survive: the audit trail is the whole trail.
  assert.equal(get('SELECT COUNT(*) c FROM journal').c, 2);
  assert.equal(get('SELECT voided FROM journal WHERE id = ?', id).voided, 1);
});

test('an entry cannot be reversed twice', () => {
  const id = post({ lines: [{ account: '1000', debit: 1 }, { account: '4000', credit: 1 }] });
  reverse(id);
  assert.throws(() => reverse(id), /already reversed/);
});

// ------------------------------------------------------- the accounting policy

test('a charge raises the receivable gross and the revenue net', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const ch = Number(run(`INSERT INTO charge (rental_id,kind,description,amount,vat_amount,charge_date)
    VALUES (?,'rent','10 days',100000,5000,'2026-09-01')`, r).lastInsertRowid);
  postCharge(ch);
  assert.equal(balanceOf('1100'), 105000, 'receivable carries the VAT');
  assert.equal(-balanceOf('4000'), 100000, 'revenue does not');
  assert.equal(-balanceOf('2200'), 5000);
});

test('a recharged fine carries no VAT — only the admin fee is taxed', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const fine = Number(run(`INSERT INTO charge (rental_id,kind,description,amount,vat_amount,charge_date)
    VALUES (?,'fine','Fine 123',30000,0,'2026-09-05')`, r).lastInsertRowid);
  const admin = Number(run(`INSERT INTO charge (rental_id,kind,description,amount,vat_amount,charge_date)
    VALUES (?,'fine_admin','Admin fee',5000,250,'2026-09-05')`, r).lastInsertRowid);
  postCharge(fine);
  postCharge(admin);
  assert.equal(-balanceOf('2200'), 250, 'the government penalty never carried VAT, so neither does its recharge');
});

test('a deposit is a liability, never income and never the customer balance', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const dep = Number(run(`INSERT INTO payment (customer_id,rental_id,amount,kind,method,paid_on)
    VALUES (?,?,150000,'deposit','cash','2026-09-01')`, c, r).lastInsertRowid);
  postPayment(dep);
  assert.equal(-balanceOf('2100'), 150000);
  assert.equal(balanceOf('1100'), 0, 'a deposit does not reduce what the customer owes');
  assert.equal(profitAndLoss('2026-09-01', '2026-09-30').total_income, 0);
});

test('a recoverable cost parks on billable expenses, not on the car', () => {
  const v = vehicle();
  const own = Number(run(`INSERT INTO expense (vehicle_id,category,amount,vat_amount,expense_date)
    VALUES (?,'tyres',80000,4000,'2026-09-03')`, v).lastInsertRowid);
  const rechargeable = Number(run(`INSERT INTO expense (vehicle_id,category,amount,vat_amount,expense_date,recoverable)
    VALUES (?,'salik',5000,0,'2026-09-04',1)`, v).lastInsertRowid);
  postExpense(own);
  postExpense(rechargeable);
  assert.equal(balanceOf('5040'), 80000, "the company's own cost lands on the car");
  assert.equal(balanceOf('1110'), 5000, 'the recoverable one waits to be recharged');
  assert.equal(balanceOf('5070'), 0);
});

test('a loan instalment repays principal and expenses only the interest', () => {
  const v = vehicle();
  const loan = Number(run(`INSERT INTO loan (vehicle_id,bank,principal,monthly_emi)
    VALUES (?,'EMIRATES NBD BANK (P.J.S.C)',6000000,140300)`, v).lastInsertRowid);
  const inst = Number(run(`INSERT INTO loan_instalment (loan_id,seq,due_date,total,principal,interest,balance_after)
    VALUES (?,1,'2026-09-05',140300,120000,20300,5880000)`, loan).lastInsertRowid);
  postInstalment(inst);
  assert.equal(balanceOf('2400'), 120000, 'the liability comes down');
  assert.equal(balanceOf('8000'), 20300, 'only the interest is a cost');
  assert.equal(profitAndLoss('2026-09-01', '2026-09-30').total_expense, 20300,
    'booking the whole instalment to cost would understate profit by the principal');
});

test('each lender has its own liability account', () => {
  assert.equal(financeAccountFor('EMIRATES NBD BANK (P.J.S.C)'), '2400');
  assert.equal(financeAccountFor('Dubai Islamic Bank'), '2420');
  assert.throws(() => financeAccountFor('Some New Bank'), /add it to the chart first/);
});

test('a prepayment releases in equal months and closes at nil', () => {
  const v = vehicle();
  const e = Number(run(`INSERT INTO expense (vehicle_id,category,description,amount,vat_amount,expense_date,amortise_months)
    VALUES (?,'insurance','Annual premium',100000,0,'2026-01-01',12)`, v).lastInsertRowid);
  postExpense(e);
  assert.equal(balanceOf('1200'), 100000, 'it sits in the prepayment first');
  for (let m = 0; m < 12; m++) postAmortisation(e, m, `2026-${String(m + 1).padStart(2, '0')}-28`);
  assert.equal(balanceOf('1200'), 0, '100,000 over 12 months must close at nil, not at four fils');
  assert.equal(balanceOf('5000'), 100000);
});

// ---------------------------------------------------------------- statements

test('the balance sheet balances with accumulated depreciation on it', () => {
  const v = vehicle();
  post({ date: '2026-01-01', source: 'opening', lines: [
    { account: '1500', debit: 6000000, vehicle_id: v },
    { account: '2400', credit: 6000000 }] });
  postDepreciation(v, 40000, '2026-09-30');

  const bs = balanceSheet('2026-09-30');
  assert.equal(bs.out_of_balance, 0,
    'a contra asset subtracts from assets; adding it puts the sheet out by twice the depreciation');
  assert.equal(bs.total_assets, 6000000 - 40000);
});

test('the trial balance balances after a full month of trading', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const ch = Number(run(`INSERT INTO charge (rental_id,kind,amount,vat_amount,charge_date)
    VALUES (?,'rent',100000,5000,'2026-09-01')`, r).lastInsertRowid);
  postCharge(ch);
  const pay = Number(run(`INSERT INTO payment (customer_id,rental_id,amount,kind,method,paid_on)
    VALUES (?,?,105000,'rental','bank','2026-09-11')`, c, r).lastInsertRowid);
  postPayment(pay);
  const ex = Number(run(`INSERT INTO expense (vehicle_id,category,amount,vat_amount,expense_date)
    VALUES (?,'tyres',80000,4000,'2026-09-03')`, v).lastInsertRowid);
  postExpense(ex);
  postDepreciation(v, 40000, '2026-09-30');

  const tb = trialBalance('2026-09-30');
  assert.ok(tb.balanced, `trial balance out by ${tb.total_debit - tb.total_credit} fils`);
  assert.equal(balanceSheet('2026-09-30').out_of_balance, 0);
});

test('the account ledger runs a balance that ends where the account does', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  for (const [amt, day] of [[100000, '2026-09-01'], [50000, '2026-09-05']]) {
    const ch = Number(run(`INSERT INTO charge (rental_id,kind,amount,vat_amount,charge_date)
      VALUES (?,'rent',?,0,?)`, r, amt, day).lastInsertRowid);
    postCharge(ch);
  }
  const led = accountLedger('1100', '2026-09-01', '2026-09-30');
  assert.equal(led.opening, 0);
  assert.equal(led.movements.length, 2);
  assert.equal(led.closing, 150000);
  assert.equal(led.closing, balanceOf('1100'));
});

// ----------------------------------------------------------------------- VAT

test('the VAT return agrees with the control account to the fils', () => {
  const v = vehicle(), c = customer(), r = rental(v, c);
  const ch = Number(run(`INSERT INTO charge (rental_id,kind,amount,vat_amount,charge_date)
    VALUES (?,'rent',100000,5000,'2026-09-01')`, r).lastInsertRowid);
  postCharge(ch);
  const ex = Number(run(`INSERT INTO expense (vehicle_id,category,amount,vat_amount,expense_date)
    VALUES (?,'tyres',80000,4000,'2026-09-03')`, v).lastInsertRowid);
  postExpense(ex);

  const vr = vatReturn('2026-09-01', '2026-09-30');
  assert.equal(vr.boxes['1a'].amount, 100000);
  assert.equal(vr.total_output_tax, 5000);
  assert.equal(vr.total_input_tax, 4000);
  assert.equal(vr.net_vat_payable, 1000);
  assert.ok(vatReconciles(vr),
    'the return and account 2200 disagreeing means a VAT amount was posted without a tax code');
});

test('a period with no trading files a nil return rather than throwing', () => {
  const vr = vatReturn('2026-01-01', '2026-03-31');
  assert.equal(vr.net_vat_payable, 0);
  assert.ok(vatReconciles(vr));
});

process.on('exit', () => rmSync(join(process.env.PB_DB, '..'), { recursive: true, force: true }));
