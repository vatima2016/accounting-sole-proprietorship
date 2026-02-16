const { getDatabase } = require('../config/database');
const { centsToEuros } = require('../utils/vatCalculations');

function getPeriodDates(period, year, month, quarter) {
  const y = Number(year) || new Date().getFullYear();

  if (period === 'month') {
    const m = Number(month) || (new Date().getMonth() + 1);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  if (period === 'quarter') {
    const q = Number(quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const start = `${y}-${String(startMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(y, endMonth, 0).getDate();
    const end = `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  // year
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function calculateTotals(params) {
  const db = getDatabase();
  const { period = 'quarter', year, month, quarter } = params;
  const { start, end } = getPeriodDates(period, year, month, quarter);

  const rows = db.prepare(`
    SELECT
      transaction_type,
      vat_rate,
      SUM(gross_amount_cents) as total_gross_cents,
      SUM(net_amount_cents) as total_net_cents,
      SUM(vat_amount_cents) as total_vat_cents,
      COUNT(*) as count
    FROM transactions
    WHERE date >= ? AND date <= ?
    GROUP BY transaction_type, vat_rate
  `).all(start, end);

  let income = { gross: 0, net: 0, vat: 0, count: 0, byVatRate: {} };
  let expenses = { gross: 0, net: 0, vat: 0, count: 0, byVatRate: {} };

  for (const row of rows) {
    const target = row.transaction_type === 'income' ? income : expenses;
    target.gross += row.total_gross_cents;
    target.net += row.total_net_cents;
    target.vat += row.total_vat_cents;
    target.count += row.count;
    target.byVatRate[row.vat_rate] = {
      gross: centsToEuros(row.total_gross_cents),
      net: centsToEuros(row.total_net_cents),
      vat: centsToEuros(row.total_vat_cents),
      count: row.count,
    };
  }

  return {
    period: { type: period, start, end },
    income: {
      gross: centsToEuros(income.gross),
      net: centsToEuros(income.net),
      vat: centsToEuros(income.vat),
      count: income.count,
      byVatRate: income.byVatRate,
    },
    expenses: {
      gross: centsToEuros(expenses.gross),
      net: centsToEuros(expenses.net),
      vat: centsToEuros(expenses.vat),
      count: expenses.count,
      byVatRate: expenses.byVatRate,
    },
    profit: centsToEuros(income.gross - expenses.gross),
    vatLiability: centsToEuros(income.vat - expenses.vat),
  };
}

module.exports = { calculateTotals, getPeriodDates };
