const { getDatabase } = require('../config/database');

function listAll(req, res) {
  const db = getDatabase();
  const includeInactive = req.query.all === '1';
  const sql = includeInactive
    ? 'SELECT * FROM categories ORDER BY sort_order'
    : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order';
  const categories = db.prepare(sql).all();
  res.json(categories);
}

function listByType(req, res) {
  const { type } = req.params;
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  const db = getDatabase();
  const categories = db.prepare('SELECT * FROM categories WHERE type = ? AND is_active = 1 ORDER BY sort_order').all(type);
  res.json(categories);
}

function create(req, res) {
  const { name, type, description, sort_order, datev_account } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  const db = getDatabase();
  const result = db.prepare('INSERT INTO categories (name, type, description, sort_order, datev_account) VALUES (?, ?, ?, ?, ?)').run(name, type, description || null, sort_order || 0, datev_account || null);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(category);
}

function update(req, res) {
  const { id } = req.params;
  const { name, description, sort_order, is_active, datev_account } = req.body;
  const db = getDatabase();

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare('UPDATE categories SET name = ?, description = ?, sort_order = ?, is_active = ?, datev_account = ? WHERE id = ?').run(
    name ?? existing.name,
    description ?? existing.description,
    sort_order ?? existing.sort_order,
    is_active ?? existing.is_active,
    datev_account !== undefined ? (datev_account || null) : existing.datev_account,
    id
  );

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json(category);
}

module.exports = { listAll, listByType, create, update };
