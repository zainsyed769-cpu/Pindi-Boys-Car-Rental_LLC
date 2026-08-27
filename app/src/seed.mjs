/**
 * Seeds the database from the documents already in this repo:
 *   accounting/data/vehicle-master.csv       — the 51-vehicle fleet register
 *   accounting/data/fleet-report-extract.csv — open fines per vehicle, as at the report date
 *
 * Safe to re-run: vehicles are matched on their code and updated rather than duplicated.
 * Usage: node src/seed.mjs [--reset]
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, run, get, tx, DB_PATH } from './db.mjs';
import { toFils } from './money.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ROOT, '..');
const FLEET_REPORT_DATE = '2025-10-12';

function readCsv(path) {
  const [header, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = header.split(',');
  return lines.map((line) => {
    // The extracts contain no quoted commas, so a plain split is sufficient and honest.
    const cells = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]));
  });
}

/** '22/01/25' (RTA format) -> '2025-01-22'. */
function fromRtaDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(s ?? '');
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : null;
}

const OWNERSHIP = (bank) => (bank ? 'company_financed' : 'company');

function seed({ reset = false } = {}) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = open();
  if (reset) {
    for (const t of ['loan_instalment', 'loan', 'fine', 'salik_trip', 'expense',
      'payment', 'charge', 'rental', 'customer', 'vehicle', 'investor']) {
      db.exec(`DELETE FROM ${t}`);
    }
  }

  const master = readCsv(join(REPO, 'accounting/data/vehicle-master.csv'));
  const report = readCsv(join(REPO, 'accounting/data/fleet-report-extract.csv'));
  const finesByChassis = new Map(report.map((r) => [r.chassis, r]));

  let vehicles = 0, fines = 0;
  tx(() => {
    for (const v of master) {
      const existing = get('SELECT id FROM vehicle WHERE code = ?', v.vehicle_code);
      const fields = {
        plate: v.plate,
        model: v.model,
        chassis: v.chassis,
        model_year: Number(v.model_year) || null,
        ownership: OWNERSHIP(v.finance_bank),
        finance_bank: v.finance_bank || null,
        insurer: v.insurer || null,
        insurance_expiry: fromRtaDate(v.insurance_expiry),
        purchase_price: v.purchase_price_aed ? toFils(v.purchase_price_aed) : null,
        purchase_date: v.purchase_date || null,
        daily_rate: v.daily_rate_aed ? toFils(v.daily_rate_aed) : null,
        status: 'active',
      };
      if (existing) {
        const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
        run(`UPDATE vehicle SET ${set} WHERE id = ?`, ...Object.values(fields), existing.id);
      } else {
        const cols = ['code', ...Object.keys(fields)];
        run(
          `INSERT INTO vehicle (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
          v.vehicle_code, ...Object.values(fields),
        );
        vehicles++;
      }

      // Open fines from the fleet report arrive as a per-vehicle total, not individual
      // tickets, so they are seeded as one opening balance per vehicle and left
      // unallocated — which is precisely the question the business cannot answer today:
      // how much of this is recoverable from customers?
      const row = finesByChassis.get(v.chassis);
      const amount = toFils(row?.fines_amount ?? 0);
      if (amount > 0) {
        const vid = get('SELECT id FROM vehicle WHERE code = ?', v.vehicle_code).id;
        const marker = `OPENING-${v.vehicle_code}`;
        if (!get('SELECT id FROM fine WHERE fine_number = ?', marker)) {
          run(
            `INSERT INTO fine (vehicle_id, fine_number, fine_at, reason, amount, status, notes)
             VALUES (?,?,?,?,?, 'unallocated', ?)`,
            vid, marker, FLEET_REPORT_DATE,
            `Opening balance: ${row.fines_count} fines per RTA fleet report`,
            amount,
            'Seeded from the fleet report total — split into individual fines when the RTA detail is available',
          );
          fines++;
        }
      }
    }
  });

  const totals = get(`SELECT
      (SELECT COUNT(*) FROM vehicle) AS vehicles,
      (SELECT COUNT(*) FROM fine) AS fines,
      (SELECT COALESCE(SUM(amount),0) FROM fine) AS fine_total`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Vehicles inserted: ${vehicles} (total now ${totals.vehicles})`);
  console.log(`Opening fine records: ${fines} (total now ${totals.fines}, AED ${(totals.fine_total / 100).toLocaleString('en-AE')})`);
}

seed({ reset: process.argv.includes('--reset') });
