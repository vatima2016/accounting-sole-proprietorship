import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import TransactionList from '../components/transactions/TransactionList';
import TransactionFormModal from '../components/transactions/TransactionFormModal';
import TotalsDisplay from '../components/transactions/TotalsDisplay';
import PeriodSelector from '../components/common/PeriodSelector';
import { getPeriodDates } from '../utils/period';

const STORAGE_KEY = 'periodParams';
const SORT_STORAGE_KEY = 'transactionSort';

function loadPeriodParams() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const now = new Date();
  return {
    period: 'quarter',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.ceil((now.getMonth() + 1) / 3),
  };
}

export default function Transactions() {
  const [periodParams, setPeriodParams] = useState(loadPeriodParams);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SORT_STORAGE_KEY))?.key || 'date'; } catch { return 'date'; }
  });
  const [sortDir, setSortDir] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SORT_STORAGE_KEY))?.dir || 'desc'; } catch { return 'desc'; }
  });
  const [editTransaction, setEditTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [totalsKey, setTotalsKey] = useState(0);
  const [highlightId, setHighlightId] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const tableContainerRef = useRef(null);

  // Measure actual available height for the table container and derive page size
  useEffect(() => {
    const measure = () => {
      if (tableContainerRef.current) {
        // Measure actual row height from rendered table, fallback to 37px
        const firstRow = tableContainerRef.current.querySelector('tbody tr');
        const headerRow = tableContainerRef.current.querySelector('thead tr');
        const rowHeight = firstRow ? firstRow.offsetHeight : 37;
        const headerHeight = headerRow ? headerRow.offsetHeight : 41;
        const available = tableContainerRef.current.clientHeight - headerHeight;
        setPageSize(Math.max(10, Math.floor(available / rowHeight)));
      }
    };
    // Delay to ensure DOM is rendered
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [loading]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(periodParams);
      const result = await api.getTransactions({ page, limit: pageSize, start_date: start, end_date: end, sort: sortKey, dir: sortDir, type: typeFilter || undefined });
      setTransactions(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortKey, sortDir, periodParams, typeFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Reset to page 1 when period changes, persist to localStorage
  const handlePeriodChange = (newParams) => {
    setPeriodParams(newParams);
    setPage(1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newParams));
  };

  const handleSort = (key) => {
    setPage(1);
    let newDir;
    if (sortKey === key) {
      newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
    } else {
      newDir = 'asc';
      setSortKey(key);
      setSortDir(newDir);
    }
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: sortKey === key ? key : key, dir: newDir }));
  };

  const handleRowClick = (transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditTransaction(null);
    setShowForm(true);
  };

  const handleSaved = (savedId) => {
    setShowForm(false);
    setEditTransaction(null);
    setHighlightId(savedId ?? null);
    fetchTransactions();
    setTotalsKey(k => k + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Buchungen</h1>
        <div className="flex items-center gap-4">
          <div className="flex rounded-md border border-gray-300 text-sm overflow-hidden">
            {[['', 'Alle'], ['income', 'Einnahmen'], ['expense', 'Ausgaben']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setTypeFilter(val); setPage(1); }}
                className={`px-3 py-1.5 ${typeFilter === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <PeriodSelector {...periodParams} onChange={handlePeriodChange} />
          <button
            onClick={() => {
              const now = new Date();
              handlePeriodChange({ period: 'quarter', year: now.getFullYear(), month: now.getMonth() + 1, quarter: Math.ceil((now.getMonth() + 1) / 3) });
            }}
            className="text-gray-400 hover:text-gray-600 text-sm"
            title="Aktuelles Quartal"
          >
            Heute
          </button>
          <button
            onClick={handleNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Neue Buchung
          </button>
        </div>
      </div>

      <div className="mb-4 shrink-0">
        <TotalsDisplay periodParams={periodParams} refreshKey={totalsKey} typeFilter={typeFilter} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : (
        <>
          <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-auto">
            <TransactionList
              transactions={transactions}
              onRowClick={handleRowClick}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              highlightId={highlightId}
            />
          </div>
          {total > pageSize && (() => {
            const totalPages = Math.ceil(total / pageSize);
            const btnClass = "px-2 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-100 disabled:hover:bg-transparent";
            return (
              <div className="flex justify-center items-center gap-1 py-3 shrink-0">
                <button disabled={page === 1} onClick={() => setPage(1)} className={btnClass} title="Erste Seite">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                </button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={btnClass} title="Vorherige Seite">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className={btnClass} title="Nächste Seite">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className={btnClass} title="Letzte Seite">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                </button>
              </div>
            );
          })()}
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
