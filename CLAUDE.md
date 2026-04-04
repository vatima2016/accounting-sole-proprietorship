# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Local accounting web app for a German sole proprietor (Einzelunternehmer). German UI, mixed English/German codebase. Handles transaction entry, VAT calculation, reporting (quarterly VAT, yearly summaries), DATEV export for accountants, and CSV/Elster export for tax filing.

## Commands

```bash
npm run dev              # Start both backend (port 3020) + frontend (port 5173)
npm run build            # Build frontend to dist/
npm stop                 # Kill both dev servers
cd backend && npm test   # Jest tests
cd frontend && npm run lint  # ESLint
cd backend && npm run db:migrate  # Apply pending SQL migrations
cd backend && npm run db:seed     # Insert seed data
```

## Architecture

**Frontend:** React 19 + Vite + Tailwind CSS 4. Pages in `frontend/src/pages/`, components organized by domain under `frontend/src/components/`. No global state library -- uses React hooks + localStorage for persistence (period selection, sort order). Centralized API client in `frontend/src/services/api.js` using fetch with `/api` base URL (Vite proxies to backend).

**Backend:** Express on Node.js. Routes defined in `backend/src/routes/`, controllers in `backend/src/controllers/`, business logic services in `backend/src/services/`. Validation via express-validator middleware chains in `backend/src/middleware/validation.js`. Server entry point is `backend/src/server.js` -- note that backup/settings routes are defined inline there, not in separate route files.

**Database:** SQLite via better-sqlite3 (synchronous API). File at `backend/database/buchhaltung.db`. WAL mode + foreign keys enabled. Migrations in `backend/database/migrations/` (numbered SQL files), tracked in `schema_migrations` table. Seeds in `backend/database/seeds/`, tracked in `schema_seeds` table. Both auto-run on server start.

## Critical Domain Rules

**Money is stored as integer cents.** All `*_cents` columns are integers (e.g., `gross_amount_cents = 2544` means 25.44). Convert at the API boundary with `centsToEuros()` / `eurosToCents()` in `backend/src/utils/vatCalculations.js`. Never use floating-point for money calculations.

**VAT is calculated from Brutto (gross).** The user enters the gross amount (invoice total). Net and VAT are derived: `net = gross / (1 + rate/100)`, rounded to nearest cent. Supported rates: 0%, 5%, 7%, 16% (2020 special), 19% (standard).

**Transaction types** are `'income'` or `'expense'`, stored in `transaction_type` column.

## Non-Obvious Patterns

- **Description autocomplete:** The `description_history` and `description_category_usage` tables track description frequency per category. The `SmartDescriptionInput` component fetches suggestions with debounce (300ms) and pre-fills last amount, VAT rate, and invoice number.
- **Period selector state:** `PeriodSelector` component state (month/quarter/year + selected period) is persisted to localStorage and shared across Transactions, Reports, and Dashboard pages.
- **Pagination:** Page size is dynamically calculated from the container height, not a fixed value.
- **Pre-commit hook:** `git-hooks/pre-commit` scans for secrets (.env files, database files, API keys). Bypass with `--no-verify` if false positive.
- **DATEV export:** Each category can have a DATEV account number (added by migration 004). Export produces Buchungsstapel + Kontenbeschriftungen in EXTF format.
