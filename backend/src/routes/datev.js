const express = require('express');
const router = express.Router();
const datev = require('../controllers/datev');

router.get('/settings', datev.getDatevSettings);
router.put('/settings', datev.saveDatevSettings);
router.get('/export/buchungsstapel', datev.exportBuchungsstapel);
router.get('/export/kontenbeschriftungen', datev.exportKontenbeschriftungen);
router.get('/export/preview', datev.exportPreview);

module.exports = router;
