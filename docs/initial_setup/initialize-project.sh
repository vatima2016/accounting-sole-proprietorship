#!/bin/bash

# Accounting Sole Proprietorship - Project Initialization Script
# This script creates all necessary files for the project

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Initializing Accounting Sole Proprietorship Project..."
echo "📍 Project root: $PROJECT_ROOT"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check if directories exist
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: backend or frontend directory not found"
    echo "Please ensure you're running this script from the project root"
    exit 1
fi

#############################################
# BACKEND FILES
#############################################

print_step "Creating backend configuration files..."

# backend/package.json
cat > backend/package.json << 'EOF'
{
  "name": "accounting-backend",
  "version": "1.0.0",
  "description": "Backend API for accounting application",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "db:init": "node src/scripts/initDatabase.js",
    "db:migrate": "node src/scripts/migrate.js",
    "db:seed": "node src/scripts/seed.js",
    "test": "jest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "better-sqlite3": "^9.2.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

# backend/.env.example
cat > backend/.env.example << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
# WICHTIG: Passen Sie diesen Pfad an Ihren Google Drive Ordner an!
DB_PATH=./database/buchhaltung.db
# Für Google Drive Sync:
# DB_PATH=/Users/IHR_USERNAME/GoogleDrive/Buchhaltung/buchhaltung.db

# CORS
CORS_ORIGIN=http://localhost:5173
EOF

# backend/src/server.js
cat > backend/src/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const totalsRouter = require('./routes/totals');
const descriptionsRouter = require('./routes/descriptions');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
app.use(express.json());

// Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/totals', totalsRouter);
app.use('/api/descriptions', descriptionsRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API docs: http://localhost:${PORT}/api/health`);
});

module.exports = app;
EOF

print_success "Backend configuration files created"

print_step "Creating backend database configuration..."

# backend/src/config/database.js
cat > backend/src/config/database.js << 'EOF'
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/buchhaltung.db');

console.log(`📦 Database path: ${dbPath}`);

const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
EOF

print_success "Database configuration created"

print_step "Creating database migrations..."

# backend/database/migrations/001_initial_schema.sql
cat > backend/database/migrations/001_initial_schema.sql << 'EOF'
-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense')),
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    gross_amount REAL NOT NULL,
    vat_rate REAL NOT NULL,
    net_amount REAL NOT NULL,
    vat_amount REAL NOT NULL,
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
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(description, category_id)
);

-- VAT payments tracking
CREATE TABLE IF NOT EXISTS vat_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quarter INTEGER NOT NULL,
    year INTEGER NOT NULL,
    payment_date TEXT,
    amount REAL,
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
EOF

print_success "Migration files created"

#############################################
# Continue with more files...
#############################################

echo ""
echo "================================================"
echo "✅ Project initialization complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. cd backend && npm install"
echo "2. cd ../frontend && npm install"
echo "3. cd ../backend && cp .env.example .env"
echo "4. Edit backend/.env and set DB_PATH to your Google Drive folder"
echo "5. npm run db:init"
echo "6. cd .. && npm run dev"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo ""
EOF

chmod +x initialize-project.sh
