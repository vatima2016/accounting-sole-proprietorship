const express = require('express');
const router = express.Router();
const transactions = require('../controllers/transactions');
const { transactionRules, transactionQueryRules, handleValidation } = require('../middleware/validation');

router.get('/', transactionQueryRules, handleValidation, transactions.list);
router.get('/:id', transactions.getById);
router.post('/', transactionRules, handleValidation, transactions.create);
router.put('/:id', transactionRules, handleValidation, transactions.update);
router.delete('/:id', transactions.remove);

module.exports = router;
