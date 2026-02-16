const { getDatabase } = require('../config/database');
const { eurosToCents, calculateFromBruttoCents } = require('../utils/vatCalculations');

function validateCSV(req, res) {
  if (!req.body || !req.body.rows) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const { rows, mapping } = req.body;
  const errors = [];
  const preview = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const entry = {};
    const rowErrors = [];

    entry.date = row[mapping.date];
    entry.transaction_type = row[mapping.transaction_type];
    entry.category_name = row[mapping.category];
    entry.description = row[mapping.description];
    entry.gross_amount = parseFloat(String(row[mapping.gross_amount]).replace(',', '.'));
    entry.vat_rate = parseInt(row[mapping.vat_rate]) || 0;
    entry.invoice_number = mapping.invoice_number != null ? row[mapping.invoice_number] : null;

    if (!entry.date) rowErrors.push('Datum fehlt');
    if (!['income', 'expense', 'Einnahme', 'Ausgabe'].includes(entry.transaction_type)) rowErrors.push('Ungültiger Typ');
    if (!entry.description) rowErrors.push('Beschreibung fehlt');
    if (isNaN(entry.gross_amount) || entry.gross_amount <= 0) rowErrors.push('Ungültiger Betrag');
    if (![0, 7, 19].includes(entry.vat_rate)) rowErrors.push('Ungültiger USt-Satz');

    // Normalize type
    if (entry.transaction_type === 'Einnahme') entry.transaction_type = 'income';
    if (entry.transaction_type === 'Ausgabe') entry.transaction_type = 'expense';

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    }
    preview.push(entry);
  }

  res.json({ valid: errors.length === 0, errors, preview, totalRows: rows.length });
}

function importCSV(req, res) {
  const db = getDatabase();
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'No rows provided' });
  }

  // Look up categories by name
  const categories = db.prepare('SELECT id, name, type FROM categories').all();
  const categoryMap = {};
  for (const cat of categories) {
    categoryMap[cat.name.toLowerCase()] = cat;
  }

  const insertStmt = db.prepare(`
    INSERT INTO transactions (date, transaction_type, category_id, description, gross_amount_cents, vat_rate, net_amount_cents, vat_amount_cents, invoice_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  const importAll = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Find category
        const cat = categoryMap[(row.category_name || '').toLowerCase()];
        if (!cat) {
          errors.push({ row: i + 1, error: `Kategorie nicht gefunden: ${row.category_name}` });
          skipped++;
          continue;
        }

        const grossCents = eurosToCents(row.gross_amount);
        const { netCents, vatCents } = calculateFromBruttoCents(grossCents, row.vat_rate);
        const now = new Date().toISOString();

        insertStmt.run(
          row.date, row.transaction_type, cat.id, row.description,
          grossCents, row.vat_rate, netCents, vatCents,
          row.invoice_number || null, now, now
        );
        imported++;
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
        skipped++;
      }
    }
  });

  try {
    importAll();
    res.json({ imported, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
}

module.exports = { validateCSV, importCSV };
