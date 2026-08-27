import { all, get } from './db.mjs';
import { overlapDays, daysBetween, iso } from './dates.mjs';

/**
 * Expenses are recognised in the period they belong to, not the period they were paid in.
 * An insurance premium paid once for twelve months is spread across those twelve months —
 * otherwise four months a year show a fake loss and the other eight a fake profit.
 */
function expenseInPeriod(exp, from, to) {
  if (!exp.amortise_months || exp.amortise_months <= 1) {
    return exp.expense_date >= from && exp.expense_date <= to ? exp.amount : 0;
  }
  const perMonth = exp.amount / exp.amortise_months;
  const start = new Date(exp.expense_date);
  let total = 0;
  for (let i = 0; i < exp.amortise_months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    const day = iso(d);
    if (day >= from && day <= to) total += perMonth;
  }
  return Math.round(total);
}

/**
 * Straight-line depreciation, charged per day the vehicle is owned during the period.
 * On a fleet this young it is usually the largest single cost, so a per-car P&L that
 * leaves it out is not a profit figure at all.
 */
function depreciationInPeriod(v, from, to) {
  if (!v.purchase_price || !v.purchase_date) return 0;
  const ownedFrom = v.purchase_date > from ? v.purchase_date : from;
  const ownedTo = v.disposed_on && v.disposed_on < to ? v.disposed_on : to;
  if (ownedTo < ownedFrom) return 0;

  const depreciable = v.purchase_price * (1 - (v.residual_pct ?? 20) / 100);
  const perDay = depreciable / ((v.useful_life_years ?? 5) * 365);
  const lifeEnd = new Date(v.purchase_date);
  lifeEnd.setFullYear(lifeEnd.getFullYear() + Math.floor(v.useful_life_years ?? 5));
  const cappedTo = iso(lifeEnd) < ownedTo ? iso(lifeEnd) : ownedTo;   // stop at residual
  if (cappedTo < ownedFrom) return 0;

  return Math.round(perDay * daysBetween(ownedFrom, cappedTo));
}

/** Days the vehicle was actually on rent during the period. */
export function rentedDays(vehicleId, from, to) {
  const rentals = all(
    `SELECT start_date, end_date, returned_on FROM rental
      WHERE vehicle_id = ? AND status <> 'cancelled'
        AND start_date <= ? AND COALESCE(returned_on, end_date) >= ?`,
    vehicleId, to, from,
  );
  // A car cannot be rented twice on the same day; counting days rather than summing
  // rental lengths keeps utilisation at or below 100% even if contracts overlap.
  const days = new Set();
  for (const r of rentals) {
    const end = r.returned_on ?? r.end_date;
    const start = r.start_date > from ? r.start_date : from;
    const stop = end < to ? end : to;
    for (let d = new Date(start); iso(d) <= stop; d.setDate(d.getDate() + 1)) days.add(iso(d));
  }
  return days.size;
}

/** Full profit and loss for one vehicle over a period, in fils. */
export function vehiclePnl(vehicleId, from, to) {
  const v = get('SELECT * FROM vehicle WHERE id = ?', vehicleId);
  if (!v) return null;

  const revenueRows = all(
    `SELECT c.kind, SUM(c.amount) AS amount
       FROM charge c JOIN rental r ON r.id = c.rental_id
      WHERE r.vehicle_id = ? AND c.charge_date BETWEEN ? AND ?
      GROUP BY c.kind`,
    vehicleId, from, to,
  );
  const revenue = Object.fromEntries(revenueRows.map((r) => [r.kind, r.amount]));
  const revenueTotal = revenueRows.reduce((s, r) => s + r.amount, 0);

  const expenses = all('SELECT * FROM expense WHERE vehicle_id = ?', vehicleId);
  const costByCategory = {};
  for (const e of expenses) {
    const amount = expenseInPeriod(e, from, to);
    if (!amount) continue;
    costByCategory[e.category] = (costByCategory[e.category] ?? 0) + amount;
  }

  // Salik and fines the customer was never billed for are a real cost of that car.
  const salikBorne = get(
    `SELECT COALESCE(SUM(amount),0) AS n FROM salik_trip
      WHERE vehicle_id = ? AND status <> 'recharged' AND date(trip_at) BETWEEN ? AND ?`,
    vehicleId, from, to,
  ).n;
  if (salikBorne) costByCategory.salik_unrecovered = salikBorne;

  const finesBorne = get(
    `SELECT COALESCE(SUM(amount),0) AS n FROM fine
      WHERE vehicle_id = ? AND status <> 'recharged'
        AND (fine_at IS NULL OR date(fine_at) BETWEEN ? AND ?)`,
    vehicleId, from, to,
  ).n;
  if (finesBorne) costByCategory.fines_unrecovered = finesBorne;

  const directCosts = Object.values(costByCategory).reduce((s, n) => s + n, 0);
  const depreciation = depreciationInPeriod(v, from, to);
  const interest = get(
    `SELECT COALESCE(SUM(i.interest),0) AS n
       FROM loan_instalment i JOIN loan l ON l.id = i.loan_id
      WHERE l.vehicle_id = ? AND i.due_date BETWEEN ? AND ?`,
    vehicleId, from, to,
  ).n;

  const profitBeforeInvestor = revenueTotal - directCosts - depreciation - interest;

  let investorShare = 0;
  if (v.ownership === 'investor' && v.investor_id) {
    const inv = get('SELECT * FROM investor WHERE id = ?', v.investor_id);
    // The investor shares in profit, not in losses, unless the deal says otherwise.
    if (inv && profitBeforeInvestor > 0) {
      investorShare = Math.round(profitBeforeInvestor * (inv.profit_share_pct / 100));
    }
  }

  const days = daysBetween(from, to);
  const onRent = rentedDays(vehicleId, from, to);
  const netProfit = profitBeforeInvestor - investorShare;

  return {
    vehicle: { id: v.id, code: v.code, plate: v.plate, model: v.model, ownership: v.ownership },
    period: { from, to, days },
    revenue, revenueTotal,
    costByCategory, directCosts,
    depreciation, interest, profitBeforeInvestor, investorShare, netProfit,
    utilisation: {
      availableDays: days,
      rentedDays: onRent,
      idleDays: days - onRent,
      utilisationPct: days ? Math.round((onRent / days) * 1000) / 10 : 0,
      revenuePerAvailableDay: days ? Math.round(revenueTotal / days) : 0,
      revenuePerRentedDay: onRent ? Math.round(revenueTotal / onRent) : 0,
    },
  };
}

/** Every active vehicle, ranked worst-performing first — the list to act on. */
export function fleetPnl(from, to) {
  const vehicles = all("SELECT id FROM vehicle WHERE status <> 'written_off' ORDER BY code");
  return vehicles
    .map((v) => vehiclePnl(v.id, from, to))
    .sort((a, b) => a.netProfit - b.netProfit);
}

export function dashboard(from, to) {
  const rows = fleetPnl(from, to);
  const sum = (f) => rows.reduce((s, r) => s + f(r), 0);

  const onRentNow = get(
    "SELECT COUNT(DISTINCT vehicle_id) AS n FROM rental WHERE status = 'open'",
  ).n;
  const fleetSize = get("SELECT COUNT(*) AS n FROM vehicle WHERE status = 'active'").n;

  const billed = get('SELECT COALESCE(SUM(amount + vat_amount),0) AS n FROM charge').n;
  const collected = get(
    "SELECT COALESCE(SUM(amount),0) AS n FROM payment WHERE kind = 'rental'",
  ).n;
  const depositsHeld = get(
    "SELECT COALESCE(SUM(deposit_amount),0) AS n FROM rental WHERE deposit_status = 'held'",
  ).n;
  const finesOpen = get(
    "SELECT COALESCE(SUM(amount),0) AS n, COUNT(*) AS c FROM fine WHERE status = 'unallocated'",
  );
  const salikOpen = get(
    "SELECT COALESCE(SUM(amount),0) AS n FROM salik_trip WHERE status = 'unallocated'",
  ).n;

  return {
    period: { from, to },
    fleetSize,
    onRentNow,
    availableNow: fleetSize - onRentNow,
    revenue: sum((r) => r.revenueTotal),
    directCosts: sum((r) => r.directCosts),
    depreciation: sum((r) => r.depreciation),
    interest: sum((r) => r.interest),
    investorShare: sum((r) => r.investorShare),
    netProfit: sum((r) => r.netProfit),
    receivable: billed - collected,
    depositsHeld,
    finesUnallocated: finesOpen.n,
    finesUnallocatedCount: finesOpen.c,
    salikUnallocated: salikOpen,
    utilisationPct: rows.length
      ? Math.round((sum((r) => r.utilisation.rentedDays) /
          sum((r) => r.utilisation.availableDays)) * 1000) / 10
      : 0,
    losers: rows.filter((r) => r.netProfit < 0).length,
  };
}
