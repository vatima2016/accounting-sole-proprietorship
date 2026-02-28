# Backup-Ordner einrichten (Google Drive Synchronisation)

Die App speichert Backups als JSON-Dateien in einem lokalen Ordner, der über Google Drive synchronisiert wird.

## Voraussetzungen

[Google Drive for Desktop](https://www.google.com/drive/download/) muss installiert und mit dem Google-Konto angemeldet sein.

## macOS

Google Drive for Desktop erstellt automatisch den Ordner:

```
~/Library/CloudStorage/GoogleDrive-<email>/My Drive/
```

Backup-Ordner anlegen:

```bash
mkdir -p ~/Library/CloudStorage/GoogleDrive-<email>/My\ Drive/Buchhaltung/backups
```

In `.env` eintragen:

```
GOOGLE_DRIVE_BACKUP_PATH=~/Library/CloudStorage/GoogleDrive-<email>/My Drive/Buchhaltung/backups
```

Der Pfad kann auch in der App unter **Einstellungen > Backup-Ordner** geändert werden.

### Tipp

Den genauen Pfad findet man im Finder:
1. Seitenleiste > Google Drive > My Drive
2. Rechtsklick auf einen Ordner > "Informationen"
3. Unter "Ort" steht der vollständige Pfad

## Windows

Google Drive for Desktop erstellt ein virtuelles Laufwerk (standardmäßig `G:`):

```
G:\My Drive\
```

Backup-Ordner anlegen (PowerShell):

```powershell
New-Item -ItemType Directory -Path "G:\My Drive\Buchhaltung\backups" -Force
```

Oder im Explorer: `G:\My Drive\` öffnen und den Ordner `Buchhaltung\backups` erstellen.

In `.env` eintragen:

```
GOOGLE_DRIVE_BACKUP_PATH=G:\My Drive\Buchhaltung\backups
```

### Laufwerksbuchstabe prüfen

Falls das Laufwerk nicht `G:` ist:
1. Google Drive Symbol im System-Tray > Einstellungen (Zahnrad)
2. Unter "Google Drive" steht der zugewiesene Laufwerksbuchstabe

## Konfiguration prüfen

Nach dem Einrichten in der App unter **Einstellungen > Datenbank-Backup** testen:
1. Jahr auswählen und "Backup erstellen" klicken
2. Die Datei sollte im konfigurierten Ordner erscheinen und über Google Drive synchronisiert werden
