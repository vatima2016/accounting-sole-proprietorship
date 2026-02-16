const express = require('express');
const router = express.Router();
const categories = require('../controllers/categories');

router.get('/', categories.listAll);
router.get('/:type', categories.listByType);
router.post('/', categories.create);
router.put('/:id', categories.update);

module.exports = router;
