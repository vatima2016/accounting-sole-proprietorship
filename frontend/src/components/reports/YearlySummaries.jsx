import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

export default function YearlySummaries() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getYearlySummaries(2018)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Jahresvergleich</h3>

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Laden...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Jahr</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Buchungen</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Einnahmen</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Ausgaben</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Gewinn</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.year} className="border-b">
                  <td className="px-4 py-2 text-sm font-medium">{row.year}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-500">{row.count}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-700">{formatCurrency(row.income)}</td>
                  <td className="px-4 py-2 text-sm text-right text-red-700">{formatCurrency(row.expenses)}</td>
                  <td className={`px-4 py-2 text-sm text-right font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-sm">Keine Daten</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
