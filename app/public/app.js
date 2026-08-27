const $ = (id) => document.getElementById(id);
const aed = (fils) => (fils / 100).toLocaleString('en-AE',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (fils) => `<td class="num${fils < 0 ? ' neg' : ''}">${aed(fils)}</td>`;

const state = { tab: 'dashboard', from: null, to: null };

async function api(path, options) {
  const res = await fetch(path, options && {
    method: options.method ?? 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(options.body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'request failed');
  return data;
}

const qs = () => `from=${state.from}&to=${state.to}`;

const TABS = {
  dashboard: ['Dashboard', renderDashboard],
  fleet: ['Fleet', renderFleet],
  rentals: ['Rentals', renderRentals],
  customers: ['Customers', renderCustomers],
  fines: ['Fines', renderFines],
  expenses: ['Expenses', renderExpenses],
  pnl: ['Car P&L', renderPnl],
  utilisation: ['Utilisation', renderUtilisation],
};

function renderNav() {
  $('nav').innerHTML = Object.entries(TABS).map(([key, [label]]) =>
    `<button data-tab="${key}" class="${state.tab === key ? 'on' : ''}">${label}</button>`).join('');
}

async function render() {
  renderNav();
  $('main').innerHTML = '<div class="empty">Loading…</div>';
  try {
    $('main').innerHTML = await TABS[state.tab][1]();
    wire();
  } catch (err) {
    $('main').innerHTML = `<div class="err">${esc(err.message)}</div>`;
  }
}

/* ---------------------------------------------------------------- dashboard */

async function renderDashboard() {
  const d = await api(`/api/dashboard?${qs()}`);
  const card = (label, value, note = '', cls = '') =>
    `<div class="card ${cls}"><div class="label">${label}</div>
     <div class="value">${value}</div><div class="note">${note}</div></div>`;

  return `<div class="cards">
    ${card('Fleet', d.fleetSize, `${d.onRentNow} on rent · ${d.availableNow} available`)}
    ${card('Utilisation', `${d.utilisationPct}%`, 'of available days in period',
      d.utilisationPct < 50 ? 'warn' : '')}
    ${card('Revenue', aed(d.revenue), 'billed in period')}
    ${card('Net profit', aed(d.netProfit), 'after depreciation &amp; finance',
      d.netProfit < 0 ? 'bad' : '')}
    ${card('Receivable', aed(d.receivable), 'owed by customers',
      d.receivable > 0 ? 'warn' : '')}
    ${card('Deposits held', aed(d.depositsHeld), "customers' money, not income")}
    ${card('Fines unallocated', aed(d.finesUnallocated),
      `${d.finesUnallocatedCount} records — nobody billed yet`,
      d.finesUnallocated > 0 ? 'bad' : '')}
    ${card('Cars losing money', d.losers, 'in this period', d.losers > 0 ? 'bad' : '')}
  </div>

  <section><h2>Where the money went</h2><div class="scroll"><table>
    <tbody>
      <tr><td>Revenue</td>${num(d.revenue)}</tr>
      <tr><td>Direct vehicle costs</td>${num(-d.directCosts)}</tr>
      <tr><td>Depreciation</td>${num(-d.depreciation)}</tr>
      <tr><td>Finance cost</td>${num(-d.interest)}</tr>
      <tr><td>Investor share</td>${num(-d.investorShare)}</tr>
      <tr><td><strong>Net profit</strong></td>
        <td class="num ${d.netProfit < 0 ? 'neg' : ''}"><strong>${aed(d.netProfit)}</strong></td></tr>
    </tbody>
  </table></div></section>

  ${d.revenue === 0 ? `<section><h2>Getting started</h2><div class="empty">
    No rentals recorded in this period yet. Add a customer, then open a rental on the
    Rentals tab — revenue, utilisation and per-car profit all follow from that one record.
  </div></section>` : ''}`;
}

/* -------------------------------------------------------------------- fleet */

async function renderFleet() {
  const rows = await api('/api/vehicles');
  const soon = (date) => {
    if (!date) return '';
    const days = Math.round((Date.parse(date) - Date.now()) / 86400000);
    if (days < 0) return `<span class="pill alert">expired ${esc(date)}</span>`;
    if (days < 45) return `<span class="pill warn">${days}d — ${esc(date)}</span>`;
    return esc(date);
  };
  return `<section><h2>${rows.length} vehicles</h2><div class="scroll"><table>
    <thead><tr><th>Code</th><th>Plate</th><th>Model</th><th>Year</th><th>Ownership</th>
      <th>Finance</th><th>Insurance expiry</th><th>Status</th><th class="num">Purchase</th>
      <th class="num">Daily rate</th></tr></thead>
    <tbody>${rows.map((v) => `<tr>
      <td>${esc(v.code)}</td><td>${esc(v.plate)}</td><td>${esc(v.model)}</td>
      <td>${esc(v.model_year ?? '')}</td>
      <td>${v.ownership === 'investor' ? `<span class="pill">investor: ${esc(v.investor_name ?? '?')}</span>`
        : esc(v.ownership.replace('_', ' '))}</td>
      <td>${esc(v.finance_bank ?? '')}</td>
      <td>${soon(v.insurance_expiry)}</td>
      <td>${v.open_rental_id
        ? `<span class="pill on">on rent — ${esc(v.current_customer)}</span>`
        : '<span class="pill">available</span>'}</td>
      <td class="num">${v.purchase_price ? aed(v.purchase_price) : '—'}</td>
      <td class="num">${v.daily_rate ? aed(v.daily_rate) : '—'}</td>
    </tr>`).join('')}</tbody></table></div></section>`;
}

/* ------------------------------------------------------------------ rentals */

async function renderRentals() {
  const [rentals, vehicles, customers] = await Promise.all([
    api('/api/rentals'), api('/api/vehicles'), api('/api/customers'),
  ]);
  const free = vehicles.filter((v) => !v.open_rental_id && v.status === 'active');

  return `<section><h2>Open a rental</h2>
    <form class="row" id="rental-form">
      <label>Vehicle<select name="vehicle_id" required>
        ${free.map((v) => `<option value="${v.id}">${esc(v.code)} · ${esc(v.plate)} · ${esc(v.model)}</option>`).join('')}
      </select></label>
      <label>Customer<select name="customer_id" required>
        ${customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select></label>
      <label>Rate type<select name="rate_type">
        <option value="daily">Daily</option><option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option><option value="long_term">Long term</option>
      </select></label>
      <label>Rate (AED)<input name="rate_amount" type="number" step="0.01" required></label>
      <label>Units<input name="units" type="number" value="1" min="1" required></label>
      <label>From<input name="start_date" type="date" required></label>
      <label>To<input name="end_date" type="date" required></label>
      <label>Deposit (AED)<input name="deposit_amount" type="number" step="0.01" value="0"></label>
      <button class="go" type="submit">Open rental</button>
    </form>
    ${customers.length ? '' : '<div class="err">Add a customer first — Customers tab.</div>'}
    ${free.length ? '' : '<div class="err">Every vehicle is currently out on rent.</div>'}
  </section>

  <section><h2>Rentals</h2>${rentals.length ? `<div class="scroll"><table>
    <thead><tr><th>#</th><th>Vehicle</th><th>Customer</th><th>From</th><th>To</th>
      <th>Status</th><th class="num">Billed</th><th class="num">Paid</th>
      <th class="num">Balance</th><th></th></tr></thead>
    <tbody>${rentals.map((r) => `<tr>
      <td>${r.id}</td>
      <td>${esc(r.vehicle_code)} · ${esc(r.plate)}</td>
      <td>${esc(r.customer_name)}</td>
      <td>${esc(r.start_date)}</td>
      <td>${esc(r.returned_on ?? r.end_date)}</td>
      <td>${r.status === 'open' ? '<span class="pill on">open</span>'
        : `<span class="pill">${esc(r.status)}</span>`}</td>
      ${num(r.billed)}${num(r.paid)}${num(r.billed - r.paid)}
      <td>${r.status === 'open'
        ? `<button class="link" data-close="${r.id}">check in</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">No rentals yet.</div>'}</section>`;
}

/* ---------------------------------------------------------------- customers */

async function renderCustomers() {
  const rows = await api('/api/customers');
  return `<section><h2>Add a customer</h2>
    <form class="row" id="customer-form">
      <label>Name<input name="name" required></label>
      <label>Type<select name="kind"><option value="individual">Individual</option>
        <option value="company">Company</option></select></label>
      <label>Phone<input name="phone"></label>
      <label>ID type<select name="id_type"><option value="emirates_id">Emirates ID</option>
        <option value="passport">Passport</option>
        <option value="trade_licence">Trade licence</option></select></label>
      <label>ID number<input name="id_number"></label>
      <label>Licence no.<input name="licence_number"></label>
      <button class="go" type="submit">Add customer</button>
    </form></section>

  <section><h2>${rows.length} customers</h2>${rows.length ? `<div class="scroll"><table>
    <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>ID</th>
      <th class="num">Balance owed</th></tr></thead>
    <tbody>${rows.map((c) => `<tr>
      <td>${esc(c.name)}</td><td>${esc(c.kind)}</td><td>${esc(c.phone ?? '')}</td>
      <td>${esc(c.id_number ?? '')}</td>${num(c.balance)}
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No customers yet.</div>'}
  </section>`;
}

/* -------------------------------------------------------------------- fines */

async function renderFines() {
  const rows = await api('/api/fines');
  const open = rows.filter((f) => f.status === 'unallocated');
  const openTotal = open.reduce((s, f) => s + f.amount, 0);

  return `<div class="cards">
    <div class="card ${openTotal ? 'bad' : ''}"><div class="label">Unallocated</div>
      <div class="value">${aed(openTotal)}</div>
      <div class="note">${open.length} records — not yet billed or absorbed</div></div>
    <div class="card"><div class="label">Recharged</div>
      <div class="value">${aed(rows.filter((f) => f.status === 'recharged')
        .reduce((s, f) => s + f.amount, 0))}</div>
      <div class="note">billed to customers</div></div>
    <div class="card"><div class="label">Company borne</div>
      <div class="value">${aed(rows.filter((f) => f.status === 'company_borne')
        .reduce((s, f) => s + f.amount, 0))}</div>
      <div class="note">absorbed — real cost of the car</div></div>
  </div>

  <section><h2>Fines</h2>${rows.length ? `<div class="scroll"><table>
    <thead><tr><th>Vehicle</th><th>Fine no.</th><th>Date</th><th>Reason</th>
      <th class="num">Amount</th><th>Status</th><th>Customer</th><th></th></tr></thead>
    <tbody>${rows.map((f) => `<tr>
      <td>${esc(f.vehicle_code)} · ${esc(f.plate)}</td>
      <td>${esc(f.fine_number ?? '')}</td>
      <td>${esc((f.fine_at ?? '').slice(0, 10))}</td>
      <td>${esc(f.reason ?? '')}</td>
      ${num(f.amount)}
      <td>${f.status === 'unallocated' ? '<span class="pill alert">unallocated</span>'
        : f.status === 'recharged' ? '<span class="pill on">recharged</span>'
        : `<span class="pill">${esc(f.status.replace('_', ' '))}</span>`}</td>
      <td>${esc(f.customer_name ?? '')}</td>
      <td>${f.status === 'unallocated' ? `
        <button class="link" data-allocate="${f.id}">bill to renter</button> ·
        <button class="link" data-absorb="${f.id}">absorb</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No fines recorded.</div>'}
  </section>`;
}

/* ----------------------------------------------------------------- expenses */

async function renderExpenses() {
  const [rows, vehicles] = await Promise.all([api('/api/expenses'), api('/api/vehicles')]);
  const CATEGORIES = ['insurance', 'registration', 'maintenance', 'repairs', 'tyres',
    'batteries', 'fuel', 'parking', 'cleaning', 'recovery', 'inspection',
    'accessories', 'rta_fees', 'other'];

  return `<section><h2>Record an expense</h2>
    <form class="row" id="expense-form">
      <label>Vehicle<select name="vehicle_id"><option value="">— none (company overhead) —</option>
        ${vehicles.map((v) => `<option value="${v.id}">${esc(v.code)} · ${esc(v.plate)}</option>`).join('')}
      </select></label>
      <label>Category<select name="category">
        ${CATEGORIES.map((c) => `<option value="${c}">${c.replace('_', ' ')}</option>`).join('')}
      </select></label>
      <label>Amount (AED)<input name="amount" type="number" step="0.01" required></label>
      <label>Date<input name="expense_date" type="date" required></label>
      <label>Supplier<input name="supplier"></label>
      <label title="Spread a yearly premium over 12 months instead of one hit">
        Spread over months<input name="amortise_months" type="number" min="0" value="0"></label>
      <label>Description<input name="description"></label>
      <button class="go" type="submit">Save expense</button>
    </form></section>

  <section><h2>Recent expenses</h2>${rows.length ? `<div class="scroll"><table>
    <thead><tr><th>Date</th><th>Vehicle</th><th>Category</th><th>Description</th>
      <th>Supplier</th><th class="num">Amount</th><th>Spread</th></tr></thead>
    <tbody>${rows.map((e) => `<tr>
      <td>${esc(e.expense_date)}</td>
      <td>${e.vehicle_code ? `${esc(e.vehicle_code)} · ${esc(e.plate)}` : '—'}</td>
      <td>${esc(e.category)}</td><td>${esc(e.description ?? '')}</td>
      <td>${esc(e.supplier ?? '')}</td>${num(e.amount)}
      <td>${e.amortise_months > 1 ? `${e.amortise_months} months` : '—'}</td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No expenses recorded.</div>'}
  </section>`;
}

/* ---------------------------------------------------------------- car P&L */

async function renderPnl() {
  const rows = await api(`/api/reports/fleet-pnl?${qs()}`);
  return `<section><h2>Profit per car — worst first</h2><div class="scroll"><table>
    <thead><tr><th>Code</th><th>Vehicle</th><th class="num">Revenue</th>
      <th class="num">Direct costs</th><th class="num">Depreciation</th>
      <th class="num">Finance</th><th class="num">Investor</th><th class="num">Net profit</th>
      <th class="num">Util.</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td>${esc(r.vehicle.code)}</td>
      <td>${esc(r.vehicle.plate)} · ${esc(r.vehicle.model)}</td>
      ${num(r.revenueTotal)}${num(-r.directCosts)}${num(-r.depreciation)}
      ${num(-r.interest)}${num(-r.investorShare)}
      <td class="num ${r.netProfit < 0 ? 'neg' : ''}"><strong>${aed(r.netProfit)}</strong></td>
      <td class="num">${r.utilisation.utilisationPct}%</td>
    </tr>`).join('')}</tbody></table></div>
    <div class="empty">Depreciation needs a purchase price and purchase date on each vehicle;
    finance cost needs the loan schedule. Both are blank until that data is loaded, so these
    columns read zero rather than guessing.</div>
  </section>`;
}

async function renderUtilisation() {
  const rows = await api(`/api/reports/utilisation?${qs()}`);
  return `<section><h2>Utilisation — least used first</h2><div class="scroll"><table>
    <thead><tr><th>Code</th><th>Plate</th><th>Model</th><th class="num">Available days</th>
      <th class="num">Rented</th><th class="num">Idle</th><th class="num">Utilisation</th>
      <th class="num">Revenue / available day</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td>${esc(r.code)}</td><td>${esc(r.plate)}</td><td>${esc(r.model)}</td>
      <td class="num">${r.availableDays}</td><td class="num">${r.rentedDays}</td>
      <td class="num">${r.idleDays}</td>
      <td class="num">${r.utilisationPct}%</td>
      ${num(r.revenuePerAvailableDay)}
    </tr>`).join('')}</tbody></table></div></section>`;
}

/* ------------------------------------------------------------------- wiring */

const formData = (form) => {
  const body = Object.fromEntries(new FormData(form));
  for (const k of Object.keys(body)) if (body[k] === '') delete body[k];
  return body;
};

function wire() {
  $('rental-form')?.addEventListener('submit', submit('/api/rentals'));
  $('customer-form')?.addEventListener('submit', submit('/api/customers'));
  $('expense-form')?.addEventListener('submit', submit('/api/expenses'));

  for (const b of document.querySelectorAll('[data-close]')) {
    b.onclick = () => act('/api/rentals/close', { rental_id: Number(b.dataset.close) });
  }
  for (const b of document.querySelectorAll('[data-allocate]')) {
    b.onclick = () => act('/api/fines/allocate', { fine_id: Number(b.dataset.allocate) });
  }
  for (const b of document.querySelectorAll('[data-absorb]')) {
    b.onclick = () => act('/api/fines/allocate',
      { fine_id: Number(b.dataset.absorb), company_borne: true });
  }
}

const submit = (path) => async (event) => {
  event.preventDefault();
  await act(path, formData(event.target));
};

async function act(path, body) {
  try {
    await api(path, { body });
    render();
  } catch (err) {
    const box = document.createElement('div');
    box.className = 'err';
    box.textContent = err.message;
    $('main').prepend(box);
    setTimeout(() => box.remove(), 6000);
  }
}

$('nav').addEventListener('click', (e) => {
  const tab = e.target.dataset?.tab;
  if (tab) location.hash = tab;                 // routing happens in hashchange
});

// The tab lives in the URL so a page can be bookmarked, shared and survive a refresh.
const routeFromHash = () => {
  const tab = location.hash.slice(1);
  state.tab = TABS[tab] ? tab : 'dashboard';
};
addEventListener('hashchange', () => { routeFromHash(); render(); });
routeFromHash();
for (const id of ['from', 'to']) {
  $(id).addEventListener('change', () => { state[id] = $(id).value; render(); });
}

const now = new Date();
state.from = $('from').value = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString().slice(0, 10);
state.to = $('to').value = now.toISOString().slice(0, 10);
render();
