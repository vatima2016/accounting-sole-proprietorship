const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = path.resolve(__dirname, '../..', process.env.DB_PATH || './database/buchhaltung.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!dbDir.includes(':memory:') && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDatabase() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function runMigrations() {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    database.prepare('SELECT filename FROM schema_migrations').all().map(r => r.filename)
  );

  const migrationsDir = path.join(__dirname, '../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
    console.log(`Migration applied: ${file}`);
  }
}

function runSeeds() {
  const database = getDatabase();
  const seedsDir = path.join(__dirname, '../../database/seeds');
  if (!fs.existsSync(seedsDir)) return;

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_seeds (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    database.prepare('SELECT filename FROM schema_seeds').all().map(r => r.filename)
  );

  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
    database.exec(sql);
    database.prepare('INSERT INTO schema_seeds (filename) VALUES (?)').run(file);
    console.log(`Seed applied: ${file}`);
  }
}

module.exports = { getDatabase, runMigrations, runSeeds };
