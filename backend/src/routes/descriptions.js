const express = require('express');
const router = express.Router();
const descriptions = require('../controllers/descriptions');

router.get('/suggest', descriptions.suggest);
router.post('/track', descriptions.track);
router.get('/popular', descriptions.popular);

module.exports = router;
