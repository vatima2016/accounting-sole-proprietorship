const { getDatabase } = require('../config/database');
const { calculateFromBruttoCents, centsToEuros, eurosToCents } = require('../utils/vatCalculations');

function toApiFormat(row) {
  return {
    id: row.id,
    date: row.date,
    transaction_type: row.transaction_type,
    category_id: row.category_id,
    category_name: row.category_name,
    description: row.description,
    gross_amount: centsToEuros(row.gross_amount_cents),
    vat_rate: row.vat_rate,
    net_amount: centsToEuros(row.net_amount_cents),
    vat_amount: centsToEuros(row.vat_amount_cents),
    invoice_number: row.invoice_number,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const BASE_QUERY = `
  SELECT t.*, c.name as category_name
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
`;

const SORT_COLUMNS = {
  date: 't.date',
  description: 't.description',
  category_name: 'c.name',
  transaction_type: 't.transaction_type',
  gross_amount: 't.gross_amount_cents',
  net_amount: 't.net_amount_cents',
  vat_amount: 't.vat_amount_cents',
  vat_rate: 't.vat_rate',
  invoice_number: 't.invoice_number',
};

function list(req, res) {
  const db = getDatabase();
  const { start_date, end_date, type, category_id, page = 1, limit = 50, sort, dir, search_amount, search_invoice, search_date } = req.query;

  let where = [];
  let params = [];

  if (start_date) { where.push('t.date >= ?'); params.push(start_date); }
  if (end_date) { where.push('t.date <= ?'); params.push(end_date); }
  if (type) { where.push('t.transaction_type = ?'); params.push(type); }
  if (category_id) { where.push('t.category_id = ?'); params.push(Number(category_id)); }
  if (search_amount) { where.push('t.gross_amount_cents = ?'); params.push(eurosToCents(parseFloat(search_amount))); }
  if (search_invoice) { where.push('t.invoice_number LIKE ?'); params.push(`%${search_invoice}%`); }
  if (search_date) { where.push('t.date = ?'); params.push(search_date); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const sortCol = SORT_COLUMNS[sort] || 't.date';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';
  const orderBy = `ORDER BY ${sortCol} ${sortDir}, t.id DESC`;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM transactions t ${whereClause}`).get(...params);
  const rows = db.prepare(`${BASE_QUERY} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`).all(...params, Number(limit), offset);

  res.json({
    data: rows.map(toApiFormat),
    total: countRow.total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(countRow.total / Number(limit)),
  });
}

function getById(req, res) {
  const db = getDatabase();
  const row = db.prepare(`${BASE_QUERY} WHERE t.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Transaction not found' });
  res.json(toApiFormat(row));
}

function create(req, res) {
  const db = getDatabase();
  const { date, transaction_type, category_id, description, gross_amount, vat_rate, invoice_number } = req.body;

  const grossCents = eurosToCents(gross_amount);
  const { netCents, vatCents } = calculateFromBruttoCents(grossCents, vat_rate);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO transactions (date, transaction_type, category_id, description, gross_amount_cents, vat_rate, net_amount_cents, vat_amount_cents, invoice_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, transaction_type, category_id, description, grossCents, vat_rate, netCents, vatCents, invoice_number || null, now, now);

  const row = db.prepare(`${BASE_QUERY} WHERE t.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(toApiFormat(row));
}

function update(req, res) {
  const db = getDatabase();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const { date, transaction_type, category_id, description, gross_amount, vat_rate, invoice_number } = req.body;

  const grossCents = eurosToCents(gross_amount);
  const { netCents, vatCents } = calculateFromBruttoCents(grossCents, vat_rate);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE transactions SET date = ?, transaction_type = ?, category_id = ?, description = ?, gross_amount_cents = ?, vat_rate = ?, net_amount_cents = ?, vat_amount_cents = ?, invoice_number = ?, updated_at = ?
    WHERE id = ?
  `).run(date, transaction_type, category_id, description, grossCents, vat_rate, netCents, vatCents, invoice_number || null, now, id);

  const row = db.prepare(`${BASE_QUERY} WHERE t.id = ?`).get(id);
  res.json(toApiFormat(row));
}

function remove(req, res) {
  const db = getDatabase();
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  res.json({ message: 'Transaction deleted' });
}

module.exports = { list, getById, create, update, remove };
