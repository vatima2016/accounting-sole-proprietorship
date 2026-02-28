import { getMonthName } from '../../utils/formatting';

export default function PeriodSelector({ period, year, month, quarter, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={period}
        onChange={(e) => onChange({ period: e.target.value, year, month, quarter })}
        className="border border-gray-300 rounded-lg px-3 py-1.5"
      >
        <option value="month">Monat</option>
        <option value="quarter">Quartal</option>
        <option value="year">Jahr</option>
      </select>

      <select
        value={year}
        onChange={(e) => onChange({ period, year: Number(e.target.value), month, quarter })}
        className="border border-gray-300 rounded-lg px-3 py-1.5"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {period === 'month' && (
        <select
          value={month}
          onChange={(e) => onChange({ period, year, month: Number(e.target.value), quarter })}
          className="border border-gray-300 rounded-lg px-3 py-1.5"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
          ))}
        </select>
      )}

      {period === 'quarter' && (
        <select
          value={quarter}
          onChange={(e) => onChange({ period, year, month, quarter: Number(e.target.value) })}
          className="border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value={1}>Q1 (Jan-Mär)</option>
          <option value={2}>Q2 (Apr-Jun)</option>
          <option value={3}>Q3 (Jul-Sep)</option>
          <option value={4}>Q4 (Okt-Dez)</option>
        </select>
      )}
    </div>
  );
}
