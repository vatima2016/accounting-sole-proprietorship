function calculateFromBruttoCents(grossCents, vatRate) {
  if (vatRate === 0) {
    return { netCents: grossCents, vatCents: 0 };
  }
  const netCents = Math.round(grossCents / (1 + vatRate / 100));
  const vatCents = grossCents - netCents;
  return { netCents, vatCents };
}

function centsToEuros(cents) {
  return cents / 100;
}

function eurosToCents(euros) {
  return Math.round(euros * 100);
}

module.exports = { calculateFromBruttoCents, centsToEuros, eurosToCents };
