import { useState } from 'react';
import VATReport from '../components/reports/VATReport';
import YearlyReport from '../components/reports/YearlyReport';

const tabs = [
  { id: 'vat', label: 'USt-Voranmeldung' },
  { id: 'yearly', label: 'Jahresübersicht' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('vat');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Berichte</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vat' && <VATReport />}
      {activeTab === 'yearly' && <YearlyReport />}
    </div>
  );
}
