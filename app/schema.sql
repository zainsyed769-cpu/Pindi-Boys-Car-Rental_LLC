-- Pindi Boys Fleet & Rental System — schema
-- SQLite. Money is stored in fils (1 AED = 100 fils) as INTEGER to avoid float error.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS investor (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  profit_share_pct  REAL NOT NULL DEFAULT 0,   -- investor's share of the car's profit
  commission_pct    REAL NOT NULL DEFAULT 0,   -- company's cut, if charged separately
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle (
  id            INTEGER PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,          -- V-001 .. V-051
  plate         TEXT NOT NULL,
  model         TEXT NOT NULL,
  chassis       TEXT,
  model_year    INTEGER,
  ownership     TEXT NOT NULL DEFAULT 'company'   -- company | company_financed | investor
                CHECK (ownership IN ('company','company_financed','investor')),
  investor_id   INTEGER REFERENCES investor(id),
  purchase_date TEXT,
  purchase_price INTEGER,                      -- fils
  residual_pct  REAL NOT NULL DEFAULT 20,      -- depreciation policy, per vehicle
  useful_life_years REAL NOT NULL DEFAULT 5,
  finance_bank  TEXT,
  insurer       TEXT,
  insurance_expiry TEXT,
  registration_expiry TEXT,
  daily_rate    INTEGER,
  weekly_rate   INTEGER,
  monthly_rate  INTEGER,
  salik_tag     TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','sold','written_off','workshop')),
  disposed_on   TEXT,
  disposal_price INTEGER,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicle_status ON vehicle(status);

CREATE TABLE IF NOT EXISTS customer (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','company')),
  phone         TEXT,
  email         TEXT,
  id_type       TEXT,                          -- emirates_id | passport | trade_licence
  id_number     TEXT,
  licence_number TEXT,
  nationality   TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_name ON customer(name);

-- A rental is the contract. Its dates drive both revenue and utilisation.
CREATE TABLE IF NOT EXISTS rental (
  id            INTEGER PRIMARY KEY,
  vehicle_id    INTEGER NOT NULL REFERENCES vehicle(id),
  customer_id   INTEGER NOT NULL REFERENCES customer(id),
  contract_no   TEXT,
  rate_type     TEXT NOT NULL DEFAULT 'daily'
                CHECK (rate_type IN ('daily','weekly','monthly','long_term')),
  rate_amount   INTEGER NOT NULL,              -- fils per period unit
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,                 -- contracted end
  returned_on   TEXT,                          -- actual return; NULL while on rent
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  deposit_status TEXT NOT NULL DEFAULT 'none'
                CHECK (deposit_status IN ('none','held','refunded','partly_applied','applied')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rental_vehicle ON rental(vehicle_id, start_date);
CREATE INDEX IF NOT EXISTS idx_rental_customer ON rental(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_status ON rental(status);

-- Everything billed to the customer. Rent, Salik recharge, fine recharge, damage, delivery.
CREATE TABLE IF NOT EXISTS charge (
  id            INTEGER PRIMARY KEY,
  rental_id     INTEGER NOT NULL REFERENCES rental(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN
                ('rent','delivery','late','mileage','salik','fine','fine_admin','damage','other')),
  description   TEXT,
  amount        INTEGER NOT NULL,              -- excluding VAT, fils
  vat_amount    INTEGER NOT NULL DEFAULT 0,
  charge_date   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_charge_rental ON charge(rental_id);

CREATE TABLE IF NOT EXISTS payment (
  id            INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customer(id),
  rental_id     INTEGER REFERENCES rental(id),
  amount        INTEGER NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'rental'
                CHECK (kind IN ('rental','deposit','deposit_refund')),
  method        TEXT,                          -- cash | card | bank | cheque
  paid_on       TEXT NOT NULL,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_customer ON payment(customer_id);

-- What the company spends on a car. rental_id set only when it is being recovered.
CREATE TABLE IF NOT EXISTS expense (
  id            INTEGER PRIMARY KEY,
  vehicle_id    INTEGER REFERENCES vehicle(id),
  category      TEXT NOT NULL,                 -- insurance | maintenance | tyres | salik | fine | ...
  description   TEXT,
  amount        INTEGER NOT NULL,
  vat_amount    INTEGER NOT NULL DEFAULT 0,
  expense_date  TEXT NOT NULL,
  supplier      TEXT,
  recoverable   INTEGER NOT NULL DEFAULT 0,    -- 1 = should be recharged to a customer
  rental_id     INTEGER REFERENCES rental(id), -- which rental it is recovered against
  -- Spread a lump sum (insurance, registration) over N months instead of one hit
  amortise_months INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expense_vehicle ON expense(vehicle_id, expense_date);

CREATE TABLE IF NOT EXISTS salik_trip (
  id            INTEGER PRIMARY KEY,
  vehicle_id    INTEGER NOT NULL REFERENCES vehicle(id),
  rental_id     INTEGER REFERENCES rental(id),  -- resolved from trip time vs rental dates
  transaction_id TEXT UNIQUE,
  trip_at       TEXT NOT NULL,
  toll_gate     TEXT,
  tag_number    TEXT,
  amount        INTEGER NOT NULL,
  vat_amount    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'unallocated'
                CHECK (status IN ('unallocated','recharged','company_borne')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_salik_vehicle ON salik_trip(vehicle_id, trip_at);

CREATE TABLE IF NOT EXISTS fine (
  id            INTEGER PRIMARY KEY,
  vehicle_id    INTEGER NOT NULL REFERENCES vehicle(id),
  rental_id     INTEGER REFERENCES rental(id),
  fine_number   TEXT,
  fine_at       TEXT,
  location      TEXT,
  reason        TEXT,
  amount        INTEGER NOT NULL,
  black_points  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'unallocated'
                CHECK (status IN ('unallocated','recharged','company_borne','disputed','paid')),
  paid_on       TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fine_vehicle ON fine(vehicle_id, fine_at);
CREATE INDEX IF NOT EXISTS idx_fine_status ON fine(status);

CREATE TABLE IF NOT EXISTS loan (
  id            INTEGER PRIMARY KEY,
  vehicle_id    INTEGER REFERENCES vehicle(id),
  bank          TEXT NOT NULL,
  reference     TEXT,
  principal     INTEGER NOT NULL,
  monthly_emi   INTEGER NOT NULL,
  start_date    TEXT,
  months        INTEGER,
  profit_rate   REAL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','settled','early_settled')),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_loan_vehicle ON loan(vehicle_id);

-- One row per instalment: this is the principal/interest split Manager cannot hold.
CREATE TABLE IF NOT EXISTS loan_instalment (
  id            INTEGER PRIMARY KEY,
  loan_id       INTEGER NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL,
  due_date      TEXT NOT NULL,
  total         INTEGER NOT NULL,
  principal     INTEGER NOT NULL,
  interest      INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  paid_on       TEXT,
  UNIQUE (loan_id, seq)
);

-- ===========================================================================
-- GENERAL LEDGER
--
-- Added when the decision was taken that this system replaces Manager rather
-- than feeding it (decisions.md D9). From that moment these tables are the
-- book of record: the statutory accounts and the FTA return are produced from
-- here, so the rules below are enforced by the database, not by convention.
-- ===========================================================================

-- The chart of accounts. Seeded from accounting/import/chart-of-accounts.tsv
-- so the design document and the running system cannot drift apart.
CREATE TABLE IF NOT EXISTS account (
  code          TEXT PRIMARY KEY,              -- '1000' .. '9200'
  name          TEXT NOT NULL,
  acct_group    TEXT NOT NULL,                 -- 'Cash & Cash Equivalents', ...
  statement     TEXT NOT NULL CHECK (statement IN ('BS','PL')),
  type          TEXT NOT NULL
                CHECK (type IN ('asset','liability','equity','income','expense')),
  -- Which side increases the account. Contra accounts (accumulated
  -- depreciation, owner's drawings) sit under their parent type but carry the
  -- opposite normal balance, so this cannot be derived from type alone.
  normal        TEXT NOT NULL CHECK (normal IN ('debit','credit')),
  contra        INTEGER NOT NULL DEFAULT 0,
  notes         TEXT
);

-- VAT treatment of a line. The FTA return is built from these, not from the
-- balance of 2200, because box 1 (output) and box 9 (input) have to be
-- reported separately while the GL keeps one net VAT control account.
CREATE TABLE IF NOT EXISTS tax_code (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  rate          REAL NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('output','input','none'))
);

CREATE TABLE IF NOT EXISTS journal (
  id            INTEGER PRIMARY KEY,
  entry_date    TEXT NOT NULL,
  memo          TEXT,
  -- Which operational event raised this entry. 'manual' and 'opening' have no
  -- source row; everything else points back at the thing that caused it, so a
  -- ledger line can always be traced to the rental or invoice behind it.
  source        TEXT NOT NULL CHECK (source IN
                ('charge','payment','expense','depreciation','loan','disposal',
                 'investor','opening','manual','reversal')),
  source_id     INTEGER,
  reverses_id   INTEGER REFERENCES journal(id),
  voided        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(entry_date);
-- At most one live entry per operational event: posting the same charge twice
-- is a database error rather than a silently doubled balance.
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_source
  ON journal(source, source_id) WHERE source_id IS NOT NULL AND voided = 0;

CREATE TABLE IF NOT EXISTS journal_line (
  id            INTEGER PRIMARY KEY,
  journal_id    INTEGER NOT NULL REFERENCES journal(id) ON DELETE CASCADE,
  account_code  TEXT NOT NULL REFERENCES account(code),
  vehicle_id    INTEGER REFERENCES vehicle(id),   -- the division: per-car P&L
  customer_id   INTEGER REFERENCES customer(id),
  debit         INTEGER NOT NULL DEFAULT 0,       -- fils
  credit        INTEGER NOT NULL DEFAULT 0,       -- fils
  tax_code      TEXT REFERENCES tax_code(code),
  tax_amount    INTEGER NOT NULL DEFAULT 0,       -- VAT on this line, fils
  memo          TEXT,
  CHECK (debit >= 0 AND credit >= 0),
  -- A line is a debit or a credit, never both and never neither.
  CHECK ((debit = 0) <> (credit = 0))
);
CREATE INDEX IF NOT EXISTS idx_line_journal ON journal_line(journal_id);
CREATE INDEX IF NOT EXISTS idx_line_account ON journal_line(account_code);
CREATE INDEX IF NOT EXISTS idx_line_vehicle ON journal_line(vehicle_id);

-- Once a VAT quarter is filed its figures must not move underneath the filing.
CREATE TABLE IF NOT EXISTS period_lock (
  locked_upto   TEXT PRIMARY KEY,               -- nothing may post on or before
  locked_at     TEXT NOT NULL DEFAULT (datetime('now')),
  reason        TEXT
);
