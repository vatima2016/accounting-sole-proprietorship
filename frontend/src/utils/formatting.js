const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

export function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

export function getPeriodName(period) {
  const labels = {
    month: 'Monat',
    quarter: 'Quartal',
    year: 'Jahr',
  };
  return labels[period] || period;
}

const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function getMonthName(month) {
  return monthNames[month - 1] || '';
}

export function getQuarterLabel(quarter) {
  return `Q${quarter}`;
}
