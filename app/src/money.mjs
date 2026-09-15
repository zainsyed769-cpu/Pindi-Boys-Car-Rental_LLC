/**
 * Money is held as integer fils (1 AED = 100 fils) everywhere in the database.
 * Floats are never used for amounts — 0.1 + 0.2 must not decide what a customer owes.
 */
export const toFils = (aed) => Math.round(Number(aed ?? 0) * 100);
export const toAed = (fils) => (Number(fils ?? 0) / 100);

export const formatAed = (fils) =>
  toAed(fils).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** UAE standard-rate VAT. Confirm any non-standard treatment with the tax accountant. */
export const VAT_RATE = 0.05;
export const vatOn = (netFils) => Math.round(netFils * VAT_RATE);
/** Split a VAT-inclusive amount into net + VAT. */
export const fromGross = (grossFils) => {
  const net = Math.round(grossFils / (1 + VAT_RATE));
  return { net, vat: grossFils - net };
};
