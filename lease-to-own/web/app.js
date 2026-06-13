/* Prime Hire Car Rental — Lease to Own calculator + fleet UI */
(function () {
  'use strict';

  var cars = window.PINDI_CARS || [];
  var LTO = window.LTO;

  var state = {
    carId: cars[0] ? cars[0].id : null,
    product: 'lease-to-own',
    term: 36,
    downPaymentPct: 10
  };

  var CATEGORY_GLYPH = {
    'Economy': '🚗',
    'Compact SUV': '🚙',
    'Family MPV': '🚐',
    'Premium': '🏎️'
  };

  function carById(id) {
    for (var i = 0; i < cars.length; i++) if (cars[i].id === id) return cars[i];
    return cars[0];
  }

  function aed(n) { return Number(n).toLocaleString('en-AE'); }

  function currentQuote() {
    var car = carById(state.carId);
    return LTO.quote(car, {
      product: state.product === 'flexi' ? 'flexi' : 'lease-to-own',
      term: state.term,
      downPaymentPct: state.downPaymentPct
    });
  }

  // ---- Hero quote (cheapest economy car, 48 mo) ----
  function renderHero() {
    var economy = cars.filter(function (c) { return c.category === 'Economy'; });
    var car = economy.length ? economy.reduce(function (a, b) { return a.price < b.price ? a : b; }) : cars[0];
    var q = LTO.leaseToOwn(car, { term: 48, downPaymentPct: 20 });
    setText('hcCar', car.model);
    setText('hcTerm', '48 months');
    setText('hcMonthly', aed(q.monthly));
  }

  // ---- Calculator ----
  function renderCalc() {
    var q = currentQuote();
    var car = carById(state.carId);
    var floor = LTO.costFloor(car);
    var ownsHtml = q.ownsAtEnd
      ? '<div class="result-own">★ You own the car at the end of the term</div>'
      : '<div class="result-own no">↻ Pay the buyout to own, or return / re-lease</div>';

    var buyoutRow = q.buyout
      ? '<tr><td>End-of-term buyout</td><td>AED ' + aed(q.buyout) + '</td></tr>'
      : '';

    var html =
      '<div class="result-head">' +
        '<h3>' + q.car + '</h3>' +
        '<span class="result-badge">' + q.product + '</span>' +
      '</div>' +
      '<div class="result-monthly">AED ' + aed(q.monthly) + ' <span>/ month</span></div>' +
      ownsHtml +
      '<table class="result-table">' +
        '<tr><td>Vehicle value (est.)</td><td>AED ' + aed(q.price) + '</td></tr>' +
        '<tr><td>Down payment (' + q.downPaymentPct + '%)</td><td>AED ' + aed(q.downPayment) + '</td></tr>' +
        '<tr><td>Term</td><td>' + q.term + ' months</td></tr>' +
        '<tr><td>Finance portion / mo</td><td>AED ' + aed(q.monthlyFinance) + '</td></tr>' +
        '<tr><td>Insurance + service / mo</td><td>AED ' + aed(q.monthlyOperating) + '</td></tr>' +
        '<tr><td>VAT (5%) / mo</td><td>AED ' + aed(q.monthlyVat) + '</td></tr>' +
        buyoutRow +
        '<tr><td>Total over term</td><td>AED ' + aed(q.totalPayable) + '</td></tr>' +
      '</table>' +
      '<a class="btn btn-block" href="#apply">Apply for this plan</a>';

    document.getElementById('calcResult').innerHTML = html;

    // keep apply form in sync
    setVal('applyCar', q.car);
    setVal('applyPlan', q.product + ' · ' + q.term + ' months');
    setVal('applyMonthly', 'AED ' + aed(q.monthly) + ' / month');

    // (internal margin available for debugging) — not shown to customer
    void floor;
  }

  // ---- Fleet grid ----
  function renderFleet(filter) {
    var grid = document.getElementById('fleetGrid');
    var list = filter && filter !== 'All'
      ? cars.filter(function (c) { return c.category === filter; })
      : cars;

    grid.innerHTML = list.map(function (car) {
      var q = LTO.leaseToOwn(car, { term: 36, downPaymentPct: 10 });
      return '' +
        '<div class="car-card">' +
          '<div class="car-thumb">' +
            '<span class="cat">' + car.category + '</span>' +
            '<span class="glyph">' + (CATEGORY_GLYPH[car.category] || '🚗') + '</span>' +
          '</div>' +
          '<div class="car-body">' +
            '<h3>' + car.model + '</h3>' +
            '<div class="car-meta">' + car.year + ' · ' + car.seats + ' seats · ' + car.category + '</div>' +
            '<div class="car-price"><b>AED ' + aed(q.monthly) + '</b> <span>/mo · 36m lease-to-own</span></div>' +
          '</div>' +
          '<button class="btn btn-sm" data-pick="' + car.id + '">Select &amp; calculate</button>' +
        '</div>';
    }).join('');
  }

  function renderFilters() {
    var cats = ['All'].concat(unique(cars.map(function (c) { return c.category; })));
    var bar = document.getElementById('filterBar');
    bar.innerHTML = cats.map(function (c, i) {
      return '<button class="' + (i === 0 ? 'active' : '') + '" data-filter="' + c + '">' + c + '</button>';
    }).join('');
  }

  function populateCarSelect() {
    var sel = document.getElementById('carSelect');
    sel.innerHTML = cars.map(function (c) {
      return '<option value="' + c.id + '">' + c.model + ' (' + c.category + ')</option>';
    }).join('');
    sel.value = state.carId;
  }

  // ---- Helpers ----
  function setText(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v; }
  function unique(arr) { var seen = {}, out = []; arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out; }
  function setActive(container, attr, value) {
    [].forEach.call(container.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b.getAttribute(attr) === String(value));
    });
  }

  // ---- Wire up events ----
  function init() {
    if (!cars.length || !LTO) return;

    populateCarSelect();
    renderFilters();
    renderFleet('All');
    renderHero();
    renderCalc();
    setText('year', new Date().getFullYear());

    document.getElementById('carSelect').addEventListener('change', function (e) {
      state.carId = e.target.value; renderCalc();
    });

    var productSeg = document.getElementById('productSeg');
    productSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      state.product = btn.getAttribute('data-product');
      setActive(productSeg, 'data-product', state.product);
      renderCalc();
    });

    var termSeg = document.getElementById('termSeg');
    termSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      state.term = parseInt(btn.getAttribute('data-term'), 10);
      setActive(termSeg, 'data-term', state.term);
      renderCalc();
    });

    var downRange = document.getElementById('downRange');
    downRange.addEventListener('input', function (e) {
      state.downPaymentPct = parseInt(e.target.value, 10);
      setText('downLabel', state.downPaymentPct + '%');
      renderCalc();
    });

    document.getElementById('filterBar').addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      setActive(document.getElementById('filterBar'), 'data-filter', btn.getAttribute('data-filter'));
      renderFleet(btn.getAttribute('data-filter'));
    });

    document.getElementById('fleetGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-pick]'); if (!btn) return;
      state.carId = btn.getAttribute('data-pick');
      document.getElementById('carSelect').value = state.carId;
      renderCalc();
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('applyForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = e.target.name.value.trim();
      setText('formNote', 'Shukriya ' + (name || '') + '! Your request is noted — our team will contact you on ' + (e.target.phone.value || 'your number') + '.');
      e.target.reset();
      // re-sync read-only fields after reset
      renderCalc();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
