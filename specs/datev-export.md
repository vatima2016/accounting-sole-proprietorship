# Plan: DATEV Export (Buchungsstapel + Kontenbeschriftungen)

## Context
Export transactions and category mappings in DATEV EXTF format for the Steuerberater to import into DATEV. Uses SKR 03. Each category gets a manually assigned DATEV Sachkonto number. Beraternummer and Mandantennummer configurable in Settings.

## Changes

### 1. Database migration
**New:** `backend/database/migrations/004_add_datev_account.sql`
- `ALTER TABLE categories ADD COLUMN datev_account TEXT DEFAULT NULL`

### 2. Categories controller
**Modify:** `backend/src/controllers/categories.js`
- Add `datev_account` to `create()` INSERT (line 24, 29)
- Add `datev_account` to `update()` UPDATE (line 36, 44)

### 3. DATEV exporter service
**New:** `backend/src/services/datevExporter.js`

Two functions:
- `generateBuchungsstapel(year)` — EXTF category 21, 116 columns
  - EXTF header with Beraternr, Mandantnr, WJ, SKR "03"
  - Data: amount (German comma, positive), S/H flag, Konto (category's datev_account), Gegenkonto=1200, BU-Schlüssel (19%→empty, 7%→"2", 0%→"40"), Belegdatum (DDMM), invoice_number, description (max 60 chars)
  - Returns `{ csv, filename, stats }`

- `generateKontenbeschriftungen(year)` — EXTF category 20
  - Columns: Konto;Kontenbeschriftung;SprachId
  - One row per mapped category + 1200 "Bank"

- Format: UTF-8 BOM, semicolon, `\r\n` line endings

### 4. DATEV routes + controller
**New:** `backend/src/routes/datev.js` + `backend/src/controllers/datev.js`
- `GET /api/datev/settings` — return beraternr + mandantnr
- `PUT /api/datev/settings` — upsert to settings table
- `GET /api/datev/export/buchungsstapel?year=` — download CSV
- `GET /api/datev/export/kontenbeschriftungen?year=` — download CSV
- `GET /api/datev/export/preview?year=` — return stats (exported/skipped/unmapped)

**Modify:** `backend/src/server.js` — register datevRouter (2 lines)

### 5. Frontend API
**Modify:** `frontend/src/services/api.js`
- Add: `getDatevSettings`, `saveDatevSettings`, `datevBuchungsstapelUrl(year)`, `datevKontenbeschriftungenUrl(year)`, `datevExportPreview(year)`

### 6. Frontend Settings — DATEV section
**Modify:** `frontend/src/pages/Settings.jsx`
- Beraternummer + Mandantennummer inputs with save button
- Sachkonten-Zuordnung table — all active categories with input for DATEV Konto (save on blur)
- Year selector + two download buttons (Buchungsstapel / Kontenbeschriftungen)
- Preview showing export stats and unmapped category warnings

## DATEV Format Reference

### EXTF Header (Line 1)
```
"EXTF";700;21;"Buchungsstapel";13;TIMESTAMP;;"RE";"";"";<Beraternr>;<Mandantnr>;<WJ-Beginn>;4;<DatumVon>;<DatumBis>;"Buchungen";"";1;0;0;"EUR";;"";"";"03";"";""
```

### Buchungsstapel columns (essential ones filled)
1. Umsatz — gross amount, German comma format (e.g. "119,00"), always positive
2. Soll/Haben — "S" for expense, "H" for income
7. Konto — DATEV Sachkonto from category mapping
8. Gegenkonto — 1200 (Bank)
9. BU-Schlüssel — 19%→"", 7%→"2", 0%→"40", 16%→"202", 5%→"201"
10. Belegdatum — DDMM (4 digits)
11. Belegfeld 1 — invoice_number (max 36 chars)
14. Buchungstext — description (max 60 chars)
All other columns: empty (semicolons only)

### Kontenbeschriftungen (EXTF category 20)
Header similar but category=20, version=2
Columns: Konto;Kontenbeschriftung;SprachId
Data: `4980;"Betriebsbedarf";"de-DE"`

## Verification
1. Assign DATEV accounts to categories in Settings
2. Set Beraternummer + Mandantennummer
3. Export Buchungsstapel → correct EXTF header, 116 cols, comma amounts, S/H, BU-Schlüssel
4. Export Kontenbeschriftungen → mapped categories appear
5. Preview shows stats + unmapped warnings
6. Existing category CRUD still works
