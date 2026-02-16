const { getDatabase } = require('../config/database');
const { centsToEuros } = require('../utils/vatCalculations');

function exportTransactionsCSV(params = {}) {
  const db = getDatabase();
  const { start_date, end_date, type } = params;

  let where = [];
  let bindings = [];
  if (start_date) { where.push('t.date >= ?'); bindings.push(start_date); }
  if (end_date) { where.push('t.date <= ?'); bindings.push(end_date); }
  if (type) { where.push('t.transaction_type = ?'); bindings.push(type); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT t.*, c.name as category_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY t.date, t.id
  `).all(...bindings);

  const BOM = '\uFEFF';
  const header = ['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Brutto', 'USt%', 'Netto', 'USt', 'Rechnungsnr.'].join(';');

  const csvRows = rows.map(r => [
    r.date,
    r.transaction_type === 'income' ? 'Einnahme' : 'Ausgabe',
    r.category_name,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    centsToEuros(r.gross_amount_cents).toFixed(2).replace('.', ','),
    r.vat_rate,
    centsToEuros(r.net_amount_cents).toFixed(2).replace('.', ','),
    centsToEuros(r.vat_amount_cents).toFixed(2).replace('.', ','),
    r.invoice_number || '',
  ].join(';'));

  return BOM + header + '\n' + csvRows.join('\n');
}

module.exports = { exportTransactionsCSV };
