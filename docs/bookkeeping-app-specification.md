# Bookkeeping Application - Technical Specification

## Overview
A locally-running web application for managing travel agency bookkeeping with German VAT compliance (Elster export).

## Business Requirements

### Core Functionality
- **Transaction Management**: Record income (Einnahmen) and expenses (Ausgaben)
- **VAT Tracking**: Support for 0%, 7%, and 19% VAT rates
- **Quarterly VAT Reports**: Generate Umsatzsteuervoranmeldungen
- **Yearly Reports**: Export for tax consultant and Elster Formular
- **Data Import**: Import historical data from existing freeware

### Data Security
- All data stored locally (no cloud dependencies for operation)
- SQLite database file synced to Google Drive for backup
- No sensitive personal data (no addresses, credit cards, bank accounts)

### Volume
- ~100 transactions per month
- ~1,200 transactions per year

---

## Technology Stack

### Frontend
- **React 18+** with functional components and hooks
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation
- **Recharts** or **Chart.js** for visualizations
- **date-fns** for date handling
- **Papa Parse** for CSV import/export

### Backend
- **Node.js 18+** with **Express.js**
- **SQLite3** for database (file-based, easy to backup)
- **Better-SQLite3** for synchronous database operations
- **CORS** enabled for local development

### Development Tools
- **ESLint** + **Prettier** for code formatting
- **npm** for package management
- **Concurrently** to run frontend and backend together

---

## Database Schema

### Tables

#### 1. `transactions`
Primary table for all financial transactions.

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- ISO date format: YYYY-MM-DD
    transaction_type TEXT NOT NULL,        -- 'income' or 'expense'
    invoice_number TEXT,                   -- Optional invoice reference
    description TEXT NOT NULL,
    net_amount REAL NOT NULL,              -- Netto
    vat_rate REAL NOT NULL,                -- 0, 7, or 19
    vat_amount REAL NOT NULL,              -- USt calculated
    gross_amount REAL NOT NULL,            -- Brutto
    category_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

#### 2. `categories`
Bookkeeping categories (Konten).

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,             -- e.g., "Provisionen", "Betriebsbedarf"
    type TEXT NOT NULL,                    -- 'income' or 'expense'
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);
```

#### 3. `vat_payments`
Track VAT prepayments to Finanzamt.

```sql
CREATE TABLE vat_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quarter INTEGER NOT NULL,              -- 1, 2, 3, or 4
    year INTEGER NOT NULL,
    payment_date TEXT,
    amount REAL,
    notes TEXT,
    UNIQUE(year, quarter)
);
```

#### 4. `settings`
Application settings and metadata.

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
);
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              React Frontend (Port 5173)               │ │
│  │                                                        │ │
│  │  • Transaction Entry Forms                            │ │
│  │  • Transaction List/Search                            │ │
│  │  • Reports (VAT, Yearly)                              │ │
│  │  • Data Import/Export                                 │ │
│  │  • Dashboard/Statistics                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ HTTP/JSON                        │
│                           ↓                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Local Machine                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           Node.js Backend (Port 3001)                 │ │
│  │                                                        │ │
│  │  • REST API Endpoints                                 │ │
│  │  • Business Logic                                     │ │
│  │  • VAT Calculations                                   │ │
│  │  • Report Generation                                  │ │
│  │  • CSV Import/Export                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ SQL                              │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              SQLite Database File                     │ │
│  │           bookkeeping.db (~1-5 MB)                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ File System                      │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Google Drive Sync Folder                      │ │
│  │     (e.g., ~/GoogleDrive/Bookkeeping/)                │ │
│  │                                                        │ │
│  │  • bookkeeping.db (auto-synced)                       │ │
│  │  • exports/ (CSV reports)                             │ │
│  │  • backups/ (timestamped DB copies)                   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
bookkeeping-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # SQLite connection
│   │   ├── controllers/
│   │   │   ├── transactions.js       # Transaction CRUD
│   │   │   ├── categories.js         # Category management
│   │   │   ├── reports.js            # Report generation
│   │   │   └── import.js             # Data import
│   │   ├── routes/
│   │   │   ├── transactions.js
│   │   │   ├── categories.js
│   │   │   ├── reports.js
│   │   │   └── import.js
│   │   ├── services/
│   │   │   ├── vatCalculations.js    # VAT logic
│   │   │   ├── reportGenerator.js    # Generate reports
│   │   │   └── csvExporter.js        # CSV export
│   │   ├── utils/
│   │   │   └── dateHelpers.js
│   │   └── server.js                 # Express app
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql
│   │   └── seeds/
│   │       └── default_categories.sql
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── transactions/
│   │   │   │   ├── TransactionForm.jsx
│   │   │   │   ├── TransactionList.jsx
│   │   │   │   ├── TransactionFilter.jsx
│   │   │   │   └── TransactionItem.jsx
│   │   │   ├── reports/
│   │   │   │   ├── VATReport.jsx
│   │   │   │   ├── YearlyReport.jsx
│   │   │   │   └── QuarterlyReport.jsx
│   │   │   ├── import/
│   │   │   │   └── ImportWizard.jsx
│   │   │   └── common/
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       ├── Select.jsx
│   │   │       └── DatePicker.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Import.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js                # API client
│   │   ├── hooks/
│   │   │   ├── useTransactions.js
│   │   │   └── useCategories.js
│   │   ├── utils/
│   │   │   ├── formatting.js
│   │   │   └── validation.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env
│
├── docs/
│   └── user-guide.md
├── README.md
└── package.json                      # Root package for scripts
```

---

## API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions (with filters)
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:type` - List by type (income/expense)
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category

### Reports
- `GET /api/reports/vat/:year/:quarter` - Quarterly VAT report
- `GET /api/reports/yearly/:year` - Yearly summary
- `GET /api/reports/export/csv` - Export to CSV
- `GET /api/reports/elster/:year` - Elster-formatted export

### Import
- `POST /api/import/csv` - Import transactions from CSV
- `POST /api/import/validate` - Validate import file

---

## UX Design Requirements

### Popup Modal Form
- **Overlay Design**: Form appears as modal popup over transaction list
- **Backdrop**: Semi-transparent dark overlay with blur effect
- **Animation**: Smooth slide-up animation when opening
- **Responsive**: Form centered on screen, scrollable if needed
- **Close Actions**: 
  - Click backdrop to close
  - Click × button to close
  - ESC key to close
  - Save or Cancel button

### Transaction List Interaction
- **Click to Edit**: Click any transaction row to open popup with pre-filled data
- **Visual Feedback**: 
  - Hover effect on transaction rows
  - Selected row highlighted when editing
  - Color coding: Green for income, Red for expenses
- **Quick Actions**: Edit icon visible on hover
- **Keyboard Navigation**: Arrow keys to navigate, Enter to edit

### Mandatory Category Field
- **Validation**: Cannot save transaction without category selected
- **Default Value**: Automatically pre-fills with last used category
- **Visual Indicator**: 
  - Required field marked with red asterisk (*)
  - Default selection highlighted with background color
  - Helper text: "⚠️ Pflichtfeld - Standard: Letzte verwendete Kategorie"
- **Error State**: Red border if user tries to save without category

### Category Management Logic
```javascript
// On app initialization
const lastUsedCategory = localStorage.getItem('lastUsedCategory') || null;

// On new transaction form
if (lastUsedCategory) {
    form.category = lastUsedCategory;
    // Highlight the default selection
}

// On save transaction
localStorage.setItem('lastUsedCategory', form.category);
```

### Auto-Calculation Display
- **Real-time Updates**: Netto and USt calculated as user types Brutto amount
- **Visual Calculation Box**: 
  - Shows: Brutto → - USt (X%) → = Netto
  - Updates instantly on input change
  - Clear visual hierarchy
- **Calculation Logic**:
  - Netto = Brutto / (1 + VAT_rate/100)
  - USt = Brutto - Netto
- **Number Formatting**: German format (€1.234,56)

### Form Validation
- **Required Fields**: Date, Category, Description, Brutto Amount, VAT Rate
- **Optional Fields**: Invoice Number
- **Client-side Validation**: Check before API call
- **Error Messages**: Clear, specific feedback in German

### Accessibility
- **Tab Navigation**: Logical tab order through form fields
- **Enter Key**: Saves form if validation passes
- **ESC Key**: Closes modal
- **Focus Management**: Auto-focus on first input when modal opens
- **Screen Reader Support**: Proper ARIA labels

---

## Key Features

### 1. Transaction Management
- **Popup modal form** overlaying transaction list for quick data entry
- Click transaction row to edit (form pre-filled with data)
- **Mandatory category selection** - cannot save without selecting category
- **Category default**: Automatically selects last used category as default
- **Calculation flow**: User enters Brutto (Gross) → System calculates Netto (Net) and USt (VAT)
  - Formula: Netto = Brutto / (1 + VAT_rate/100)
  - Formula: USt = Brutto - Netto
- Date picker with German locale
- Invoice number tracking (optional)
- One-click save returns to transaction list

### 2. Transaction List
- Sortable columns (date, amount, category)
- Filter by:
  - Date range
  - Transaction type (income/expense)
  - Category
  - VAT rate
- Search by description or invoice number
- Pagination for performance
- Edit/delete inline

### 3. Dashboard
- Current month summary
- Year-to-date totals
- VAT liability summary
- Recent transactions
- Charts:
  - Income vs Expenses over time
  - Expenses by category
  - VAT collected vs paid

### 4. VAT Reports (Quarterly)
- Umsatzsteuervoranmeldung format
- Line items:
  - Umsätze 19% (Box 81)
  - Umsätze 7% (Box 86)
  - Steuerfreie Umsätze (Box 41)
  - Vorsteuer 19% (Box 66)
  - Vorsteuer 7% (Box 63)
  - Zahllast/Erstattung
- Export to CSV for Elster

### 5. Yearly Report
- Income summary by category
- Expense summary by category
- Net income calculation
- Format matching your current Excel structure:
  - Einnahmen nach Datum
  - Einnahmen nach Konto
  - Ausgaben nach Datum
  - Ausgaben nach Konto
  - USt (monthly breakdown)
- Export to Excel or CSV

### 6. Data Import
- Import from CSV (your current freeware format)
- Column mapping wizard
- Validation before import
- Preview imported data
- Rollback capability

### 7. Backup Management
- Manual backup button
- Auto-backup on app close
- Timestamped backup files
- Restore from backup

---

## Your Bookkeeping Categories

### Income Categories (Einnahmen)
1. **Provisionen** - Commission income (19% VAT)
2. **Provisionen USt frei** - VAT-free commission (0% VAT)

### Expense Categories (Ausgaben)
1. **Betriebsbedarf** - Office supplies (19% VAT)
2. **Bewirtungskosten Büro** - Office refreshments (7% VAT)
3. **Franchise/Lizenzkosten** - Franchise/License costs (19% VAT)
4. **Geringwertige Wirtschaftsgüter** - Low-value assets (19% VAT)
5. **Kfz-Kosten (betriebl. Anteil)** - Vehicle costs (business portion) (19% VAT)
6. **Kosten der Warenabgabe** - Cost of goods delivery (19% VAT)
7. **Raumkosten** - Rent/space costs (19% VAT)
8. **Telefon, Internet, Porto** - Communication costs (19% VAT)
9. **Verkaufsprovisionen** - Sales commissions (19% VAT)
10. **Werbekosten** - Advertising costs (19% VAT)

---

## Implementation Phases

### Phase 1: Core Foundation (Week 1-2)
- [ ] Setup project structure
- [ ] Initialize database with schema
- [ ] Seed default categories
- [ ] Create basic Express API
- [ ] Setup React with Vite
- [ ] Implement API client
- [ ] Basic transaction CRUD (backend + frontend)

### Phase 2: Transaction Management (Week 3)
- [ ] Transaction entry form with VAT calculation
- [ ] Transaction list with filtering
- [ ] Edit/delete transactions
- [ ] Category management
- [ ] Date range filtering

### Phase 3: Reports (Week 4)
- [ ] Dashboard with statistics
- [ ] Quarterly VAT report
- [ ] CSV export for Elster
- [ ] Basic yearly summary

### Phase 4: Import & Polish (Week 5)
- [ ] CSV import wizard
- [ ] Import your historical data
- [ ] Backup/restore functionality
- [ ] UI polish and testing
- [ ] User documentation

### Phase 5: Advanced Reports (Week 6)
- [ ] Full yearly report (Excel format)
- [ ] Charts and visualizations
- [ ] Advanced filtering
- [ ] Performance optimization

---

## Development Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Git
- Google Drive Desktop app (for sync)

### Initial Setup
```bash
# Clone or create project directory
mkdir bookkeeping-app
cd bookkeeping-app

# Initialize root package.json
npm init -y

# Install concurrently for running both servers
npm install --save-dev concurrently

# Setup backend
mkdir backend && cd backend
npm init -y
npm install express cors better-sqlite3 dotenv
npm install --save-dev nodemon

# Setup frontend
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom date-fns papaparse
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Return to root
cd ..
```

### Running the Application
```bash
# From root directory
npm run dev
```

This will start:
- Backend on http://localhost:3001
- Frontend on http://localhost:5173

---

## Google Drive Backup Strategy

1. **Database Location**: Store `bookkeeping.db` in your Google Drive sync folder
2. **Configuration**: Set database path in backend `.env`:
   ```
   DB_PATH=/Users/yourusername/GoogleDrive/Bookkeeping/bookkeeping.db
   ```
3. **Automatic Sync**: Google Drive will automatically sync changes
4. **Manual Backups**: Export timestamped copies before major changes
5. **Restore**: Simply copy backup file over current database

---

## Security Considerations

- Application runs locally only (localhost)
- No authentication needed (single user)
- No sensitive data stored
- Database file should be in encrypted folder if needed
- Google Drive provides version history for recovery

---

## Future Enhancements (Optional)

- Multi-year comparison reports
- Budget tracking
- Invoice generation
- Receipt attachment (PDF/image storage)
- Mobile-responsive design
- Dark mode
- Export to PDF
- Direct Elster API integration
- Multi-currency support
- Bank statement import

---

## Technical Considerations

### Why SQLite?
- File-based (easy to backup)
- No server process needed
- Fast for this data volume
- Easy to sync via Google Drive
- Can migrate to PostgreSQL later if needed

### Why React?
- Modern, component-based
- Rich ecosystem
- Easy to maintain
- Good for interactive UIs
- You requested it!

### Why Not Framework X?
- Keep it simple for one-person maintenance
- Avoid over-engineering
- Standard stack = easier to find help
- Focus on business logic, not framework complexity

---

## Next Steps

1. Review this specification
2. Confirm the approach
3. I'll create:
   - Complete database schema SQL
   - Backend boilerplate code
   - Frontend boilerplate code
   - Initial setup script
4. You can start development phase by phase

Any questions or changes needed?
