/**
 * Loads one worked example so the screens have something in them:
 * the Highlander rental from the original brief — AED 250/day for 10 days,
 * AED 1,500 deposit, Salik recharged, one fine billed on and one absorbed.
 *
 * Usage: node src/demo.mjs      (run `npm run reseed` first for a clean slate)
 */
import { get, run, tx } from './db.mjs';
import { toFils, vatOn } from './money.mjs';

const vehicle = get("SELECT * FROM vehicle WHERE model LIKE '%Highlander%' LIMIT 1");
if (!vehicle) throw new Error('Seed the fleet first: npm run reseed');

const MONTH = '2026-08';
const charge = (rentalId, kind, description, aed, date, vatExempt = false) => {
  const net = toFils(aed);
  run(`INSERT INTO charge (rental_id, kind, description, amount, vat_amount, charge_date)
       VALUES (?,?,?,?,?,?)`,
    rentalId, kind, description, net, vatExempt ? 0 : vatOn(net), date);
};

tx(() => {
  run(`UPDATE vehicle SET purchase_price = ?, purchase_date = ?, daily_rate = ? WHERE id = ?`,
    toFils(145000), '2023-12-27', toFils(250), vehicle.id);

  const customer = run(
    `INSERT INTO customer (name, kind, phone, id_type, id_number)
     VALUES ('Ahmed Khan', 'individual', '050-1234567', 'emirates_id', '784-1990-1234567-1')`,
  ).lastInsertRowid;

  const rental = run(
    `INSERT INTO rental (vehicle_id, customer_id, contract_no, rate_type, rate_amount,
      start_date, end_date, deposit_amount, deposit_status)
     VALUES (?,?,'PB-2026-0001','daily',?,?,?,?, 'held')`,
    vehicle.id, customer, toFils(250), `${MONTH}-05`, `${MONTH}-14`, toFils(1500),
  ).lastInsertRowid;

  charge(rental, 'rent', '10 x daily rental', 2500, `${MONTH}-05`);
  charge(rental, 'salik', 'Salik trips 05-14 Aug', 120, `${MONTH}-14`);
  // A fine is recharged at cost; only the handling fee is a taxable supply.
  charge(rental, 'fine', 'Traffic fine DXB-889231', 300, `${MONTH}-08`, true);
  charge(rental, 'fine_admin', 'Fine handling fee', 50, `${MONTH}-08`);

  run(`INSERT INTO payment (customer_id, rental_id, amount, kind, method, paid_on)
       VALUES (?,?,?, 'deposit', 'cash', ?)`, customer, rental, toFils(1500), `${MONTH}-05`);
  run(`INSERT INTO payment (customer_id, rental_id, amount, kind, method, paid_on)
       VALUES (?,?,?, 'rental', 'card', ?)`, customer, rental, toFils(2625), `${MONTH}-05`);

  run(`INSERT INTO fine (vehicle_id, rental_id, fine_number, fine_at, reason, amount, status)
       VALUES (?,?, 'DXB-889231', ?, 'Overspeeding 20km/h', ?, 'recharged')`,
    vehicle.id, rental, `${MONTH}-08`, toFils(300));
  run(`INSERT INTO fine (vehicle_id, fine_number, fine_at, reason, amount, status, notes)
       VALUES (?, 'DXB-990111', ?, 'Parking', ?, 'company_borne',
               'Issued while the car was off-hire, so the company carries it')`,
    vehicle.id, `${MONTH}-25`, toFils(200));

  // A yearly premium spread over twelve months, and a one-off service.
  run(`INSERT INTO expense (vehicle_id, category, description, amount, vat_amount,
        expense_date, supplier, amortise_months) VALUES (?, 'insurance', 'Annual policy',
        ?, ?, ?, 'Dubai Insurance', 12)`,
    vehicle.id, toFils(5000), vatOn(toFils(5000)), `${MONTH}-01`);
  run(`INSERT INTO expense (vehicle_id, category, description, amount, vat_amount,
        expense_date, supplier) VALUES (?, 'maintenance', '40k service', ?, ?, ?, 'Al Quoz Garage')`,
    vehicle.id, toFils(700), vatOn(toFils(700)), `${MONTH}-10`);
});

console.log(`Demo loaded on ${vehicle.code} ${vehicle.plate} (${vehicle.model}).`);
console.log(`Open http://localhost:3000/#pnl with the period set to ${MONTH}-01 .. ${MONTH}-31.`);
