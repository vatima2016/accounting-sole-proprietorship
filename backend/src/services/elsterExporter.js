const { generateVATReport } = require('./reportGenerator');

function formatGermanDecimal(num) {
  return num.toFixed(2).replace('.', ',');
}

function exportElsterCSV(year, quarter) {
  const report = generateVATReport(year, quarter);
  const kz = report.kennzahlen;

  // UTF-8 BOM for Excel
  const BOM = '\uFEFF';

  const header = ['Kennzahl', 'Bezeichnung', 'Betrag'].join(';');
  const rows = [
    ['81', 'Steuerpfl. Umsätze 19% (Bemessungsgrundlage)', String(kz.kz81_net).replace('.', ',')],
    ['81_vat', 'USt auf Kz 81', formatGermanDecimal(kz.kz81_vat)],
    ['86', 'Steuerpfl. Umsätze 7% (Bemessungsgrundlage)', String(kz.kz86_net).replace('.', ',')],
    ['86_vat', 'USt auf Kz 86', formatGermanDecimal(kz.kz86_vat)],
    ['41', 'Steuerfreie Umsätze', formatGermanDecimal(kz.kz41_net)],
    ['66', 'Vorsteuerbeträge', formatGermanDecimal(kz.kz66_vat)],
    ['83', 'Verbleibende USt-Vorauszahlung', formatGermanDecimal(kz.kz83_vat)],
  ];

  const csv = BOM + header + '\n' + rows.map(r => r.join(';')).join('\n');
  return csv;
}

module.exports = { exportElsterCSV };
