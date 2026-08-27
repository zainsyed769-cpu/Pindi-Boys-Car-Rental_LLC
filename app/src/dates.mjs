/** All dates are ISO 'YYYY-MM-DD' strings. Days are counted inclusive of both ends. */
export const DAY_MS = 86400000;

export const iso = (d) => new Date(d).toISOString().slice(0, 10);
export const today = () => iso(new Date());

export const daysBetween = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;

/**
 * Days of [aStart,aEnd] that fall inside [bStart,bEnd]. Used for utilisation:
 * a rental spanning a month boundary must only count its days inside the period.
 */
export function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(Date.parse(aStart), Date.parse(bStart));
  const end = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  if (end < start) return 0;
  return Math.round((end - start) / DAY_MS) + 1;
}

export const addDays = (d, n) => iso(new Date(Date.parse(d) + n * DAY_MS));
