const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { runMigrations, runSeeds } = require('./config/database');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const descriptionsRouter = require('./routes/descriptions');
const totalsRouter = require('./routes/totals');
const reportsRouter = require('./routes/reports');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Auto-initialize database on first start
runMigrations();
runSeeds();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/descriptions', descriptionsRouter);
app.use('/api/totals', totalsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import', importRouter);

// --- Backup path helpers ---
function getBackupPath() {
  const { getDatabase } = require('./config/database');
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'backup_path'").get();
  const raw = row?.value || process.env.GOOGLE_DRIVE_BACKUP_PATH || '';
  return raw.replace(/^~/, require('os').homedir());
}

// Backup path settings
app.get('/api/settings/backup-path', (req, res) => {
  const { getDatabase } = require('./config/database');
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'backup_path'").get();
  res.json({ path: row?.value || process.env.GOOGLE_DRIVE_BACKUP_PATH || '' });
});

app.put('/api/settings/backup-path', (req, res) => {
  const { getDatabase } = require('./config/database');
  const db = getDatabase();
  const { path: newPath } = req.body;
  if (!newPath) return res.status(400).json({ error: 'Pfad erforderlich' });
  const now = new Date().toISOString();
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('backup_path', ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?")
    .run(newPath, now, newPath, now);
  res.json({ success: true, path: newPath });
});

// List backup files
app.get('/api/backup/files', (req, res) => {
  try {
    const fs = require('fs');
    const resolvedPath = getBackupPath();
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.json({ files: [], path: resolvedPath });
    }
    const files = fs.readdirSync(resolvedPath)
      .filter(f => f.endsWith('.json') && f.startsWith('backup_'))
      .sort()
      .reverse();
    res.json({ files, path: resolvedPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database file copy to backup folder
app.post('/api/backup/db-copy', async (req, res) => {
  try {
    const fs = require('fs');
    const { getDatabase } = require('./config/database');
    const db = getDatabase();

    const resolvedPath = getBackupPath();
    if (!resolvedPath) return res.status(500).json({ error: 'Backup-Pfad nicht konfiguriert' });
    if (!fs.existsSync(resolvedPath)) fs.mkdirSync(resolvedPath, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `buchhaltung_${timestamp}.db`;
    const destFile = path.join(resolvedPath, filename);

    await db.backup(destFile);
    res.json({ success: true, path: destFile, filename });
  } catch (err) {
    console.error('DB copy error:', err);
    res.status(500).json({ error: 'Datenbank-Kopie fehlgeschlagen: ' + err.message });
  }
});

// Categories export - save to backup folder
app.post('/api/backup/categories-export', (req, res) => {
  try {
    const fs = require('fs');
    const { getDatabase } = require('./config/database');
    const db = getDatabase();

    const resolvedPath = getBackupPath();
    if (!resolvedPath) return res.status(500).json({ error: 'Backup-Pfad nicht konfiguriert' });
    if (!fs.existsSync(resolvedPath)) fs.mkdirSync(resolvedPath, { recursive: true });

    const categories = db.prepare('SELECT * FROM categories ORDER BY type, sort_order, name').all();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const data = { version: 1, created_at: new Date().toISOString(), categories };
    const filename = `categories_${timestamp}.json`;
    const destFile = path.join(resolvedPath, filename);
    fs.writeFileSync(destFile, JSON.stringify(data, null, 2), 'utf-8');

    res.json({ success: true, path: destFile, count: categories.length });
  } catch (err) {
    console.error('Categories export error:', err);
    res.status(500).json({ error: 'Kategorien-Export fehlgeschlagen: ' + err.message });
  }
});

// Categories export - browser download
app.get('/api/backup/categories-download', (req, res) => {
  try {
    const { getDatabase } = require('./config/database');
    const db = getDatabase();

    const categories = db.prepare('SELECT * FROM categories ORDER BY type, sort_order, name').all();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const data = { version: 1, created_at: new Date().toISOString(), categories };
    const filename = `categories_${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(data);
  } catch (err) {
    console.error('Categories download error:', err);
    res.status(500).json({ error: 'Kategorien-Download fehlgeschlagen: ' + err.message });
  }
});

// Backup export endpoint - save JSON to Google Drive
app.post('/api/backup/export', (req, res) => {
  try {
    const fs = require('fs');
    const { getDatabase } = require('./config/database');
    const db = getDatabase();
    const yearParam = req.body.year;

    const resolvedPath = getBackupPath();
    if (!resolvedPath) return res.status(500).json({ error: 'Backup-Pfad nicht konfiguriert' });
    if (!fs.existsSync(resolvedPath)) fs.mkdirSync(resolvedPath, { recursive: true });

    const categories = db.prepare('SELECT * FROM categories').all();

    let transactions;
    if (yearParam && yearParam !== 'all') {
      const year = Number(yearParam);
      transactions = db.prepare(
        'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date, id'
      ).all(`${year}-01-01`, `${year}-12-31`);
    } else {
      transactions = db.prepare('SELECT * FROM transactions ORDER BY date, id').all();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup = {
      version: 1,
      created_at: new Date().toISOString(),
      year: yearParam === 'all' ? 'all' : Number(yearParam) || 'all',
      categories,
      transactions,
    };

    const yearLabel = yearParam && yearParam !== 'all' ? yearParam : 'all';
    const filename = `backup_${yearLabel}_${timestamp}.json`;
    const destFile = path.join(resolvedPath, filename);
    fs.writeFileSync(destFile, JSON.stringify(backup, null, 2), 'utf-8');

    res.json({ success: true, path: destFile, transactions: transactions.length });
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Backup export failed: ' + err.message });
  }
});

// Backup download endpoint - JSON file download to browser
app.get('/api/backup/download', (req, res) => {
  try {
    const { getDatabase } = require('./config/database');
    const db = getDatabase();
    const yearParam = req.query.year;

    const categories = db.prepare('SELECT * FROM categories').all();

    let transactions;
    if (yearParam && yearParam !== 'all') {
      const year = Number(yearParam);
      transactions = db.prepare(
        'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date, id'
      ).all(`${year}-01-01`, `${year}-12-31`);
    } else {
      transactions = db.prepare('SELECT * FROM transactions ORDER BY date, id').all();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup = {
      version: 1,
      created_at: new Date().toISOString(),
      year: yearParam === 'all' ? 'all' : Number(yearParam) || 'all',
      categories,
      transactions,
    };

    const yearLabel = yearParam && yearParam !== 'all' ? yearParam : 'all';
    const filename = `backup_${yearLabel}_${timestamp}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(backup);
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Backup download failed: ' + err.message });
  }
});

// Shared backup import logic
function importBackupData(backup) {
  const { getDatabase } = require('./config/database');
  const { calculateFromBruttoCents } = require('./utils/vatCalculations');
  const db = getDatabase();

  if (!backup || !backup.transactions || !Array.isArray(backup.transactions)) {
    throw new Error('Ungültiges Backup-Format');
  }

  const existingCats = db.prepare('SELECT id, name FROM categories').all();
  const catMap = {};
  for (const c of existingCats) catMap[c.name.toLowerCase()] = c.id;

  const insertCat = db.prepare(
    'INSERT INTO categories (name, type, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)'
  );

  if (backup.categories) {
    for (const cat of backup.categories) {
      if (!catMap[cat.name.toLowerCase()]) {
        const result = insertCat.run(cat.name, cat.type, cat.description || '', cat.sort_order || 0, cat.is_active != null ? cat.is_active : 1);
        catMap[cat.name.toLowerCase()] = result.lastInsertRowid;
      }
    }
  }

  const catIdMap = {};
  if (backup.categories) {
    for (const cat of backup.categories) {
      catIdMap[cat.id] = catMap[cat.name.toLowerCase()];
    }
  }

  const dupStmt = db.prepare(
    'SELECT id FROM transactions WHERE date = ? AND gross_amount_cents = ? AND description = ? AND transaction_type = ?'
  );
  const insertStmt = db.prepare(`
    INSERT INTO transactions (date, transaction_type, category_id, description, gross_amount_cents, vat_rate, net_amount_cents, vat_amount_cents, invoice_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;
  let categoryMissing = 0;

  const importAll = db.transaction(() => {
    for (const t of backup.transactions) {
      const catId = catIdMap[t.category_id] || t.category_id;
      const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
      if (!catExists) { categoryMissing++; skipped++; continue; }

      const existing = dupStmt.get(t.date, t.gross_amount_cents, t.description, t.transaction_type);
      if (existing) { skipped++; continue; }

      const { netCents, vatCents } = calculateFromBruttoCents(t.gross_amount_cents, t.vat_rate);
      const now = new Date().toISOString();
      insertStmt.run(
        t.date, t.transaction_type, catId, t.description,
        t.gross_amount_cents, t.vat_rate, netCents, vatCents,
        t.invoice_number || null, t.created_at || now, now
      );
      imported++;
    }
  });

  importAll();
  return { imported, skipped, categoryMissing, total: backup.transactions.length };
}

// Backup import - from backup folder
app.post('/api/backup/import', (req, res) => {
  try {
    const fs = require('fs');
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Dateiname erforderlich' });

    const basename = path.basename(filename);
    const resolvedPath = getBackupPath();
    if (!resolvedPath) return res.status(500).json({ error: 'Backup-Pfad nicht konfiguriert' });

    const filePath = path.join(resolvedPath, basename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });

    const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(importBackupData(backup));
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: 'Backup import failed: ' + err.message });
  }
});

// Backup import - from uploaded JSON
app.post('/api/backup/upload', express.json({ limit: '50mb' }), (req, res) => {
  try {
    res.json(importBackupData(req.body));
  } catch (err) {
    console.error('Backup upload error:', err);
    res.status(500).json({ error: 'Backup import failed: ' + err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
