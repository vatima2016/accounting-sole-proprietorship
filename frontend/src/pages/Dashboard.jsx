import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatting';

export default function Dashboard() {
  const [totals, setTotals] = useState(null);
  const [ytdTotals, setYtdTotals] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    api.getTotals({ period: 'month', year: currentYear, month: currentMonth }).then(setTotals).catch(console.error);
    api.getTotals({ period: 'year', year: currentYear }).then(setYtdTotals).catch(console.error);
    api.getTransactions({ limit: 5 }).then(r => setRecentTransactions(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Current Month */}
      {totals && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            {getMonthName(currentMonth)} {currentYear}
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <Card label="Einnahmen" value={totals.income.gross} color="text-green-700" bg="bg-green-50" />
            <Card label="Ausgaben" value={totals.expenses.gross} color="text-red-700" bg="bg-red-50" />
            <Card label="Gewinn" value={totals.profit} color={totals.profit >= 0 ? 'text-green-700' : 'text-red-700'} bg="bg-blue-50" />
            <Card label="USt-Zahllast" value={totals.vatLiability} color="text-gray-700" bg="bg-yellow-50" />
          </div>
        </div>
      )}

      {/* YTD */}
      {ytdTotals && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Jahr {currentYear} (kumuliert)
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <Card label="Einnahmen" value={ytdTotals.income.gross} color="text-green-700" bg="bg-green-50" />
            <Card label="Ausgaben" value={ytdTotals.expenses.gross} color="text-red-700" bg="bg-red-50" />
            <Card label="Gewinn" value={ytdTotals.profit} color={ytdTotals.profit >= 0 ? 'text-green-700' : 'text-red-700'} bg="bg-blue-50" />
            <Card label="USt-Zahllast" value={ytdTotals.vatLiability} color="text-gray-700" bg="bg-yellow-50" />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Letzte Buchungen</h2>
          <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">Alle anzeigen</Link>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <tbody>
              {recentTransactions.map(t => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-2.5 text-sm">{t.description}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{t.category_name}</td>
                  <td className={`px-4 py-2.5 text-sm font-medium text-right ${t.transaction_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.gross_amount)}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">Keine Buchungen</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-lg p-4`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</div>
    </div>
  );
}
