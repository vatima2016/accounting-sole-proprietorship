import { useState } from 'react';
import VATReport from '../components/reports/VATReport';
import YearlyReport from '../components/reports/YearlyReport';
import YearlySummaries from '../components/reports/YearlySummaries';

const STORAGE_KEY = 'reportsParams';
const tabs = [
  { id: 'vat', label: 'USt-Voranmeldung' },
  { id: 'yearly', label: 'Jahresübersicht' },
  { id: 'summaries', label: 'Jahresvergleich' },
];

function loadParams() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {}
  const now = new Date();
  return { tab: 'vat', year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
}

export default function Reports() {
  const [params, setParams] = useState(loadParams);

  const update = (patch) => {
    setParams(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Berichte</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => update({ tab: tab.id })}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              params.tab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {params.tab === 'vat' && <VATReport year={params.year} quarter={params.quarter} onParamsChange={update} />}
      {params.tab === 'yearly' && <YearlyReport year={params.year} onYearChange={(year) => update({ year })} />}
      {params.tab === 'summaries' && <YearlySummaries />}
    </div>
  );
}
