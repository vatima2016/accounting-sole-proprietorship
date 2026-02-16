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
    if (row.vat_rate === 19) {
      kz.kz81_net = centsToEuros(row.total_net_cents);
      kz.kz81_vat = centsToEuros(row.total_vat_cents);
    } else if (row.vat_rate === 7) {
      kz.kz86_net = centsToEuros(row.total_net_cents);
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

module.exports = { generateVATReport, generateYearlyReport };
