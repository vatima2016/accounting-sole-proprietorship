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
    if (![0, 5, 7, 16, 19].includes(entry.vat_rate)) rowErrors.push('Ungültiger USt-Satz');

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

// --- EasyCash&Tax Import ---

function parseGermanDate(dateStr) {
  const parts = (dateStr || '').trim().split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseEasyCashTaxRows(rows, fileType) {
  const parsed = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = [];

    const date = parseGermanDate(row['Datum']);
    if (!date) rowErrors.push('Ungültiges Datum');

    let description = (row['Beschreibung'] || '').trim();
    if (!description) rowErrors.push('Beschreibung fehlt');

    let grossAmount = parseFloat((row['Betrag'] || '').trim());
    // If Betrag is empty, try to extract amount from Beschreibung (e.g. "URV 141,61")
    if (isNaN(grossAmount) || grossAmount <= 0) {
      const match = description.match(/^(URV)\s+([\d.,]+)/i);
      if (match) {
        grossAmount = parseFloat(match[2].replace(',', '.'));
        description = match[1];
      }
    }
    if (isNaN(grossAmount) || grossAmount <= 0) rowErrors.push('Ungültiger Betrag');

    const categoryName = (row['Konto'] || '').trim();
    if (!categoryName) rowErrors.push('Konto/Kategorie fehlt');

    const invoiceNumber = (row['Belegnummer'] || '').trim() || null;

    // Both file types store the VAT rate as an integer (0, 7, 19)
    // Expenses use "MWSt-Satz", Income uses "MWSt-Betrag" (misleading name, but same semantics)
    const vatField = fileType === 'expense' ? row['MWSt-Satz'] : row['MWSt-Betrag'];
    const vatRate = parseInt((vatField || '0').toString().trim()) || 0;
    if (![0, 5, 7, 16, 19].includes(vatRate)) rowErrors.push('Ungültiger USt-Satz: ' + vatField);

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    }

    parsed.push({
      date,
      transaction_type: fileType,
      category_name: categoryName,
      description,
      gross_amount: grossAmount,
      vat_rate: vatRate,
      invoice_number: invoiceNumber,
    });
  }

  return { parsed, errors };
}

function validateEasyCashTax(req, res) {
  const { rows, fileType } = req.body;
  if (!rows || !Array.isArray(rows) || !fileType) {
    return res.status(400).json({ error: 'rows und fileType erforderlich' });
  }

  const { parsed, errors } = parseEasyCashTaxRows(rows, fileType);

  // Duplicate detection
  const db = getDatabase();
  const dupStmt = db.prepare(
    'SELECT id FROM transactions WHERE date = ? AND gross_amount_cents = ? AND description = ?'
  );

  const duplicates = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (!entry.date || isNaN(entry.gross_amount)) continue;
    const grossCents = eurosToCents(entry.gross_amount);
    const existing = dupStmt.get(entry.date, grossCents, entry.description);
    if (existing) {
      duplicates.push({ row: i + 1, existingId: existing.id });
    }
  }

  // Look up categories with fuzzy matching for unmatched ones
  const categories = db.prepare('SELECT id, name, type FROM categories').all();
  const catNames = new Set(categories.map(c => c.name.toLowerCase()));

  function fuzzyMatchCategory(name) {
    const lower = name.toLowerCase();
    // Check if CSV name is a prefix of or contained in a DB category (or vice versa)
    let bestMatch = null;
    let bestScore = 0;
    for (const cat of categories) {
      const catLower = cat.name.toLowerCase();
      if (catLower.startsWith(lower) || lower.startsWith(catLower)) {
        const score = Math.min(lower.length, catLower.length) / Math.max(lower.length, catLower.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = cat.name;
        }
      }
    }
    return bestScore > 0.4 ? bestMatch : null;
  }

  const missingCategories = [];
  const seenMissing = new Set();
  for (let i = 0; i < parsed.length; i++) {
    const catName = parsed[i].category_name;
    if (!catName || catNames.has(catName.toLowerCase())) continue;
    if (seenMissing.has(catName.toLowerCase())) {
      missingCategories.push({ row: i + 1, category: catName });
      continue;
    }
    seenMissing.add(catName.toLowerCase());
    const suggestion = fuzzyMatchCategory(catName);
    missingCategories.push({ row: i + 1, category: catName, suggestion });
  }

  res.json({
    preview: parsed,
    duplicates,
    missingCategories,
    errors,
    totalRows: rows.length,
    valid: errors.length === 0,
  });
}

function importEasyCashTax(req, res) {
  const { rows, fileType, excludeRows, overwriteDuplicates, categoryMappings } = req.body;
  if (!rows || !Array.isArray(rows) || !fileType) {
    return res.status(400).json({ error: 'rows und fileType erforderlich' });
  }

  const excludeSet = new Set(excludeRows || []);
  const mappings = categoryMappings || {}; // csvName → dbName or "__create__"
  const { parsed, errors: parseErrors } = parseEasyCashTaxRows(rows, fileType);

  const db = getDatabase();

  // Create new categories if requested
  const insertCatStmt = db.prepare(
    'INSERT INTO categories (name, type, description, sort_order, is_active) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM categories), 1)'
  );
  for (const [csvName, action] of Object.entries(mappings)) {
    if (action === '__create__') {
      const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(csvName);
      if (!existing) {
        insertCatStmt.run(csvName, fileType === 'income' ? 'income' : 'expense', '');
      }
    }
  }

  const categories = db.prepare('SELECT id, name FROM categories').all();
  const categoryMap = {};
  for (const cat of categories) {
    categoryMap[cat.name.toLowerCase()] = cat;
  }

  const dupStmt = db.prepare(
    'SELECT id FROM transactions WHERE date = ? AND gross_amount_cents = ? AND description = ?'
  );
  const deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO transactions (date, transaction_type, category_id, description, gross_amount_cents, vat_rate, net_amount_cents, vat_amount_cents, invoice_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let overwritten = 0;
  let skipped = 0;
  const errors = [];

  const importAll = db.transaction(() => {
    for (let i = 0; i < parsed.length; i++) {
      if (excludeSet.has(i + 1)) {
        skipped++;
        continue;
      }

      const entry = parsed[i];

      // Skip rows with parse errors
      if (parseErrors.some(e => e.row === i + 1)) {
        errors.push({ row: i + 1, error: 'Parsing-Fehler' });
        skipped++;
        continue;
      }

      try {
        // Resolve category: check mapping first, then direct match
        const resolvedName = mappings[entry.category_name] && mappings[entry.category_name] !== '__create__'
          ? mappings[entry.category_name]
          : entry.category_name;
        const cat = categoryMap[(resolvedName || '').toLowerCase()];
        if (!cat) {
          errors.push({ row: i + 1, error: `Kategorie nicht gefunden: ${entry.category_name}` });
          skipped++;
          continue;
        }

        const grossCents = eurosToCents(entry.gross_amount);
        const { netCents, vatCents } = calculateFromBruttoCents(grossCents, entry.vat_rate);
        const now = new Date().toISOString();

        // Check for duplicate and overwrite if requested
        const existing = dupStmt.get(entry.date, grossCents, entry.description);
        if (existing) {
          if (overwriteDuplicates) {
            deleteStmt.run(existing.id);
            overwritten++;
          } else {
            skipped++;
            continue;
          }
        }

        insertStmt.run(
          entry.date, entry.transaction_type, cat.id, entry.description,
          grossCents, entry.vat_rate, netCents, vatCents,
          entry.invoice_number, now, now
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
    res.json({ imported, overwritten, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message });
  }
}

module.exports = { validateCSV, importCSV, validateEasyCashTax, importEasyCashTax };
