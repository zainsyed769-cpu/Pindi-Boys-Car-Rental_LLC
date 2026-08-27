/**
 * Pindi Boys Fleet & Rental System — HTTP server.
 * No framework and no dependencies: this has to keep running for years without
 * an npm install ever breaking it.  Node's own http + node:sqlite only.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, run, tx } from './db.mjs';
import { toFils, vatOn } from './money.mjs';
import { today } from './dates.mjs';
import { vehiclePnl, fleetPnl, dashboard } from './reports.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.PORT ?? 3000);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml' };

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > 1e6) reject(new Error('payload too large'));
  });
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid JSON')); }
  });
  req.on('error', reject);
});

/** Default reporting period: the current month to date. */
function period(url) {
  const from = url.searchParams.get('from') ?? `${today().slice(0, 8)}01`;
  const to = url.searchParams.get('to') ?? today();
  return { from, to };
}

const routes = {
  'GET /api/dashboard': (_req, url) => {
    const { from, to } = period(url);
    return dashboard(from, to);
  },

  'GET /api/vehicles': () => all(`
    SELECT v.*, i.name AS investor_name,
           (SELECT r.id FROM rental r
             WHERE r.vehicle_id = v.id AND r.status = 'open' LIMIT 1) AS open_rental_id,
           (SELECT c.name FROM rental r JOIN customer c ON c.id = r.customer_id
             WHERE r.vehicle_id = v.id AND r.status = 'open' LIMIT 1) AS current_customer
      FROM vehicle v LEFT JOIN investor i ON i.id = v.investor_id
     ORDER BY v.code`),

  'POST /api/vehicles': async (req) => {
    const b = await readBody(req);
    const info = run(
      `INSERT INTO vehicle (code, plate, model, chassis, model_year, ownership,
        purchase_date, purchase_price, daily_rate, weekly_rate, monthly_rate, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      b.code, b.plate, b.model, b.chassis ?? null, b.model_year ?? null,
      b.ownership ?? 'company', b.purchase_date ?? null,
      b.purchase_price ? toFils(b.purchase_price) : null,
      b.daily_rate ? toFils(b.daily_rate) : null,
      b.weekly_rate ? toFils(b.weekly_rate) : null,
      b.monthly_rate ? toFils(b.monthly_rate) : null, b.notes ?? null);
    return get('SELECT * FROM vehicle WHERE id = ?', info.lastInsertRowid);
  },

  'PATCH /api/vehicles': async (req, url) => {
    const b = await readBody(req);
    const id = Number(url.searchParams.get('id'));
    const allowed = ['purchase_date', 'purchase_price', 'daily_rate', 'weekly_rate',
      'monthly_rate', 'residual_pct', 'useful_life_years', 'status', 'notes',
      'ownership', 'investor_id', 'salik_tag'];
    const money = new Set(['purchase_price', 'daily_rate', 'weekly_rate', 'monthly_rate']);
    const fields = allowed.filter((k) => k in b);
    if (!fields.length) throw Object.assign(new Error('nothing to update'), { status: 400 });
    run(`UPDATE vehicle SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
      ...fields.map((f) => (money.has(f) && b[f] != null ? toFils(b[f]) : b[f])), id);
    return get('SELECT * FROM vehicle WHERE id = ?', id);
  },

  'GET /api/customers': () => all(`
    SELECT c.*,
      (SELECT COALESCE(SUM(ch.amount + ch.vat_amount), 0)
         FROM charge ch JOIN rental r ON r.id = ch.rental_id
        WHERE r.customer_id = c.id) -
      (SELECT COALESCE(SUM(p.amount), 0) FROM payment p
        WHERE p.customer_id = c.id AND p.kind = 'rental') AS balance
    FROM customer c ORDER BY c.name`),

  'POST /api/customers': async (req) => {
    const b = await readBody(req);
    if (!b.name) throw Object.assign(new Error('name is required'), { status: 400 });
    const info = run(
      `INSERT INTO customer (name, kind, phone, email, id_type, id_number,
        licence_number, nationality, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      b.name, b.kind ?? 'individual', b.phone ?? null, b.email ?? null,
      b.id_type ?? null, b.id_number ?? null, b.licence_number ?? null,
      b.nationality ?? null, b.notes ?? null);
    return get('SELECT * FROM customer WHERE id = ?', info.lastInsertRowid);
  },

  'GET /api/rentals': (_req, url) => {
    const status = url.searchParams.get('status');
    return all(`
      SELECT r.*, v.code AS vehicle_code, v.plate, v.model, c.name AS customer_name,
             (SELECT COALESCE(SUM(amount + vat_amount),0) FROM charge WHERE rental_id = r.id) AS billed,
             (SELECT COALESCE(SUM(amount),0) FROM payment
               WHERE rental_id = r.id AND kind = 'rental') AS paid
        FROM rental r JOIN vehicle v ON v.id = r.vehicle_id
             JOIN customer c ON c.id = r.customer_id
       ${status ? 'WHERE r.status = ?' : ''}
       ORDER BY r.start_date DESC, r.id DESC`, ...(status ? [status] : []));
  },

  /**
   * Opening a rental also raises the rent charge, so revenue is never left to be
   * remembered later — the commonest way a rental business loses money on paper.
   */
  'POST /api/rentals': async (req) => {
    const b = await readBody(req);
    const vehicle = get('SELECT * FROM vehicle WHERE id = ?', b.vehicle_id);
    if (!vehicle) throw Object.assign(new Error('vehicle not found'), { status: 404 });

    const clash = get("SELECT id FROM rental WHERE vehicle_id = ? AND status = 'open'",
      b.vehicle_id);
    if (clash) {
      throw Object.assign(
        new Error(`${vehicle.plate} is already out on rental #${clash.id}`), { status: 409 });
    }

    return tx(() => {
      const info = run(
        `INSERT INTO rental (vehicle_id, customer_id, contract_no, rate_type, rate_amount,
          start_date, end_date, deposit_amount, deposit_status, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        b.vehicle_id, b.customer_id, b.contract_no ?? null, b.rate_type ?? 'daily',
        toFils(b.rate_amount), b.start_date, b.end_date,
        toFils(b.deposit_amount ?? 0), b.deposit_amount ? 'held' : 'none', b.notes ?? null);

      const rentalId = info.lastInsertRowid;
      const units = Number(b.units ?? 1);
      const net = toFils(b.rate_amount) * units;
      run(`INSERT INTO charge (rental_id, kind, description, amount, vat_amount, charge_date)
           VALUES (?, 'rent', ?, ?, ?, ?)`,
        rentalId, `${units} x ${b.rate_type ?? 'daily'} rental`, net, vatOn(net), b.start_date);

      return get('SELECT * FROM rental WHERE id = ?', rentalId);
    });
  },

  'POST /api/rentals/close': async (req) => {
    const b = await readBody(req);
    const rental = get('SELECT * FROM rental WHERE id = ?', b.rental_id);
    if (!rental) throw Object.assign(new Error('rental not found'), { status: 404 });
    run(`UPDATE rental SET status = 'closed', returned_on = ?,
           deposit_status = CASE WHEN deposit_status = 'held' THEN ? ELSE deposit_status END
         WHERE id = ?`,
      b.returned_on ?? today(), b.deposit_status ?? 'refunded', b.rental_id);
    return get('SELECT * FROM rental WHERE id = ?', b.rental_id);
  },

  'POST /api/charges': async (req) => {
    const b = await readBody(req);
    const net = toFils(b.amount);
    const info = run(
      `INSERT INTO charge (rental_id, kind, description, amount, vat_amount, charge_date)
       VALUES (?,?,?,?,?,?)`,
      b.rental_id, b.kind, b.description ?? null, net,
      b.vat_exempt ? 0 : vatOn(net), b.charge_date ?? today());
    return get('SELECT * FROM charge WHERE id = ?', info.lastInsertRowid);
  },

  'POST /api/payments': async (req) => {
    const b = await readBody(req);
    const info = run(
      `INSERT INTO payment (customer_id, rental_id, amount, kind, method, paid_on, notes)
       VALUES (?,?,?,?,?,?,?)`,
      b.customer_id, b.rental_id ?? null, toFils(b.amount), b.kind ?? 'rental',
      b.method ?? null, b.paid_on ?? today(), b.notes ?? null);
    return get('SELECT * FROM payment WHERE id = ?', info.lastInsertRowid);
  },

  'GET /api/expenses': () => all(`
    SELECT e.*, v.code AS vehicle_code, v.plate FROM expense e
      LEFT JOIN vehicle v ON v.id = e.vehicle_id
     ORDER BY e.expense_date DESC, e.id DESC LIMIT 500`),

  'POST /api/expenses': async (req) => {
    const b = await readBody(req);
    const net = toFils(b.amount);
    const info = run(
      `INSERT INTO expense (vehicle_id, category, description, amount, vat_amount,
        expense_date, supplier, recoverable, rental_id, amortise_months, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      b.vehicle_id ?? null, b.category, b.description ?? null, net,
      b.vat_exempt ? 0 : vatOn(net), b.expense_date ?? today(), b.supplier ?? null,
      b.recoverable ? 1 : 0, b.rental_id ?? null, Number(b.amortise_months ?? 0),
      b.notes ?? null);
    return get('SELECT * FROM expense WHERE id = ?', info.lastInsertRowid);
  },

  'GET /api/fines': (_req, url) => {
    const status = url.searchParams.get('status');
    return all(`
      SELECT f.*, v.code AS vehicle_code, v.plate, v.model, c.name AS customer_name
        FROM fine f JOIN vehicle v ON v.id = f.vehicle_id
             LEFT JOIN rental r ON r.id = f.rental_id
             LEFT JOIN customer c ON c.id = r.customer_id
       ${status ? 'WHERE f.status = ?' : ''}
       ORDER BY f.amount DESC`, ...(status ? [status] : []));
  },

  'POST /api/fines': async (req) => {
    const b = await readBody(req);
    const info = run(
      `INSERT INTO fine (vehicle_id, rental_id, fine_number, fine_at, location,
        reason, amount, black_points, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      b.vehicle_id, b.rental_id ?? null, b.fine_number ?? null, b.fine_at ?? null,
      b.location ?? null, b.reason ?? null, toFils(b.amount),
      Number(b.black_points ?? 0), b.status ?? 'unallocated', b.notes ?? null);
    return get('SELECT * FROM fine WHERE id = ?', info.lastInsertRowid);
  },

  /**
   * Attribute a fine to whoever had the car when it was issued, and bill it on.
   * This is the loop that turns the open fines balance into either cash or a
   * conscious decision to absorb it — rather than a number nobody owns.
   */
  'POST /api/fines/allocate': async (req) => {
    const b = await readBody(req);
    const fine = get('SELECT * FROM fine WHERE id = ?', b.fine_id);
    if (!fine) throw Object.assign(new Error('fine not found'), { status: 404 });

    if (b.company_borne) {
      run("UPDATE fine SET status = 'company_borne' WHERE id = ?", b.fine_id);
      return get('SELECT * FROM fine WHERE id = ?', b.fine_id);
    }

    const rental = b.rental_id
      ? get('SELECT * FROM rental WHERE id = ?', b.rental_id)
      : get(`SELECT * FROM rental WHERE vehicle_id = ? AND status <> 'cancelled'
               AND date(?) BETWEEN start_date AND COALESCE(returned_on, end_date)
             ORDER BY start_date DESC LIMIT 1`, fine.vehicle_id, fine.fine_at);

    if (!rental) {
      throw Object.assign(
        new Error('No rental covers that date — the car was off-hire, so this is a company cost'),
        { status: 409 });
    }

    return tx(() => {
      run("UPDATE fine SET status = 'recharged', rental_id = ? WHERE id = ?",
        rental.id, fine.id);
      // The fine is recharged at cost; only the handling fee is a taxable supply.
      run(`INSERT INTO charge (rental_id, kind, description, amount, vat_amount, charge_date)
           VALUES (?, 'fine', ?, ?, 0, ?)`,
        rental.id, `Traffic fine ${fine.fine_number ?? ''}`.trim(), fine.amount,
        fine.fine_at?.slice(0, 10) ?? today());
      const adminFee = toFils(b.admin_fee ?? 0);
      if (adminFee > 0) {
        run(`INSERT INTO charge (rental_id, kind, description, amount, vat_amount, charge_date)
             VALUES (?, 'fine_admin', 'Fine handling fee', ?, ?, ?)`,
          rental.id, adminFee, vatOn(adminFee), today());
      }
      return get('SELECT * FROM fine WHERE id = ?', fine.id);
    });
  },

  'GET /api/reports/fleet-pnl': (_req, url) => {
    const { from, to } = period(url);
    return fleetPnl(from, to);
  },

  'GET /api/reports/vehicle-pnl': (_req, url) => {
    const { from, to } = period(url);
    const id = Number(url.searchParams.get('vehicle_id'));
    const pnl = vehiclePnl(id, from, to);
    if (!pnl) throw Object.assign(new Error('vehicle not found'), { status: 404 });
    return pnl;
  },

  'GET /api/reports/utilisation': (_req, url) => {
    const { from, to } = period(url);
    return all("SELECT id, code, plate, model FROM vehicle WHERE status = 'active' ORDER BY code")
      .map((v) => ({ ...v, ...vehiclePnl(v.id, from, to).utilisation }))
      .sort((a, b) => a.utilisationPct - b.utilisationPct);
  },
};

async function serveStatic(res, pathname) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return json(res, { error: 'forbidden' }, 403);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    json(res, { error: 'not found' }, 404);
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return serveStatic(res, url.pathname);
  try {
    json(res, await handler(req, url));
  } catch (err) {
    json(res, { error: err.message }, err.status ?? 500);
  }
}).listen(PORT, () => {
  console.log(`Pindi Boys Fleet & Rental System running on http://localhost:${PORT}`);
});
