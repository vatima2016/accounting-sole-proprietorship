import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

export default function YearlyReport({ year: propYear, onYearChange }) {
  const year = propYear || new Date().getFullYear();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getYearlyReport(year)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const setYear = (y) => onYearChange?.(y);
  const now = new Date();
  const years = Array.from({ length: now.getFullYear() - 2017 }, (_, i) => now.getFullYear() - i);

  const Section = ({ title, items, color }) => (
    <div className="mb-6">
      <h4 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${color}`}>{title}</h4>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Kategorie</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Anz.</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Brutto</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Netto</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">USt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2 text-sm">{item.category}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-500">{item.count}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.gross)}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.net)}</td>
                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.vat)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-sm">Keine Daten</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold">Jahresübersicht</h3>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <a
          href={api.exportCSV({ start_date: `${year}-01-01`, end_date: `${year}-12-31` })}
          className="ml-auto px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          CSV Export
        </a>
      </div>

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Laden...</div>
      ) : report && (
        <>
          <Section title="Einnahmen" items={report.income} color="text-green-700" />
          <Section title="Ausgaben" items={report.expenses} color="text-red-700" />

          <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Einnahmen: {formatCurrency(report.totalIncome)}</div>
              <div className="text-sm text-gray-500">Ausgaben: {formatCurrency(report.totalExpenses)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Gewinn</div>
              <div className={`text-xl font-bold ${report.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(report.profit)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
