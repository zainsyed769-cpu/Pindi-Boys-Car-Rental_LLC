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
