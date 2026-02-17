export function getPeriodDates({ period, year, month, quarter }) {
  const y = Number(year);

  if (period === 'month') {
    const m = Number(month);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  if (period === 'quarter') {
    const q = Number(quarter);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const start = `${y}-${String(startMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(y, endMonth, 0).getDate();
    const end = `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  return { start: `${y}-01-01`, end: `${y}-12-31` };
}
