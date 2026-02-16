const { body, query, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const transactionRules = [
  body('date').isISO8601().withMessage('Date must be ISO8601 format'),
  body('transaction_type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category_id').isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('gross_amount').isFloat({ gt: 0 }).withMessage('Gross amount must be positive'),
  body('vat_rate').isIn([0, 7, 19]).withMessage('VAT rate must be 0, 7, or 19'),
  body('invoice_number').optional({ nullable: true }).trim(),
];

const transactionQueryRules = [
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('type').optional().isIn(['income', 'expense']),
  query('category_id').optional().isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { handleValidation, transactionRules, transactionQueryRules };
