# Strato Shared Hosting Deployment Guide

Anleitung zum Deployment der Buchhaltungs-App auf Strato Shared Hosting (Apache 2.4, MariaDB 11.8 / MySQL 8.0, SSH + SFTP).

## Inhaltsverzeichnis

1. [Voraussetzungen pruefen](#1-voraussetzungen-pruefen)
2. [Option A: Node.js vorhanden](#2-option-a-nodejs-vorhanden)
3. [Option B: Node.js nicht vorhanden (nvm)](#3-option-b-nodejs-nicht-vorhanden)
4. [Apache-Konfiguration (.htaccess)](#4-apache-konfiguration)
5. [Produktions-Umgebung (.env)](#5-produktions-umgebung)
6. [App starten und am Laufen halten](#6-app-starten)
7. [Backup-Konfiguration](#7-backup-konfiguration)
8. [Sicherheit](#8-sicherheit)
9. [Hinweis: MariaDB/MySQL](#9-hinweis-mariadbmysql)
10. [Wartung und Updates](#10-wartung-und-updates)

---

## 1. Voraussetzungen pruefen

Per SSH auf den Strato-Server verbinden und pruefen, ob Node.js installiert ist:

```bash
ssh benutzername@deine-domain.de

# Node.js pruefen
node --version
npm --version

# Falls nicht gefunden, auch hier pruefen:
which node
ls /usr/local/bin/node*
```

- **Node.js gefunden** (v18+): Weiter mit [Option A](#2-option-a-nodejs-vorhanden)
- **Node.js nicht gefunden**: Weiter mit [Option B](#3-option-b-nodejs-nicht-vorhanden)

---

## 2. Option A: Node.js vorhanden

### 2.1 Code hochladen

Per SFTP oder `rsync` den Code auf den Server laden:

```bash
# Vom lokalen Rechner aus (rsync ueber SSH)
rsync -avz --exclude node_modules --exclude .git --exclude frontend/dist \
  ./ benutzername@deine-domain.de:~/accounting-app/
```

Oder per SFTP-Client (FileZilla, Cyberduck) das gesamte Projekt hochladen — **ohne** `node_modules/` und `.git/`.

### 2.2 Abhaengigkeiten installieren

```bash
cd ~/accounting-app

# Backend-Abhaengigkeiten
cd backend
npm install --production

# Frontend-Abhaengigkeiten + Build
cd ../frontend
npm install
npm run build

# Build-Ergebnis liegt jetzt in frontend/dist/
```

### 2.3 Datenbank initialisieren

Die Datenbank wird beim ersten Start automatisch erstellt (Migrationen + Seeds laufen automatisch). Alternativ manuell:

```bash
cd ~/accounting-app/backend
npm run db:init
```

Die SQLite-Datei liegt dann unter `backend/database/buchhaltung.db`.

### 2.4 Weiter mit

- [Apache-Konfiguration](#4-apache-konfiguration)
- [.env einrichten](#5-produktions-umgebung)
- [App starten](#6-app-starten)

---

## 3. Option B: Node.js nicht vorhanden

Strato erlaubt SSH-Zugang, daher kann Node.js im User-Space ueber **nvm** installiert werden:

```bash
# nvm installieren
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Shell neu laden
source ~/.bashrc
# oder: source ~/.profile

# Node.js LTS installieren
nvm install --lts
nvm use --lts

# Pruefen
node --version   # Sollte v20.x oder v22.x zeigen
npm --version
```

**Wichtig:** Nach der nvm-Installation muss die Shell-Konfiguration geladen sein, damit `node` gefunden wird. Das gilt auch fuer Autostart-Skripte (siehe [App starten](#6-app-starten)).

Danach weiter mit [Option A, Schritt 2.1](#21-code-hochladen).

---

## 4. Apache-Konfiguration

Apache dient als Reverse Proxy fuer das Node.js-Backend und liefert gleichzeitig die gebaute Frontend-SPA aus.

### 4.1 Frontend als DocumentRoot

Die gebauten Frontend-Dateien (`frontend/dist/`) muessen im Web-Root von Apache liegen. Je nach Strato-Konfiguration:

```bash
# Variante 1: Symlink vom Web-Root auf den Build-Ordner
ln -s ~/accounting-app/frontend/dist ~/public_html

# Variante 2: Dateien kopieren (nach jedem Build erneut noetig)
cp -r ~/accounting-app/frontend/dist/* ~/public_html/
```

### 4.2 .htaccess erstellen

Eine `.htaccess` im Web-Root (`public_html/` bzw. dort wo Apache hinschaut) erstellen:

```apache
# Frontend: SPA-Fallback (React Router)
# Alle Anfragen die keine Datei treffen gehen an index.html
RewriteEngine On
RewriteBase /

# API-Anfragen an Node.js Backend weiterleiten (Reverse Proxy)
# Erfordert mod_proxy und mod_proxy_http (bei Strato normalerweise aktiv)
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://127.0.0.1:3020/api/$1 [P,L]

# Statische Dateien direkt ausliefern
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Alles andere an index.html (SPA-Routing)
RewriteRule ^ index.html [L]
```

### 4.3 mod_proxy pruefen

Falls `mod_proxy` bei Strato nicht aktiv ist (503-Fehler bei API-Aufrufen), gibt es eine Alternative: Das Frontend direkt mit dem Backend-Port konfigurieren.

In `frontend/vite.config.js` vor dem Build die API-URL anpassen, oder eine Umgebungsvariable nutzen. Als einfachste Loesung: Backend und Frontend ueber denselben Express-Server ausliefern.

**Express als statischer Server fuer Frontend + API** (Fallback ohne mod_proxy):

```bash
cd ~/accounting-app/backend

# Symlink zum Frontend-Build
ln -s ../frontend/dist public
```

Dann in der `.env` den Port auf den von Strato zugewiesenen setzen oder den Reverse Proxy entsprechend konfigurieren.

---

## 5. Produktions-Umgebung

Die Datei `backend/.env` fuer den Server anpassen:

```env
PORT=3020
NODE_ENV=production
DB_PATH=./database/buchhaltung.db
CORS_ORIGIN=https://deine-domain.de
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
```

**Wichtig:**
- `CORS_ORIGIN` muss die tatsaechliche Domain sein (mit `https://`)
- `NODE_ENV=production` aktivieren
- `GOOGLE_DRIVE_BACKUP_PATH` ist auf dem Server nicht relevant — stattdessen einen Server-Pfad verwenden (siehe [Backup](#7-backup-konfiguration))

---

## 6. App starten

### 6.1 Einfacher Start mit nohup

```bash
cd ~/accounting-app/backend

# App im Hintergrund starten (laeuft weiter nach SSH-Disconnect)
nohup node src/server.js > ~/app.log 2>&1 &

# PID merken
echo $! > ~/app.pid

# Log pruefen
tail -f ~/app.log
```

Zum Stoppen:

```bash
kill $(cat ~/app.pid)
```

### 6.2 Mit screen (besser)

```bash
# Neue screen-Session starten
screen -S accounting

cd ~/accounting-app/backend
node src/server.js

# Detach: Ctrl+A, dann D
# Wieder verbinden: screen -r accounting
```

### 6.3 Mit pm2 (am besten)

Falls npm global installieren moeglich ist:

```bash
npm install -g pm2

cd ~/accounting-app/backend
pm2 start src/server.js --name accounting

# Nuetzliche Befehle
pm2 status
pm2 logs accounting
pm2 restart accounting
pm2 stop accounting
```

### 6.4 Autostart nach Server-Neustart

Bei Strato Shared Hosting gibt es keinen systemd-Zugang. Alternativen:

```bash
# In ~/.bashrc oder ~/.profile einfuegen:
# (Startet die App bei jedem SSH-Login, falls nicht bereits laufend)
if ! pgrep -f "node.*server.js" > /dev/null; then
  cd ~/accounting-app/backend && nohup node src/server.js > ~/app.log 2>&1 &
fi
```

Oder einen Cronjob einrichten:

```bash
crontab -e

# Alle 5 Minuten pruefen ob die App laeuft, sonst starten
*/5 * * * * pgrep -f "node.*server.js" || (cd ~/accounting-app/backend && nohup node src/server.js >> ~/app.log 2>&1 &)
```

Falls nvm genutzt wird, muss der vollstaendige Pfad zu node angegeben werden:

```bash
# Node-Pfad herausfinden
which node
# z.B. /home/benutzername/.nvm/versions/node/v22.14.0/bin/node

# Im Cronjob dann:
*/5 * * * * pgrep -f "node.*server.js" || (cd ~/accounting-app/backend && /home/benutzername/.nvm/versions/node/v22.14.0/bin/node src/server.js >> ~/app.log 2>&1 &)
```

---

## 7. Backup-Konfiguration

### 7.1 Backup-Pfad anpassen

In der `.env` einen Server-Pfad fuer Backups setzen:

```env
GOOGLE_DRIVE_BACKUP_PATH=/home/benutzername/backups/buchhaltung
```

Verzeichnis anlegen:

```bash
mkdir -p ~/backups/buchhaltung
```

Die App erstellt dort automatisch JSON-Backups und Datenbank-Kopien ueber die Web-Oberflaeche.

### 7.2 Automatisches Backup per Cronjob

Zusaetzlich zum In-App-Backup ein automatisches Datenbank-Backup:

```bash
crontab -e

# Taeglich um 2:00 Uhr die Datenbank sichern
0 2 * * * cp ~/accounting-app/backend/database/buchhaltung.db ~/backups/buchhaltung/buchhaltung_$(date +\%Y-\%m-\%d).db
```

### 7.3 Backups herunterladen

Regelmaessig Backups vom Server auf den lokalen Rechner laden:

```bash
# Vom lokalen Rechner aus
rsync -avz benutzername@deine-domain.de:~/backups/buchhaltung/ ./strato-backups/
```

---

## 8. Sicherheit

### 8.1 Backend-Dateien schuetzen

Falls der Backend-Code innerhalb des Web-Roots liegt, muss der Zugriff blockiert werden. Eine `.htaccess` im Backend-Verzeichnis:

```apache
# backend/.htaccess
Deny from all
```

Besser: Backend-Code **ausserhalb** des Web-Roots halten (`~/accounting-app/` statt in `~/public_html/`).

### 8.2 Datenbank schuetzen

Die SQLite-Datei darf niemals ueber das Web erreichbar sein:

```apache
# In der Haupt-.htaccess
<FilesMatch "\.(db|db-wal|db-shm|sqlite)$">
  Deny from all
</FilesMatch>
```

### 8.3 .env schuetzen

```apache
<FilesMatch "^\.env">
  Deny from all
</FilesMatch>
```

### 8.4 HTTPS aktivieren

Strato bietet kostenlose SSL-Zertifikate (Let's Encrypt) ueber das Strato-Kundenportal:

1. Im Strato-Kundenportal einloggen
2. Unter **Sicherheit > SSL-Zertifikat** das kostenlose Zertifikat aktivieren
3. HTTPS-Weiterleitung in der `.htaccess`:

```apache
# HTTP zu HTTPS umleiten
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

### 8.5 Zugangsschutz (optional)

Falls die App nicht oeffentlich sein soll, HTTP Basic Auth hinzufuegen:

```bash
# .htpasswd erstellen
htpasswd -c ~/accounting-app/.htpasswd benutzername
```

In der `.htaccess`:

```apache
AuthType Basic
AuthName "Buchhaltung"
AuthUserFile /home/benutzername/accounting-app/.htpasswd
Require valid-user
```

---

## 9. Hinweis: MariaDB/MySQL

Die App nutzt **SQLite** als Datenbank. Fuer eine Einzelbenutzer-Buchhaltung ist das voellig ausreichend und hat Vorteile:

- Kein Datenbankserver noetig
- Backup = Datei kopieren
- Einfaches Setup

Eine Migration auf MariaDB/MySQL waere moeglich, erfordert aber:

- Austausch von `better-sqlite3` durch einen MySQL-Treiber (z.B. `mysql2`)
- Anpassung aller Datenbank-Queries (SQLite-spezifische Syntax ersetzen)
- Umschreiben der synchronen DB-Aufrufe auf `async/await` (better-sqlite3 ist synchron, mysql2 ist asynchron)
- Erstellen der Tabellen in MariaDB (Migrationen anpassen)
- Anpassung des Backup-Systems (mysqldump statt Datei kopieren)

**Empfehlung:** Bei SQLite bleiben, solange die App nur von einer Person genutzt wird.

---

## 10. Wartung und Updates

### Code aktualisieren

```bash
cd ~/accounting-app

# Neuen Code hochladen (rsync vom lokalen Rechner)
rsync -avz --exclude node_modules --exclude .git --exclude backend/database \
  --exclude backend/.env --exclude frontend/dist \
  ./ benutzername@deine-domain.de:~/accounting-app/

# Auf dem Server
cd ~/accounting-app/backend && npm install --production
cd ~/accounting-app/frontend && npm install && npm run build

# Frontend-Build aktualisieren (falls Symlink)
# nichts noetig — Symlink zeigt bereits auf frontend/dist/

# Backend neu starten
kill $(cat ~/app.pid)
cd ~/accounting-app/backend && nohup node src/server.js > ~/app.log 2>&1 &
echo $! > ~/app.pid
```

### Logs pruefen

```bash
tail -100 ~/app.log
```

### Speicherplatz pruefen

```bash
du -sh ~/accounting-app/
du -sh ~/backups/
df -h ~
```
