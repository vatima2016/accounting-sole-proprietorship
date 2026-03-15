import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';
import TransactionList from '../components/transactions/TransactionList';
import TransactionFormModal from '../components/transactions/TransactionFormModal';

const SEARCH_STORAGE_KEY = 'searchParams';

function loadSearchParams() {
  try {
    const saved = sessionStorage.getItem(SEARCH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { amount: '', date: '', invoice: '', sortKey: 'date', sortDir: 'desc' };
}

export default function Search() {
  const saved = loadSearchParams();
  const [searchAmount, setSearchAmount] = useState(saved.amount);
  const [searchDate, setSearchDate] = useState(saved.date);
  const [searchInvoice, setSearchInvoice] = useState(saved.invoice);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState(saved.sortKey);
  const [sortDir, setSortDir] = useState(saved.sortDir);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      if (tableContainerRef.current) {
        const firstRow = tableContainerRef.current.querySelector('tbody tr');
        const headerRow = tableContainerRef.current.querySelector('thead tr');
        const rowHeight = firstRow ? firstRow.offsetHeight : 37;
        const headerHeight = headerRow ? headerRow.offsetHeight : 41;
        const available = tableContainerRef.current.clientHeight - headerHeight;
        setPageSize(Math.max(10, Math.floor(available / rowHeight)));
      }
    };
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [loading]);

  const fetchResults = useCallback(async (pg = page) => {
    const params = { page: pg, limit: pageSize, sort: sortKey, dir: sortDir };
    if (searchAmount) params.search_amount = searchAmount.replace(',', '.');
    if (searchDate) {
      // Convert DD.MM.YYYY to YYYY-MM-DD for the API
      const parts = searchDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (parts) {
        params.search_date = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    if (searchInvoice) params.search_invoice = searchInvoice;

    setLoading(true);
    try {
      const result = await api.getTransactions(params);
      setTransactions(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortKey, sortDir, searchAmount, searchDate, searchInvoice]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setHasSearched(true);
    sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify({ amount: searchAmount, date: searchDate, invoice: searchInvoice, sortKey, sortDir }));
    fetchResults(1);
  };

  const handleClear = () => {
    setSearchAmount('');
    setSearchDate('');
    setSearchInvoice('');
    setTransactions([]);
    setTotal(0);
    setHasSearched(false);
    setPage(1);
    sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  };

  const hasAnyCriteria = searchAmount || searchDate || searchInvoice;

  useEffect(() => {
    if (hasSearched) fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortDir, pageSize]);

  const handleSort = (key) => {
    setPage(1);
    let newKey = sortKey, newDir = sortDir;
    if (sortKey === key) {
      newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
    } else {
      newKey = key;
      newDir = 'asc';
      setSortKey(newKey);
      setSortDir(newDir);
    }
    const prev = loadSearchParams();
    sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify({ ...prev, sortKey: newKey, sortDir: newDir }));
  };

  const handleRowClick = (transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditTransaction(null);
    fetchResults();
  };

  const totalPages = Math.ceil(total / pageSize);
  const btnClass = "px-2 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-100 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Suche</h1>
        <form onSubmit={handleSearch} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Betrag (EUR)</label>
            <input
              type="text"
              inputMode="decimal"
              value={searchAmount}
              onChange={e => setSearchAmount(e.target.value)}
              placeholder="z.B. 119,00"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
            <input
              type="text"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              placeholder="TT.MM.JJJJ"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Beleg-Nr.</label>
            <input
              type="text"
              value={searchInvoice}
              onChange={e => setSearchInvoice(e.target.value)}
              placeholder="z.B. RE-"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!hasAnyCriteria}
            className="bg-blue-600 text-white min-w-[7rem] py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suchen
          </button>
          {hasAnyCriteria && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-red-500 p-2"
              title="Suchkriterien löschen"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </form>
      </div>

      {!hasSearched ? (
        <div className="text-center py-12 text-gray-400">Suchkriterien eingeben und auf &quot;Suchen&quot; klicken.</div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-400">Suche...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Keine Ergebnisse gefunden.</div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-2 shrink-0">{total} Ergebnis{total !== 1 ? 'se' : ''}</div>
          <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-auto">
            <TransactionList
              transactions={transactions}
              onRowClick={handleRowClick}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </div>
          {total > pageSize && (
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
