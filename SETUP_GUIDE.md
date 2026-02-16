# Setup Guide for Accounting Sole Proprietorship

## What You Have

I've created a complete project starter with:

✅ **Project structure** - All directories and configuration files  
✅ **README.md** - Complete project documentation  
✅ **6 Technical Specifications** - Detailed implementation guides  
✅ **3 Interactive demos** - Visual UI examples  
✅ **Setup scripts** - Automated initialization  

## Setup Instructions

### Step 1: Extract Project to Your Directory

```bash
# Navigate to your workspace
cd /Users/impvti/tsworkspace/vatima2026

# Download the accounting-project-starter.tar.gz from outputs

# Extract it
tar -xzf accounting-project-starter.tar.gz

# You should now have:
# /Users/impvti/tsworkspace/vatima2026/accounting-sole-proprietorship/
```

### Step 2: Initialize Git Repository

```bash
cd accounting-sole-proprietorship

# Initialize git
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Project structure and specifications"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### Step 3: Review the Specifications

All technical specifications are already in the project:

1. **README.md** - Project overview and quick start
2. **INSTALL.md** - Detailed installation instructions
3. **docs/** (you'll need to copy from outputs):
   - `bookkeeping-app-specification.md`
   - `architecture-diagram.html`
   - `ux-implementation-guide.md`
   - `calculation-logic-brutto-to-netto.md`
   - `smart-description-autocomplete.md`
   - `dynamic-totals-calculator.md`

### Step 4: Implementation Options

#### Option A: Use Claude Projects (Recommended)

1. Go to https://claude.ai/projects
2. Create new project: "Accounting App Implementation"
3. Upload all specification files from `docs/`
4. Start a conversation: "Based on the specifications, please create the backend/src/server.js file"
5. Continue file by file, Claude will have full context

#### Option B: Use Cursor/GitHub Copilot

1. Open project in Cursor or VS Code
2. Add specification files to workspace
3. Use Copilot Chat with references to specs
4. Generate code file by file

#### Option C: Manual Implementation

Follow the detailed guides in the specification documents.

## Recommended Implementation Order

### Phase 1: Backend Foundation (Week 1)

1. **Database Schema**
   ```bash
   # Create backend/database/migrations/001_initial_schema.sql
   # Reference: bookkeeping-app-specification.md
   ```

2. **Database Configuration**
   ```bash
   # Create backend/src/config/database.js
   # Set up SQLite connection
   ```

3. **Express Server**
   ```bash
   # Create backend/src/server.js
   # Basic REST API setup
   ```

4. **Category Routes & Controllers**
   ```bash
   # backend/src/routes/categories.js
   # backend/src/controllers/categories.js
   ```

5. **Seed Default Categories**
   ```bash
   # backend/database/seeds/001_default_categories.sql
   # Your 2 income + 10 expense categories
   ```

### Phase 2: Transaction Management (Week 2)

1. **Transaction Routes & Controllers**
   ```bash
   # backend/src/routes/transactions.js
   # backend/src/controllers/transactions.js
   ```

2. **Totals Calculator Service**
   ```bash
   # backend/src/services/totalsCalculator.js
   # Reference: dynamic-totals-calculator.md
   ```

3. **Description Autocomplete**
   ```bash
   # backend/src/routes/descriptions.js
   # Reference: smart-description-autocomplete.md
   ```

### Phase 3: Frontend Foundation (Week 3)

1. **Vite + React Setup**
   ```bash
   cd frontend
   npm create vite@latest . -- --template react
   npm install
   ```

2. **Install Dependencies**
   ```bash
   npm install react-router-dom date-fns papaparse
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **API Service**
   ```bash
   # frontend/src/services/api.js
   # Axios client for backend
   ```

4. **Layout Components**
   ```bash
   # frontend/src/components/layout/Header.jsx
   # frontend/src/components/layout/Sidebar.jsx
   ```

### Phase 4: Transaction UI (Week 4)

1. **Transaction List**
   ```bash
   # frontend/src/components/transactions/TransactionList.jsx
   # frontend/src/components/transactions/TransactionRow.jsx
   ```

2. **Popup Form**
   ```bash
   # frontend/src/components/transactions/TransactionFormModal.jsx
   # frontend/src/components/transactions/TransactionForm.jsx
   # Reference: ux-implementation-guide.md
   ```

3. **Smart Description Input**
   ```bash
   # frontend/src/components/transactions/SmartDescriptionInput.jsx
   # Reference: smart-description-autocomplete.md
   ```

4. **Calculation Display**
   ```bash
   # frontend/src/components/transactions/CalculationDisplay.jsx
   # Brutto → Netto calculation
   ```

### Phase 5: Reports & Export (Week 5)

1. **Period Selector**
   ```bash
   # frontend/src/components/common/PeriodSelector.jsx
   # Month/Quarter/Year selection
   ```

2. **Totals Display**
   ```bash
   # frontend/src/components/transactions/TotalsDisplay.jsx
   # Reference: dynamic-totals-calculator.md
   ```

3. **VAT Reports**
   ```bash
   # backend/src/services/reportGenerator.js
   # Quarterly VAT report generation
   ```

4. **CSV Export**
   ```bash
   # backend/src/services/csvExporter.js
   # Export for Elster
   ```

### Phase 6: Polish & Testing (Week 6)

1. **Import Historical Data**
   ```bash
   # Import from your EasyCashTax export
   ```

2. **Google Drive Setup**
   ```bash
   # Configure DB_PATH in .env
   # Test automatic sync
   ```

3. **Testing**
   ```bash
   # Test all features
   # Verify calculations
   # Check VAT reports
   ```

## Quick Commands Reference

```bash
# Install all dependencies
npm run install:all

# Start development servers (both)
npm run dev

# Start backend only
cd backend && npm run dev

# Start frontend only  
cd frontend && npm run dev

# Initialize database
cd backend && npm run db:init

# Create database backup
cd backend && npm run db:backup

# Build for production
npm run build
```

## Configuration Checklist

- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Set `DB_PATH` to your Google Drive folder
- [ ] Verify Google Drive Desktop is running
- [ ] Run `npm run db:init` to create database
- [ ] Seed categories: `npm run db:seed`
- [ ] Test backend: `curl http://localhost:3001/api/health`
- [ ] Test frontend: Open http://localhost:5173

## Database Path Examples

```bash
# macOS
DB_PATH=/Users/impvti/Google Drive/Buchhaltung/buchhaltung.db

# Or if using Google Drive Desktop app
DB_PATH=/Users/impvti/GoogleDrive/Buchhaltung/buchhaltung.db

# For testing (local only, no sync)
DB_PATH=./database/buchhaltung.db
```

## Troubleshooting

### "Cannot find module 'better-sqlite3'"

```bash
cd backend
npm install
```

### "Port 3001 already in use"

```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Or change port in backend/.env
PORT=3002
```

### "Database locked"

```bash
# Close all Node processes
pkill node

# Restart backend
cd backend && npm run dev
```

### Google Drive not syncing

1. Check Google Drive Desktop is running
2. Verify DB_PATH in .env points to correct folder
3. Check folder permissions
4. Try manual backup: `cp database/buchhaltung.db ~/GoogleDrive/Buchhaltung/`

## Getting Help

### Resources Available

1. **Interactive Demos** - Open the HTML files in browser:
   - `ui-mockup-brutto-to-netto.html` - See the calculation in action
   - `smart-autocomplete-demo.html` - Try the autocomplete
   - `architecture-diagram.html` - Visual system overview

2. **Specifications** - Complete technical documentation:
   - All business logic explained
   - Complete code examples
   - Database schemas
   - API endpoints

3. **This Setup Guide** - Step-by-step instructions

### Using Claude for Implementation

Best prompts to use:

```
"Based on bookkeeping-app-specification.md, create the 
backend/src/config/database.js file with proper error handling"

"Following ux-implementation-guide.md, implement the 
TransactionForm component with all validation rules"

"Using calculation-logic-brutto-to-netto.md, create the 
calculation utility functions with tests"
```

## Success Criteria

Your implementation is complete when:

- [ ] Backend API responds at http://localhost:3001/api/health
- [ ] Frontend loads at http://localhost:5173
- [ ] Can create new transaction with popup form
- [ ] Category dropdown shows and remembers last used
- [ ] Brutto input calculates Netto automatically
- [ ] Description autocomplete suggests based on category
- [ ] Period selector changes totals display
- [ ] Totals show correct Income/Expense/Profit/VAT
- [ ] Can export quarterly VAT report as CSV
- [ ] Database syncs to Google Drive
- [ ] Can import data from EasyCashTax export

## Timeline Estimate

- **With AI tools (Claude/Copilot):** 2-3 weeks part-time
- **Manual implementation:** 5-6 weeks part-time
- **With developer:** 1-2 weeks full-time

Good luck with your implementation! 🚀
