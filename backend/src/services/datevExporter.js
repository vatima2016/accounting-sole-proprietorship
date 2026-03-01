const { getDatabase } = require('../config/database');
const { centsToEuros } = require('../utils/vatCalculations');

const BOM = '\uFEFF';
const CRLF = '\r\n';

function getSettings() {
  const db = getDatabase();
  const beraternr = db.prepare("SELECT value FROM settings WHERE key = 'datev_beraternr'").get();
  const mandantnr = db.prepare("SELECT value FROM settings WHERE key = 'datev_mandantnr'").get();
  return {
    beraternr: beraternr?.value || '',
    mandantnr: mandantnr?.value || '',
  };
}

function formatAmount(cents) {
  const euros = Math.abs(centsToEuros(cents));
  return euros.toFixed(2).replace('.', ',');
}

function formatBelegdatum(dateStr) {
  // dateStr is YYYY-MM-DD, output DDMM
  const parts = dateStr.split('-');
  return parts[2] + parts[1];
}

function buSchluessel(vatRate) {
  if (vatRate === 19) return '';
  if (vatRate === 7) return '2';
  if (vatRate === 0) return '40';
  // 16% and 5% (2020 rates)
  if (vatRate === 16) return '35';
  if (vatRate === 5) return '36';
  return '';
}

function escapeField(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(';') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function pad(count) {
  return new Array(count).fill('').join(';');
}

function generateBuchungsstapel(year) {
  const db = getDatabase();
  const settings = getSettings();

  const transactions = db.prepare(`
    SELECT t.*, c.name as category_name, c.datev_account
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
    ORDER BY t.date, t.id
  `).all(`${year}-01-01`, `${year}-12-31`);

  const lines = [];

  // EXTF header line 1
  const now = new Date();
  const created = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') + '000';

  const headerFields = [
    '"EXTF"',       // 1 Format
    '700',          // 2 Versionsnummer
    '21',           // 3 Datenkategorie (Buchungsstapel)
    '"Buchungsstapel"', // 4 Formatname
    '12',           // 5 Formatversion
    created,        // 6 Erzeugt am
    '',             // 7 Importiert
    '"RE"',         // 8 Herkunft
    '""',           // 9 Exportiert von
    '""',           // 10 Importiert von
    escapeField(settings.beraternr), // 11 Beraternummer
    escapeField(settings.mandantnr), // 12 Mandantennummer
    `${year}0101`,  // 13 WJ-Beginn
    '4',            // 14 Sachkontenlänge
    `${year}0101`,  // 15 Datum von
    `${year}1231`,  // 16 Datum bis
    '""',           // 17 Bezeichnung
    '""',           // 18 Diktatkürzel
    '0',            // 19 Buchungstyp
    '0',            // 20 Rechnungslegungszweck
    '0',            // 21 Festschreibung
    '""',           // 22 WKZ
    '',             // 23-26
    '',
    '',
    '',
  ];
  lines.push(headerFields.join(';'));

  // Column header line
  const colHeaders = [
    'Umsatz (ohne Soll/Haben-Kz)',  // 1
    'Soll/Haben-Kennzeichen',       // 2
    'WKZ Umsatz',                   // 3
    'Kurs',                         // 4
    'Basis-Umsatz',                 // 5
    'WKZ Basis-Umsatz',             // 6
    'Konto',                        // 7
    'Gegenkonto (ohne BU-Schlüssel)', // 8
    'BU-Schlüssel',                 // 9
    'Belegdatum',                   // 10
    'Belegfeld 1',                  // 11
    'Belegfeld 2',                  // 12
    'Skonto',                       // 13
    'Buchungstext',                 // 14
  ];
  // Pad to 116 columns
  while (colHeaders.length < 116) colHeaders.push('');
  lines.push(colHeaders.join(';'));

  let exported = 0;
  let skipped = 0;
  const unmappedCategories = new Set();

  for (const t of transactions) {
    if (!t.datev_account) {
      skipped++;
      if (t.category_name) unmappedCategories.add(t.category_name);
      continue;
    }

    const amount = formatAmount(t.gross_amount_cents);
    // S = Soll (debit), H = Haben (credit)
    // Income = H (credit to revenue account), Expense = S (debit to expense account)
    const sh = t.transaction_type === 'income' ? 'H' : 'S';
    const konto = escapeField(t.datev_account);
    const gegenkonto = '1200';
    const bu = buSchluessel(t.vat_rate);
    const belegdatum = formatBelegdatum(t.date);
    const belegfeld1 = escapeField(t.invoice_number || '');
    const buchungstext = escapeField((t.description || '').substring(0, 60));

    const dataFields = [
      amount,       // 1 Umsatz
      sh,           // 2 Soll/Haben
      '',           // 3 WKZ Umsatz
      '',           // 4 Kurs
      '',           // 5 Basis-Umsatz
      '',           // 6 WKZ Basis-Umsatz
      konto,        // 7 Konto
      gegenkonto,   // 8 Gegenkonto
      bu,           // 9 BU-Schlüssel
      belegdatum,   // 10 Belegdatum
      belegfeld1,   // 11 Belegfeld 1
      '',           // 12 Belegfeld 2
      '',           // 13 Skonto
      buchungstext, // 14 Buchungstext
    ];
    // Pad to 116 columns
    while (dataFields.length < 116) dataFields.push('');
    lines.push(dataFields.join(';'));
    exported++;
  }

  const csv = BOM + lines.join(CRLF) + CRLF;
  const filename = `EXTF_Buchungsstapel_${year}.csv`;

  return {
    csv,
    filename,
    stats: {
      exported,
      skipped,
      total: transactions.length,
      unmappedCategories: Array.from(unmappedCategories),
    },
  };
}

function generateKontenbeschriftungen(year) {
  const db = getDatabase();
  const settings = getSettings();

  const categories = db.prepare(
    "SELECT * FROM categories WHERE datev_account IS NOT NULL AND datev_account != '' AND is_active = 1 ORDER BY datev_account"
  ).all();

  const lines = [];

  // EXTF header line 1
  const now = new Date();
  const created = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') + '000';

  const headerFields = [
    '"EXTF"',       // 1 Format
    '700',          // 2 Versionsnummer
    '20',           // 3 Datenkategorie (Kontenbeschriftungen)
    '"Kontenbeschriftungen"', // 4 Formatname
    '2',            // 5 Formatversion
    created,        // 6 Erzeugt am
    '',             // 7 Importiert
    '"RE"',         // 8 Herkunft
    '""',           // 9 Exportiert von
    '""',           // 10 Importiert von
    escapeField(settings.beraternr), // 11 Beraternummer
    escapeField(settings.mandantnr), // 12 Mandantennummer
    `${year}0101`,  // 13 WJ-Beginn
    '4',            // 14 Sachkontenlänge
    `${year}0101`,  // 15 Datum von
    `${year}1231`,  // 16 Datum bis
    '""',           // 17 Bezeichnung
    '""',           // 18 Diktatkürzel
    '',             // 19
    '',             // 20
    '',             // 21
    '""',           // 22 WKZ
    '',
    '',
    '',
    '',
  ];
  lines.push(headerFields.join(';'));

  // Column header
  lines.push('Konto;Kontenbeschriftung;SprachId');

  // Bank account
  lines.push('1200;Bank;1');

  for (const cat of categories) {
    lines.push(`${escapeField(cat.datev_account)};${escapeField(cat.name)};1`);
  }

  const csv = BOM + lines.join(CRLF) + CRLF;
  const filename = `EXTF_Kontenbeschriftungen_${year}.csv`;

  return {
    csv,
    filename,
    count: categories.length + 1, // +1 for Bank
  };
}

module.exports = { generateBuchungsstapel, generateKontenbeschriftungen, getSettings };
