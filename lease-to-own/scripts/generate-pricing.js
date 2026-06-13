#!/usr/bin/env node
/*
 * Generates the internal Lease-to-Own pricing sheet (CSV) for the whole fleet.
 *
 *   node lease-to-own/scripts/generate-pricing.js
 *
 * Output: lease-to-own/data/pricing-sheet.csv
 *
 * The sheet lists, for every model and every term, the customer monthly for
 * both products, the buyout, and the internal margin over the cost floor.
 */
const fs = require('fs');
const path = require('path');

const cars = require('../data/cars.js');
const LTO = require('../model/pricing.js');

const DOWN_PCT = 10; // default scenario shown in the sheet

const rows = [];
rows.push([
  'Model', 'Category', 'Year', 'Est. Value (AED)', 'Term (mo)',
  'Down 10% (AED)',
  'LTO Monthly (AED)', 'LTO Total (AED)', 'LTO Margin/mo (AED)',
  'Flexi Monthly (AED)', 'Flexi Buyout (AED)', 'Flexi Margin/mo (AED)',
  'Cost Floor/mo (AED)'
].join(','));

cars.forEach((car) => {
  LTO.TERMS.forEach((term) => {
    const lto = LTO.leaseToOwn(car, { term, downPaymentPct: DOWN_PCT });
    const flexi = LTO.flexiLease(car, { term, downPaymentPct: DOWN_PCT });
    rows.push([
      car.model, car.category, car.year, car.price, term,
      lto.downPayment,
      lto.monthly, lto.totalPayable, LTO.margin(lto, car),
      flexi.monthly, flexi.buyout, LTO.margin(flexi, car),
      LTO.costFloor(car)
    ].join(','));
  });
});

const out = path.join(__dirname, '..', 'data', 'pricing-sheet.csv');
fs.writeFileSync(out, rows.join('\n') + '\n');
console.log('Wrote ' + (rows.length - 1) + ' rows to ' + path.relative(process.cwd(), out));

// Quick summary to stdout
console.log('\nSample (36-month Lease-to-Own, 10% down):');
console.log('Model'.padEnd(28), 'Monthly'.padStart(9), 'Total'.padStart(10), 'Margin/mo'.padStart(10));
cars.forEach((car) => {
  const q = LTO.leaseToOwn(car, { term: 36, downPaymentPct: DOWN_PCT });
  console.log(
    car.model.padEnd(28),
    String(q.monthly).padStart(9),
    String(q.totalPayable).padStart(10),
    String(LTO.margin(q, car)).padStart(10)
  );
});
