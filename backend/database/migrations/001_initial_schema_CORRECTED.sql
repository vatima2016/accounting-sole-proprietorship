-- CORRECTED Schema with INTEGER for money (cents)

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);

-- Transactions table (CORRECTED: money as INTEGER cents)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense')),
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    
    -- Store as INTEGER cents (e.g., 2544 = €25.44)
    gross_amount_cents INTEGER NOT NULL,
    vat_rate INTEGER NOT NULL CHECK(vat_rate IN (0, 5, 7, 16, 19)),
    net_amount_cents INTEGER NOT NULL,
    vat_amount_cents INTEGER NOT NULL,
    
    invoice_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Description history for autocomplete
CREATE TABLE IF NOT EXISTS description_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Description usage by category
CREATE TABLE IF NOT EXISTS description_category_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TEXT NOT NULL,
    vat_rate INTEGER DEFAULT NULL,
    last_amount_cents INTEGER DEFAULT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(description, category_id)
);

-- VAT payments tracking
CREATE TABLE IF NOT EXISTS vat_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quarter INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 4),
    year INTEGER NOT NULL,
    payment_date TEXT,
    amount_cents INTEGER,  -- Also in cents
    notes TEXT,
    UNIQUE(year, quarter)
);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_description_history_usage ON description_history(usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_desc_cat_usage ON description_category_usage(category_id, usage_count DESC);
