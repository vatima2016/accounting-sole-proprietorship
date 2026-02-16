import { formatCurrency } from '../../utils/formatting';

export default function CalculationDisplay({ grossAmount, vatRate }) {
  const gross = Number(String(grossAmount).replace(',', '.')) || 0;
  const rate = Number(vatRate) || 0;

  const net = rate === 0 ? gross : Math.round((gross / (1 + rate / 100)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;

  return (
    <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-600">Brutto</span>
        <span className="font-medium">{formatCurrency(gross)}</span>
      </div>
      <div className="flex justify-between text-gray-500">
        <span>- USt ({rate}%)</span>
        <span>{formatCurrency(vat)}</span>
      </div>
      <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
        <span>= Netto</span>
        <span>{formatCurrency(net)}</span>
      </div>
    </div>
  );
}
