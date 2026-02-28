const { getDatabase } = require('../config/database');
const { centsToEuros } = require('../utils/vatCalculations');
const { getPeriodDates } = require('./totalsCalculator');

function generateVATReport(year, quarter) {
  const db = getDatabase();
  const { start, end } = getPeriodDates('quarter', year, null, quarter);

  // Income by VAT rate
  const incomeRows = db.prepare(`
    SELECT vat_rate,
      SUM(net_amount_cents) as total_net_cents,
      SUM(vat_amount_cents) as total_vat_cents
    FROM transactions
    WHERE transaction_type = 'income' AND date >= ? AND date <= ?
    GROUP BY vat_rate
  `).all(start, end);

  // Expense VAT (Vorsteuer)
  const expenseRows = db.prepare(`
    SELECT SUM(vat_amount_cents) as total_vat_cents
    FROM transactions
    WHERE transaction_type = 'expense' AND date >= ? AND date <= ? AND vat_rate > 0
  `).get(start, end);

  // Kennzahlen for USt-Voranmeldung
  const kz = {
    // Kz 81: Steuerpflichtige Umsätze 19%
    kz81_net: 0, kz81_vat: 0,
    // Kz 86: Steuerpflichtige Umsätze 7%
    kz86_net: 0, kz86_vat: 0,
    // Kz 41: Steuerfreie Umsätze (innergemeinschaftlich) - not applicable here
    kz41_net: 0,
    // Kz 66: Vorsteuer
    kz66_vat: 0,
    // Kz 83: Verbleibende USt-Vorauszahlung
    kz83_vat: 0,
  };

  for (const row of incomeRows) {
    if (row.vat_rate === 19 || row.vat_rate === 16) {
      kz.kz81_net = Math.floor(centsToEuros(row.total_net_cents));
      kz.kz81_net_exact = centsToEuros(row.total_net_cents);
      kz.kz81_vat = centsToEuros(row.total_vat_cents);
    } else if (row.vat_rate === 7 || row.vat_rate === 5) {
      kz.kz86_net = Math.floor(centsToEuros(row.total_net_cents));
      kz.kz86_net_exact = centsToEuros(row.total_net_cents);
      kz.kz86_vat = centsToEuros(row.total_vat_cents);
    } else if (row.vat_rate === 0) {
      kz.kz41_net = centsToEuros(row.total_net_cents);
    }
  }

  kz.kz66_vat = centsToEuros(expenseRows?.total_vat_cents || 0);
  // Kz 83 = Output VAT - Input VAT
  kz.kz83_vat = Math.round((kz.kz81_vat + kz.kz86_vat - kz.kz66_vat) * 100) / 100;

  return {
    year: Number(year),
    quarter: Number(quarter),
    period: { start, end },
    kennzahlen: kz,
  };
}

function generateYearlyReport(year) {
  const db = getDatabase();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const rows = db.prepare(`
    SELECT c.name as category_name, c.type as category_type,
      SUM(t.gross_amount_cents) as total_gross_cents,
      SUM(t.net_amount_cents) as total_net_cents,
      SUM(t.vat_amount_cents) as total_vat_cents,
      COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
    GROUP BY t.category_id
    ORDER BY c.type, c.sort_order
  `).all(start, end);

  const income = [];
  const expenses = [];
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const row of rows) {
    const entry = {
      category: row.category_name,
      gross: centsToEuros(row.total_gross_cents),
      net: centsToEuros(row.total_net_cents),
      vat: centsToEuros(row.total_vat_cents),
      count: row.count,
    };
    if (row.category_type === 'income') {
      income.push(entry);
      totalIncome += row.total_gross_cents;
    } else {
      expenses.push(entry);
      totalExpenses += row.total_gross_cents;
    }
  }

  return {
    year: Number(year),
    income,
    expenses,
    totalIncome: centsToEuros(totalIncome),
    totalExpenses: centsToEuros(totalExpenses),
    profit: centsToEuros(totalIncome - totalExpenses),
  };
}

function generateYearlySummaries(startYear) {
  const db = getDatabase();
  const currentYear = new Date().getFullYear();

  const rows = db.prepare(`
    SELECT
      CAST(substr(date, 1, 4) AS INTEGER) as year,
      transaction_type,
      SUM(gross_amount_cents) as total_cents,
      COUNT(*) as count
    FROM transactions
    WHERE date >= ?
    GROUP BY year, transaction_type
    ORDER BY year
  `).all(`${startYear}-01-01`);

  const byYear = {};
  for (const row of rows) {
    if (!byYear[row.year]) byYear[row.year] = { income: 0, expenses: 0, count: 0 };
    if (row.transaction_type === 'income') byYear[row.year].income = row.total_cents;
    else byYear[row.year].expenses = row.total_cents;
    byYear[row.year].count += row.count;
  }

  const result = [];
  for (let y = startYear; y <= currentYear; y++) {
    const d = byYear[y] || { income: 0, expenses: 0, count: 0 };
    result.push({
      year: y,
      income: centsToEuros(d.income),
      expenses: centsToEuros(d.expenses),
      profit: centsToEuros(d.income - d.expenses),
      count: d.count,
    });
  }
  return result;
}

module.exports = { generateVATReport, generateYearlyReport, generateYearlySummaries };
