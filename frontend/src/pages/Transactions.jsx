import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import TransactionList from '../components/transactions/TransactionList';
import TransactionFormModal from '../components/transactions/TransactionFormModal';
import TotalsDisplay from '../components/transactions/TotalsDisplay';
import PeriodSelector from '../components/common/PeriodSelector';
import { getPeriodDates } from '../utils/period';

export default function Transactions() {
  const now = new Date();
  const [periodParams, setPeriodParams] = useState({
    period: 'quarter',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.ceil((now.getMonth() + 1) / 3),
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editTransaction, setEditTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(periodParams);
      const result = await api.getTransactions({ page, limit: 50, start_date: start, end_date: end });
      let data = [...result.data];
      data.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortKey === 'gross_amount' || sortKey === 'net_amount' || sortKey === 'vat_amount' || sortKey === 'vat_rate') cmp = a[sortKey] - b[sortKey];
        else cmp = String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
      setTransactions(data);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortDir, periodParams]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Reset to page 1 when period changes
  const handlePeriodChange = (newParams) => {
    setPeriodParams(newParams);
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleRowClick = (transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditTransaction(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditTransaction(null);
    fetchTransactions();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Buchungen</h1>
        <div className="flex items-center gap-4">
          <PeriodSelector {...periodParams} onChange={handlePeriodChange} />
          <button
            onClick={handleNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Neue Buchung
          </button>
        </div>
      </div>

      <div className="mb-6">
        <TotalsDisplay periodParams={periodParams} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : (
        <>
          <TransactionList
            transactions={transactions}
            onRowClick={handleRowClick}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
          {total > 50 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Zurück
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">Seite {page}</span>
              <button
                disabled={page * 50 >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
          )}
        </>
      )}

      <TransactionFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTransaction(null); }}
        transaction={editTransaction}
        onSaved={handleSaved}
      />
    </div>
  );
}
