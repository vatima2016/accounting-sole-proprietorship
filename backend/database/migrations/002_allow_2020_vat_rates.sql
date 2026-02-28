-- Allow 2020 temporary VAT rates (16% and 5%) in addition to standard rates
-- Germany reduced VAT from 19%→16% and 7%→5% for July-December 2020

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints,
-- so we recreate the transactions table with the updated constraint.

PRAGMA foreign_keys=OFF;

CREATE TABLE transactions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense')),
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    gross_amount_cents INTEGER NOT NULL,
    vat_rate INTEGER NOT NULL CHECK(vat_rate IN (0, 5, 7, 16, 19)),
    net_amount_cents INTEGER NOT NULL,
    vat_amount_cents INTEGER NOT NULL,
    invoice_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

INSERT INTO transactions_new SELECT * FROM transactions;

DROP TABLE transactions;

ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

PRAGMA foreign_keys=ON;
