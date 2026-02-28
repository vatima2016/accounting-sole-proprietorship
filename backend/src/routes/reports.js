const express = require('express');
const router = express.Router();
const reports = require('../controllers/reports');

router.get('/vat/:year/:quarter', reports.vatReport);
router.get('/yearly/:year', reports.yearlyReport);
router.get('/yearly-summaries', reports.yearlySummaries);
router.get('/export/csv', reports.exportCSV);
router.get('/elster/:year/:quarter', reports.elsterExport);

module.exports = router;
