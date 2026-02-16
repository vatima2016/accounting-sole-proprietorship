const express = require('express');
const router = express.Router();
const importController = require('../controllers/import');

router.post('/validate', importController.validateCSV);
router.post('/csv', importController.importCSV);

module.exports = router;
