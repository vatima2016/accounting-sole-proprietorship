const { generateVATReport, generateYearlyReport, generateYearlySummaries } = require('../services/reportGenerator');
const { exportElsterCSV } = require('../services/elsterExporter');
const { exportTransactionsCSV } = require('../services/csvExporter');

function vatReport(req, res) {
  try {
    const report = generateVATReport(req.params.year, req.params.quarter);
    res.json(report);
  } catch (err) {
    console.error('VAT report error:', err);
    res.status(500).json({ error: 'Failed to generate VAT report' });
  }
}

function yearlyReport(req, res) {
  try {
    const report = generateYearlyReport(req.params.year);
    res.json(report);
  } catch (err) {
    console.error('Yearly report error:', err);
    res.status(500).json({ error: 'Failed to generate yearly report' });
  }
}

function exportCSV(req, res) {
  try {
    const csv = exportTransactionsCSV(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=buchungen.csv');
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
}

function elsterExport(req, res) {
  try {
    const csv = exportElsterCSV(req.params.year, req.params.quarter);
    const filename = `elster_${req.params.year}_Q${req.params.quarter}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (err) {
    console.error('Elster export error:', err);
    res.status(500).json({ error: 'Failed to export Elster CSV' });
  }
}

function yearlySummaries(req, res) {
  try {
    const startYear = Number(req.query.from) || 2018;
    const data = generateYearlySummaries(startYear);
    res.json(data);
  } catch (err) {
    console.error('Yearly summaries error:', err);
    res.status(500).json({ error: 'Failed to generate yearly summaries' });
  }
}

module.exports = { vatReport, yearlyReport, yearlySummaries, exportCSV, elsterExport };
