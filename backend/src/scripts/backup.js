const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDatabase } = require('../config/database');

const backupPath = process.env.GOOGLE_DRIVE_BACKUP_PATH;

if (!backupPath) {
  console.error('GOOGLE_DRIVE_BACKUP_PATH not set');
  process.exit(1);
}

// Ensure backup directory exists
if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(backupPath, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const destFile = path.join(backupPath, `buchhaltung_${timestamp}.db`);

const db = getDatabase();
db.backup(destFile).then(() => {
  console.log(`Backup created: ${destFile}`);
  process.exit(0);
}).catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
