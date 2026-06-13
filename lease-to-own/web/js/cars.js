/* AUTO-GENERATED from ../../data/cars.js by scripts/build-web.js — do not edit. */
/*
 * Prime Hire Car Rental — Fleet master data for the Lease-to-Own program.
 *
 * `price` is the estimated UAE on-road value (AED) used as the lease-to-own
 * acquisition base. These are working estimates per model/year — update them
 * with the real invoice / current market value before quoting a customer.
 *
 * `bankInstalment` is the monthly bank financing cost for that unit; it is the
 * internal cost floor and is NOT shown to customers.
 *
 * Categories drive the marketing grouping on the website.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PRIME_CARS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var cars = [
    // --- Economy sedans & hatchbacks ---
    { id: 'mg3',        model: 'MG MG3',            category: 'Economy',  year: 2025, seats: 5, price: 58000,  bankInstalment: 1003, units: 4 },
    { id: 'suzuki-dzire', model: 'Suzuki Dzire',    category: 'Economy',  year: 2024, seats: 5, price: 55000,  bankInstalment: 1003, units: 1 },
    { id: 'suzuki-baleno', model: 'Suzuki Baleno',  category: 'Economy',  year: 2025, seats: 5, price: 58000,  bankInstalment: 1003, units: 1 },
    { id: 'suzuki-ciaz', model: 'Suzuki Ciaz',      category: 'Economy',  year: 2024, seats: 5, price: 62000,  bankInstalment: 1003, units: 1 },
    { id: 'mg5',        model: 'MG MG5',            category: 'Economy',  year: 2024, seats: 5, price: 70000,  bankInstalment: 1403, units: 3 },

    // --- Compact SUV / crossover ---
    { id: 'jac-s3',     model: 'JAC S3',            category: 'Compact SUV', year: 2024, seats: 5, price: 65000, bankInstalment: 1136, units: 3 },
    { id: 'jac-js4',    model: 'JAC JS4',           category: 'Compact SUV', year: 2024, seats: 5, price: 75000, bankInstalment: 1185, units: 3 },
    { id: 'jac-js6',    model: 'JAC JS6',           category: 'Compact SUV', year: 2024, seats: 7, price: 85000, bankInstalment: 1185, units: 1 },
    { id: 'jac-j7',     model: 'JAC J7',            category: 'Compact SUV', year: 2024, seats: 5, price: 70000, bankInstalment: 1072, units: 4 },
    { id: 'toyota-raize', model: 'Toyota Raize',    category: 'Compact SUV', year: 2024, seats: 5, price: 75000, bankInstalment: 1444, units: 1 },
    { id: 'toyota-rush', model: 'Toyota Rush',      category: 'Compact SUV', year: 2024, seats: 7, price: 95000, bankInstalment: 1606, units: 1 },
    { id: 'mg-zs',      model: 'MG ZS',             category: 'Compact SUV', year: 2024, seats: 5, price: 75000, bankInstalment: 1403, units: 2 },
    { id: 'mg-gt',      model: 'MG GT',             category: 'Compact SUV', year: 2024, seats: 5, price: 80000, bankInstalment: 1403, units: 1 },

    // --- Family MPV / mid SUV ---
    { id: 'suzuki-ertiga', model: 'Suzuki Ertiga',  category: 'Family MPV', year: 2025, seats: 7, price: 72000, bankInstalment: 1003, units: 2 },
    { id: 'mitsubishi-xpander', model: 'Mitsubishi Xpander', category: 'Family MPV', year: 2024, seats: 7, price: 80000, bankInstalment: 1185, units: 1 },
    { id: 'toyota-veloz', model: 'Toyota Veloz',    category: 'Family MPV', year: 2024, seats: 7, price: 90000, bankInstalment: 1606, units: 1 },
    { id: 'ford-territory', model: 'Ford Territory', category: 'Family MPV', year: 2025, seats: 5, price: 95000, bankInstalment: 2008, units: 1 },
    { id: 'mg-whale',   model: 'MG Whale',          category: 'Family MPV', year: 2024, seats: 5, price: 90000, bankInstalment: 1635, units: 1 },
    { id: 'nissan-xterra', model: 'Nissan Xterra',  category: 'Family MPV', year: 2025, seats: 7, price: 110000, bankInstalment: 2008, units: 2 },
    { id: 'kia-sportage', model: 'Kia Sportage',    category: 'Family MPV', year: 2025, seats: 5, price: 110000, bankInstalment: 1481, units: 1 },
    { id: 'exeed-lx',   model: 'Exeed LX',          category: 'Family MPV', year: 2025, seats: 5, price: 115000, bankInstalment: 1803, units: 1 },
    { id: 'chevrolet-blazer', model: 'Chevrolet Blazer', category: 'Family MPV', year: 2021, seats: 5, price: 95000, bankInstalment: 2513, units: 1 },

    // --- Premium / large SUV / luxury ---
    { id: 'toyota-fortuner', model: 'Toyota Fortuner', category: 'Premium', year: 2024, seats: 7, price: 165000, bankInstalment: 2741, units: 1 },
    { id: 'toyota-highlander', model: 'Toyota Highlander VXR', category: 'Premium', year: 2023, seats: 7, price: 170000, bankInstalment: 2632, units: 1 },
    { id: 'nissan-patrol', model: 'Nissan Patrol',  category: 'Premium', year: 2023, seats: 8, price: 280000, bankInstalment: 5901, units: 1 },
    { id: 'nissan-patrol-le', model: 'Nissan Patrol LE Platinum City', category: 'Premium', year: 2025, seats: 8, price: 330000, bankInstalment: 3039, units: 3 },
    { id: 'cadillac-ct4', model: 'Cadillac CT4',    category: 'Premium', year: 2021, seats: 5, price: 130000, bankInstalment: 2021, units: 1 },
    { id: 'lexus-es300h', model: 'Lexus ES 300H',   category: 'Premium', year: 2023, seats: 5, price: 190000, bankInstalment: 2008, units: 1 },
    { id: 'mercedes-vito', model: 'Mercedes Vito 116 CDI', category: 'Premium', year: 2023, seats: 8, price: 150000, bankInstalment: 1791, units: 1 },
    { id: 'mg-rx9',     model: 'MG RX9',            category: 'Premium', year: 2025, seats: 7, price: 135000, bankInstalment: 1609, units: 1 },
    { id: 'audi-a3',    model: 'Audi A3',           category: 'Premium', year: 2025, seats: 5, price: 150000, bankInstalment: 2418, units: 1 }
  ];

  return cars;
});
