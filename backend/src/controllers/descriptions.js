const { getDatabase } = require('../config/database');
const { eurosToCents, centsToEuros } = require('../utils/vatCalculations');

function suggest(req, res) {
  const db = getDatabase();
  const { q = '', category_id, limit = 10 } = req.query;

  // If no query and no category, return nothing
  if ((!q || q.length < 2) && !category_id) {
    return res.json([]);
  }

  let results;
  if (category_id && (!q || q.length < 2)) {
    // No text yet — show popular descriptions for this category
    results = db.prepare(`
      SELECT dh.description, dh.usage_count,
        dcu.usage_count as category_usage,
        dcu.vat_rate,
        dcu.last_amount_cents
      FROM description_category_usage dcu
      JOIN description_history dh ON dh.description = dcu.description
      WHERE dcu.category_id = ?
      ORDER BY dcu.usage_count DESC, dh.last_used_at DESC
      LIMIT ?
    `).all(Number(category_id), Number(limit));
  } else if (category_id) {
    // Text + category — prioritize category matches
    results = db.prepare(`
      SELECT dh.description, dh.usage_count,
        COALESCE(dcu.usage_count, 0) as category_usage,
        dcu.vat_rate,
        dcu.last_amount_cents
      FROM description_history dh
      LEFT JOIN description_category_usage dcu
        ON dh.description = dcu.description AND dcu.category_id = ?
      WHERE dh.description LIKE ?
      ORDER BY category_usage DESC, dh.usage_count DESC, dh.last_used_at DESC
      LIMIT ?
    `).all(Number(category_id), `%${q}%`, Number(limit));
  } else {
    results = db.prepare(`
      SELECT description, usage_count, 0 as category_usage, NULL as vat_rate, NULL as last_amount_cents
      FROM description_history
      WHERE description LIKE ?
      ORDER BY usage_count DESC, last_used_at DESC
      LIMIT ?
    `).all(`%${q}%`, Number(limit));
  }

  // Convert cents to euros for the response
  res.json(results.map(r => ({
    ...r,
    last_amount: r.last_amount_cents != null ? centsToEuros(r.last_amount_cents) : null,
    last_amount_cents: undefined,
  })));
}

function track(req, res) {
  const db = getDatabase();
  const { description, category_id, vat_rate, gross_amount } = req.body;

  if (!description) return res.status(400).json({ error: 'Description required' });

  const now = new Date().toISOString();
  const amountCents = gross_amount != null ? eurosToCents(gross_amount) : null;

  // Upsert description_history
  db.prepare(`
    INSERT INTO description_history (description, usage_count, last_used_at, created_at)
    VALUES (?, 1, ?, ?)
    ON CONFLICT(description) DO UPDATE SET
      usage_count = usage_count + 1,
      last_used_at = ?
  `).run(description, now, now, now);

  // Upsert description_category_usage with vat_rate and amount
  if (category_id) {
    db.prepare(`
      INSERT INTO description_category_usage (description, category_id, usage_count, last_used_at, vat_rate, last_amount_cents)
      VALUES (?, ?, 1, ?, ?, ?)
      ON CONFLICT(description, category_id) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = ?,
        vat_rate = ?,
        last_amount_cents = ?
    `).run(description, category_id, now, vat_rate ?? null, amountCents, now, vat_rate ?? null, amountCents);
  }

  res.json({ success: true });
}

function popular(req, res) {
  const db = getDatabase();
  const { limit = 20 } = req.query;
  const results = db.prepare('SELECT description, usage_count FROM description_history ORDER BY usage_count DESC LIMIT ?').all(Number(limit));
  res.json(results);
}

module.exports = { suggest, track, popular };
