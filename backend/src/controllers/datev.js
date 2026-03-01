const { getDatabase } = require('../config/database');
const { generateBuchungsstapel, generateKontenbeschriftungen, getSettings } = require('../services/datevExporter');

function getDatevSettings(req, res) {
  const settings = getSettings();
  res.json(settings);
}

function saveDatevSettings(req, res) {
  const db = getDatabase();
  const { beraternr, mandantnr } = req.body;
  const now = new Date().toISOString();

  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('datev_beraternr', ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?")
    .run(beraternr || '', now, beraternr || '', now);
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('datev_mandantnr', ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?")
    .run(mandantnr || '', now, mandantnr || '', now);

  res.json({ success: true });
}

function exportBuchungsstapel(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const result = generateBuchungsstapel(year);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.csv);
  } catch (err) {
    console.error('DATEV Buchungsstapel export error:', err);
    res.status(500).json({ error: err.message });
  }
}

function exportKontenbeschriftungen(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const result = generateKontenbeschriftungen(year);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.csv);
  } catch (err) {
    console.error('DATEV Kontenbeschriftungen export error:', err);
    res.status(500).json({ error: err.message });
  }
}

function exportPreview(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const result = generateBuchungsstapel(year);
    res.json(result.stats);
  } catch (err) {
    console.error('DATEV preview error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getDatevSettings, saveDatevSettings, exportBuchungsstapel, exportKontenbeschriftungen, exportPreview };
