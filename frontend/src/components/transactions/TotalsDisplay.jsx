import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

export default function TotalsDisplay({ periodParams, refreshKey }) {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    api.getTotals(periodParams).then(setTotals).catch(console.error);
  }, [periodParams, refreshKey]);

  if (!totals) return null;

  const cards = [
    { label: 'Einnahmen', value: totals.income.gross, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Ausgaben', value: totals.expenses.gross, color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Gewinn', value: totals.profit, color: totals.profit >= 0 ? 'text-green-700' : 'text-red-700', bg: 'bg-blue-50' },
    { label: 'USt-Zahllast', value: totals.vatLiability, color: 'text-gray-700', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`${c.bg} rounded-lg p-4`}>
          <div className="text-xs text-gray-500 mb-1">{c.label}</div>
          <div className={`text-lg font-bold ${c.color}`}>{formatCurrency(c.value)}</div>
        </div>
      ))}
    </div>
  );
}
