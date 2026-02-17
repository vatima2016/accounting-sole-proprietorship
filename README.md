# Buchhaltung für Einzelunternehmer

Eine lokale Webanwendung für die Buchhaltung eines Einzelunternehmers mit deutscher Umsatzsteuer-Compliance.

## Features

- ✅ Lokale SQLite-Datenbank mit Google Drive Sync
- ✅ Brutto → Netto Berechnung (0%, 7%, 19% USt)
- ✅ Intelligente Beschreibungsvorschläge mit Häufigkeitstracking
- ✅ Popup-Formular für schnelle Dateneingabe
- ✅ Pflicht-Kategorieauswahl mit Standardwert
- ✅ Dynamische Zusammenfassung (Monat/Quartal/Jahr)
- ✅ Quartalsweise USt-Voranmeldung
- ✅ Jahresberichte für Steuerberater
- ✅ CSV/Excel Export für Elster

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Node.js + Express + Better-SQLite3
- **Database:** SQLite (file-based, Google Drive sync)

## Installation

### Voraussetzungen
- Node.js 18+
- npm oder yarn
- Google Drive Desktop (für Backup)

### Setup

1. **Repository klonen:**
   ```bash
   cd ~/workspace
   git clone <repository-url>
   cd accounting-sole-proprietorship
   ```

2. **Backend installieren:**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend installieren:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Datenbank konfigurieren:**
   ```bash
   # Backend .env erstellen
   cd ../backend
   cp .env.example .env
   
   # Datenbank-Pfad zu Google Drive anpassen:
   # DB_PATH=~/GoogleDrive/Buchhaltung/buchhaltung.db
   ```

5. **Datenbank initialisieren:**
   ```bash
   cd backend
   npm run db:init
   ```

6. **Anwendung starten:**
   ```bash
   # Von Root-Verzeichnis
   npm run dev
   ```

Die Anwendung läuft auf:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Projektstruktur

```
accounting-sole-proprietorship/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── config/            # Datenbank-Konfiguration
│   │   ├── controllers/       # Request Handler
│   │   ├── routes/            # API Endpoints
│   │   ├── services/          # Business Logic
│   │   └── server.js          # Express App
│   ├── database/
│   │   ├── migrations/        # DB Schema
│   │   └── seeds/             # Initiale Daten
│   └── package.json
│
├── frontend/                   # React Vite App
│   ├── src/
│   │   ├── components/        # React Components
│   │   ├── pages/             # Page Components
│   │   ├── services/          # API Client
│   │   ├── hooks/             # Custom Hooks
│   │   ├── utils/             # Helper Functions
│   │   └── App.jsx
│   └── package.json
│
├── docs/                       # Dokumentation
└── package.json               # Root Scripts
```

## Verwendung

### Neue Buchung erstellen

1. Klick auf "➕ Neue Buchung"
2. Popup öffnet sich über der Liste
3. Kategorie wird automatisch vorbelegt (letzte verwendet)
4. Brutto-Betrag eingeben (wie auf Rechnung)
5. System berechnet Netto und USt automatisch
6. Beschreibung eintippen → Vorschläge erscheinen
7. Speichern → Buchung erscheint in Liste

### Zeitraum auswählen

- **Dropdown:** Monat / Quartal / Jahr
- **Standard:** Aktuelles Quartal
- **Zusammenfassung:** Aktualisiert sich automatisch

### Berichte erstellen

- **USt-Voranmeldung:** Quartalsweise für Elster
- **Jahresbericht:** Export für Steuerberater
- **CSV Export:** Für weitere Verarbeitung

## Datenbank Backup

Die Datenbank wird automatisch in Google Drive synchronisiert:

```
~/GoogleDrive/Buchhaltung/
├── buchhaltung.db              # Aktuelle Datenbank
├── backups/
│   ├── buchhaltung_2026-01-31.db
│   ├── buchhaltung_2026-02-28.db
│   └── ...
└── exports/
    ├── USt-2026-Q1.csv
    └── Jahresbericht-2025.xlsx
```

## Kategorien

### Einnahmen (2)
- Provisionen (19% USt)
- Provisionen USt frei (0% USt)

### Ausgaben (10)
- Betriebsbedarf
- Bewirtungskosten Büro
- Franchise/Lizenzkosten
- Geringwertige Wirtschaftsgüter
- Kfz-Kosten (betriebl. Anteil)
- Kosten der Warenabgabe
- Raumkosten
- Telefon, Internet, Porto
- Verkaufsprovisionen
- Werbekosten

## Entwicklung

### Befehle

```bash
# Backend entwickeln
cd backend
npm run dev              # Mit Nodemon

# Frontend entwickeln
cd frontend
npm run dev              # Vite Dev Server

# Beide gleichzeitig (von Root)
npm run dev              # Concurrently

# Tests
npm test

# Build für Production
npm run build
```

### Datenbank Migrationen

```bash
cd backend
npm run db:migrate       # Neue Migration ausführen
npm run db:seed          # Seed-Daten einfügen
npm run db:reset         # Datenbank zurücksetzen
```

## Troubleshooting

### Port bereits in Verwendung

```bash
# Backend Port ändern in backend/.env
PORT=3002

# Frontend Port ändern in frontend/vite.config.js
server: { port: 5174 }
```

### Datenbank gesperrt

```bash
# Alle Node-Prozesse beenden
pkill node

# Oder spezifisch
lsof -ti:3001 | xargs kill -9
```

### Google Drive Sync-Probleme

1. Stelle sicher, dass Google Drive Desktop läuft
2. Überprüfe den Pfad in `.env`
3. Manuelles Backup: `npm run db:backup`

## Lizenz

Privates Projekt für Einzelunternehmer-Buchhaltung

## Support

Bei Fragen siehe `docs/` Verzeichnis oder GitHub Issues.
