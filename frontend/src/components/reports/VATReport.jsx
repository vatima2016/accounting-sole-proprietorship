import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

export default function VATReport({ year: propYear, quarter: propQuarter, onParamsChange }) {
  const now = new Date();
  const year = propYear || now.getFullYear();
  const quarter = propQuarter || Math.ceil((now.getMonth() + 1) / 3);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getVATReport(year, quarter)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, quarter]);

  const setYear = (y) => onParamsChange?.({ year: y });
  const setQuarter = (q) => onParamsChange?.({ quarter: q });

  const years = Array.from({ length: now.getFullYear() - 2017 }, (_, i) => now.getFullYear() - i);

  const kzRows = report ? [
    { kz: '81', label: 'Steuerpfl. Umsätze 19% (Bemessungsgrundlage)', value: report.kennzahlen.kz81_net, exact: report.kennzahlen.kz81_net_exact },
    { kz: '', label: 'USt auf Kz 81', value: report.kennzahlen.kz81_vat },
    { kz: '86', label: 'Steuerpfl. Umsätze 7% (Bemessungsgrundlage)', value: report.kennzahlen.kz86_net, exact: report.kennzahlen.kz86_net_exact },
    { kz: '', label: 'USt auf Kz 86', value: report.kennzahlen.kz86_vat },
    { kz: '41', label: 'Steuerfreie Umsätze', value: report.kennzahlen.kz41_net },
    { kz: '66', label: 'Vorsteuerbeträge', value: report.kennzahlen.kz66_vat },
    { kz: '83', label: 'Verbleibende USt-Vorauszahlung', value: report.kennzahlen.kz83_vat, bold: true },
  ] : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold">USt-Voranmeldung</h3>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
        </select>
        <a
          href={api.exportElster(year, quarter)}
          className="ml-auto px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Elster CSV
        </a>
      </div>

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Laden...</div>
      ) : report && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-16">Kz</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Bezeichnung</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Betrag</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">(berechnet)</th>
              </tr>
            </thead>
            <tbody>
              {kzRows.map((row, i) => (
                <tr key={i} className={`border-b ${row.bold ? 'bg-blue-50 font-semibold' : ''}`}>
                  <td className="px-4 py-2 text-sm text-gray-400">{row.kz}</td>
                  <td className="px-4 py-2 text-sm">{row.label}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(row.value)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-400">{row.exact != null ? `(${formatCurrency(row.exact)})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
