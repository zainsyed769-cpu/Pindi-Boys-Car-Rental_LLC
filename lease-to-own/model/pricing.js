/*
 * Pindi Boys Car Rental L.L.C — Lease-to-Own pricing engine.
 *
 * One shared module used by both the website (browser) and the Node script
 * that generates the internal pricing sheet. All amounts in AED.
 *
 * Two products are supported, like Diamond Lease:
 *   1) Lease-to-Own  — monthly fully amortises the car + markup over the term;
 *                      title transfers to the customer at the end. No balloon.
 *   2) Flexi Lease   — lower monthly with a residual ("buyout") at the end;
 *                      customer can pay the buyout to own, return the car,
 *                      or re-lease.
 *
 * The numbers are deliberately conservative so every quote stays ABOVE the
 * internal cost floor (bank instalment + insurance + service + registration).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LTO = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // ---- Program-wide assumptions (single place to tune) --------------------
  var DEFAULTS = {
    annualProfitRate: 0.14,     // 14% p.a. flat markup (Murabaha-style)
    insurancePctOfValue: 0.04,  // annual comprehensive insurance ~4% of value
    annualMaintenance: 2400,    // AED/year service + tyres allowance
    annualRegistration: 1200,   // AED/year RTA registration + inspection
    vatRate: 0.05,              // UAE VAT 5% on the lease service
    residualPct: { 12: 0.55, 24: 0.40, 36: 0.25, 48: 0.10 } // Flexi buyout %
  };

  var TERMS = [12, 24, 36, 48];

  function round(n) { return Math.round(n); }

  // ---- Lease-to-Own: own the car at end of term ---------------------------
  function leaseToOwn(car, opts) {
    opts = assign({}, DEFAULTS, opts || {});
    var term = opts.term || 36;
    var downPct = (opts.downPaymentPct != null ? opts.downPaymentPct : 10) / 100;
    var price = car.price;

    var downPayment = price * downPct;
    var financed = price - downPayment;
    var markup = financed * opts.annualProfitRate * (term / 12);

    var monthlyFinance = (financed + markup) / term;
    var monthlyOperating = operatingPerMonth(price, opts);
    var beforeVat = monthlyFinance + monthlyOperating;
    var vat = beforeVat * opts.vatRate;
    var monthly = beforeVat + vat;

    return {
      product: 'Lease-to-Own',
      car: car.model,
      carId: car.id,
      price: round(price),
      term: term,
      downPaymentPct: round(downPct * 100),
      downPayment: round(downPayment),
      financed: round(financed),
      markup: round(markup),
      monthlyFinance: round(monthlyFinance),
      monthlyOperating: round(monthlyOperating),
      monthlyVat: round(vat),
      monthly: round(monthly),
      buyout: 0,
      totalPayable: round(downPayment + monthly * term),
      ownsAtEnd: true
    };
  }

  // ---- Flexi Lease: lower monthly + residual buyout -----------------------
  function flexiLease(car, opts) {
    opts = assign({}, DEFAULTS, opts || {});
    var term = opts.term || 36;
    var downPct = (opts.downPaymentPct != null ? opts.downPaymentPct : 10) / 100;
    var price = car.price;

    var residual = price * (opts.residualPct[term] != null ? opts.residualPct[term] : 0.25);
    var downPayment = price * downPct;
    var financed = price - downPayment - residual;          // residual deferred
    var markup = (price - downPayment) * opts.annualProfitRate * (term / 12);

    var monthlyFinance = (financed + markup) / term;
    var monthlyOperating = operatingPerMonth(price, opts);
    var beforeVat = monthlyFinance + monthlyOperating;
    var vat = beforeVat * opts.vatRate;
    var monthly = beforeVat + vat;

    return {
      product: 'Flexi Lease',
      car: car.model,
      carId: car.id,
      price: round(price),
      term: term,
      downPaymentPct: round(downPct * 100),
      downPayment: round(downPayment),
      financed: round(financed),
      markup: round(markup),
      monthlyFinance: round(monthlyFinance),
      monthlyOperating: round(monthlyOperating),
      monthlyVat: round(vat),
      monthly: round(monthly),
      buyout: round(residual),
      totalPayable: round(downPayment + monthly * term),
      ownsAtEnd: false
    };
  }

  function operatingPerMonth(price, opts) {
    var annual = price * opts.insurancePctOfValue
      + opts.annualMaintenance
      + opts.annualRegistration;
    return annual / 12;
  }

  // Internal monthly cost floor for a unit (not shown to customer).
  function costFloor(car, opts) {
    opts = assign({}, DEFAULTS, opts || {});
    var bank = car.bankInstalment || 0;
    return round(bank + operatingPerMonth(car.price, opts));
  }

  // Margin of a quote over the internal cost floor.
  function margin(quote, car, opts) {
    return round(quote.monthly - costFloor(car, opts));
  }

  function quote(car, opts) {
    opts = opts || {};
    var product = opts.product || 'lease-to-own';
    return product === 'flexi' ? flexiLease(car, opts) : leaseToOwn(car, opts);
  }

  // Tiny Object.assign shim (older browsers).
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  return {
    DEFAULTS: DEFAULTS,
    TERMS: TERMS,
    leaseToOwn: leaseToOwn,
    flexiLease: flexiLease,
    quote: quote,
    costFloor: costFloor,
    margin: margin
  };
});
