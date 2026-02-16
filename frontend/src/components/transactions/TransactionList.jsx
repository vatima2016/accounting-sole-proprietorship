import TransactionRow from './TransactionRow';

const columns = [
  { label: 'Datum', key: 'date' },
  { label: 'Beschreibung', key: 'description' },
  { label: 'Kategorie', key: 'category_name' },
  { label: 'Brutto', key: 'gross_amount', align: 'right' },
  { label: 'USt%', key: 'vat_rate', align: 'right' },
  { label: 'Netto', key: 'net_amount', align: 'right' },
  { label: 'USt', key: 'vat_amount', align: 'right' },
];

export default function TransactionList({ transactions, onRowClick, sortKey, sortDir, onSort }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort?.(col.key)}
                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
                {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                Keine Buchungen vorhanden
              </td>
            </tr>
          ) : (
            transactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} onClick={onRowClick} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
