const express = require('express');
const router = express.Router();
const importController = require('../controllers/import');

router.post('/validate', importController.validateCSV);
router.post('/csv', importController.importCSV);

// EasyCash&Tax
router.post('/easyct/validate', importController.validateEasyCashTax);
router.post('/easyct/import', importController.importEasyCashTax);

module.exports = router;
