import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatting';

const COLORS = ['#15803d', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1'];

function PieChart({ items, total, title, emptyColor }) {
  const [tooltip, setTooltip] = useState(null);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;

  if (!items.length || total === 0) {
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={28} />
        </svg>
        <div className="text-xs text-gray-400 mt-2">{title}</div>
      </div>
    );
  }

  const slices = [];
  let cumAngle = -Math.PI / 2;
  items.forEach((item, i) => {
    const frac = item.gross / total;
    const angle = frac * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const midAngle = startAngle + angle / 2;

    slices.push({ i, x1, y1, x2, y2, largeArc, frac, midAngle, category: item.category, gross: item.gross, color: COLORS[i % COLORS.length] });
  });

  const handleMouseMove = (e, s) => {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, category: s.category, gross: s.gross, pct: Math.round(s.frac * 100) });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} onMouseLeave={() => setTooltip(null)}>
          {items.length === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS[0]} strokeWidth={28}
              onMouseMove={(e) => handleMouseMove(e, slices[0])} style={{ cursor: 'pointer' }} />
          ) : (
            slices.map((s) => (
              <path
                key={s.i}
                d={`M ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2}`}
                fill="none"
                stroke={s.color}
                strokeWidth={28}
                strokeLinejoin="round"
                onMouseMove={(e) => handleMouseMove(e, s)}
                style={{ cursor: 'pointer' }}
              />
            ))
          )}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="600" fill="#374151" style={{ pointerEvents: 'none' }}>
            {formatCurrency(total)}
          </text>
        </svg>
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.category}: {formatCurrency(tooltip.gross)} ({tooltip.pct}%)
          </div>
        )}
      </div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-2">{title}</div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            {item.category} ({Math.round(item.gross / total * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function YearlyChart({ data }) {
  const [tooltip, setTooltip] = useState(null);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses, Math.abs(d.profit)]));
  if (maxVal === 0) return null;

  const chartH = 220;
  const barAreaH = 180;
  const labelH = 20;
  const padTop = 10;
  const padLeft = 60;
  const padRight = 16;
  const groupGap = 24;
  const barW = 18;
  const groupW = barW * 3 + 8 + groupGap;
  const chartW = padLeft + data.length * groupW + padRight;

  const scale = (v) => (v / maxVal) * barAreaH;

  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = (maxVal / gridSteps) * i;
    const y = padTop + barAreaH - scale(val);
    return { val, y };
  });

  const fmtAxis = (v) => {
    if (v >= 1000) return `${Math.round(v / 1000)}k`;
    return String(Math.round(v));
  };

  const handleMouseMove = (e, label, value) => {
    const svgRect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top - 10, label, value });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
      <div className="relative">
        <svg width={chartW} height={chartH} className="min-w-full" onMouseLeave={() => setTooltip(null)}>
          {gridLines.map(({ val, y }, i) => (
            <g key={i}>
              <line x1={padLeft} x2={chartW - padRight} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{fmtAxis(val)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = padLeft + i * groupW + groupGap / 2;
            const baseY = padTop + barAreaH;
            return (
              <g key={d.year}>
                <rect x={gx} y={baseY - scale(d.income)} width={barW} height={Math.max(scale(d.income), 1)} rx={2} fill="#15803d" opacity={0.8}
                  onMouseMove={(e) => handleMouseMove(e, `${d.year} Einnahmen`, d.income)} style={{ cursor: 'pointer' }} />
                <rect x={gx + barW + 4} y={baseY - scale(d.expenses)} width={barW} height={Math.max(scale(d.expenses), 1)} rx={2} fill="#dc2626" opacity={0.8}
                  onMouseMove={(e) => handleMouseMove(e, `${d.year} Ausgaben`, d.expenses)} style={{ cursor: 'pointer' }} />
                <rect
                  x={gx + (barW + 4) * 2}
                  y={d.profit >= 0 ? baseY - scale(d.profit) : baseY}
                  width={barW}
                  height={Math.max(scale(Math.abs(d.profit)), 1)}
                  rx={2}
                  fill={d.profit >= 0 ? '#2563eb' : '#f59e0b'}
                  opacity={0.8}
                  onMouseMove={(e) => handleMouseMove(e, `${d.year} Gewinn`, d.profit)}
                  style={{ cursor: 'pointer' }}
                />
                <text x={gx + (barW * 3 + 8) / 2} y={baseY + labelH} textAnchor="middle" fontSize={11} fill="#6b7280">{d.year}</text>
              </g>
            );
          })}
        </svg>
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.label}: {formatCurrency(tooltip.value)}
          </div>
        )}
      </div>
      <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: '#15803d', opacity: 0.8 }} />Einnahmen</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: '#dc2626', opacity: 0.8 }} />Ausgaben</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: '#2563eb', opacity: 0.8 }} />Gewinn</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [totals, setTotals] = useState(null);
  const [ytdTotals, setYtdTotals] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartYear, setChartYear] = useState(() => {
    try { return Number(localStorage.getItem('dashboardYear')) || new Date().getFullYear(); } catch { return new Date().getFullYear(); }
  });
  const updateChartYear = (y) => { setChartYear(y); localStorage.setItem('dashboardYear', y); };
  const [yearlyReport, setYearlyReport] = useState(null);
  const [yearlySummaries, setYearlySummaries] = useState([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2017 }, (_, i) => currentYear - i);

  useEffect(() => {
    api.getTotals({ period: 'month', year: currentYear, month: currentMonth }).then(setTotals).catch(console.error);
    api.getTotals({ period: 'year', year: currentYear }).then(setYtdTotals).catch(console.error);
    api.getTransactions({ limit: 5 }).then(r => setRecentTransactions(r.data)).catch(console.error);
    api.getYearlySummaries(2018).then(setYearlySummaries).catch(console.error);
  }, []);

  useEffect(() => {
    api.getYearlyReport(chartYear).then(setYearlyReport).catch(console.error);
  }, [chartYear]);

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

      {/* Yearly Comparison Chart */}
      {yearlySummaries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Jahresvergleich</h2>
          <YearlyChart data={yearlySummaries} />
        </div>
      )}

      {/* Category Pie Charts */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Kategorien</h2>
          <select value={chartYear} onChange={(e) => updateChartYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {yearlyReport && (
          <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-8">
            <PieChart items={yearlyReport.income} total={yearlyReport.totalIncome} title="Einnahmen" />
            <PieChart items={yearlyReport.expenses} total={yearlyReport.totalExpenses} title="Ausgaben" />
          </div>
        )}
      </div>

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
