const express = require('express');
const router = express.Router();
const { calculateTotals } = require('../services/totalsCalculator');

router.get('/', (req, res) => {
  try {
    const totals = calculateTotals(req.query);
    res.json(totals);
  } catch (err) {
    console.error('Totals error:', err);
    res.status(500).json({ error: 'Failed to calculate totals' });
  }
});

module.exports = router;
