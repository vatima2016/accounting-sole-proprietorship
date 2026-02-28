import { formatCurrency, formatDate } from '../../utils/formatting';

export default function TransactionRow({ transaction, onClick }) {
  const isIncome = transaction.transaction_type === 'income';

  return (
    <tr
      onClick={() => onClick(transaction)}
      className="hover:bg-blue-50 cursor-pointer border-b border-gray-100"
    >
      <td className="px-4 py-2.5 text-sm">{formatDate(transaction.date)}</td>
      <td className="px-4 py-2.5 text-sm">{transaction.description}</td>
      <td className="px-4 py-2.5 text-sm text-gray-600">{transaction.category_name}</td>
      <td className={`px-4 py-2.5 text-sm font-medium text-right ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.gross_amount)}
      </td>
      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{transaction.vat_rate}%</td>
      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{formatCurrency(transaction.net_amount)}</td>
      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{formatCurrency(transaction.vat_amount)}</td>
      <td className="px-4 py-2.5 text-sm text-gray-500">{transaction.invoice_number || ''}</td>
    </tr>
  );
}
