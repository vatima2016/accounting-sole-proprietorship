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
const PORT = process.env.PORT || 3001;

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

// Backup endpoint
app.post('/api/backup', async (req, res) => {
  try {
    const fs = require('fs');
    const { getDatabase } = require('./config/database');
    const backupPath = process.env.GOOGLE_DRIVE_BACKUP_PATH;
    if (!backupPath) return res.status(500).json({ error: 'Backup path not configured' });
    if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destFile = path.join(backupPath, `buchhaltung_${timestamp}.db`);
    const db = getDatabase();
    await db.backup(destFile);
    res.json({ success: true, path: destFile });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Backup failed' });
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
