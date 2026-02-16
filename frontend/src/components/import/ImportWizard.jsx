import { useState } from 'react';
import Papa from 'papaparse';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

const STEPS = ['Upload', 'Mapping', 'Vorschau', 'Ergebnis'];

export default function ImportWizard() {
  const [step, setStep] = useState(0);
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    date: 0,
    transaction_type: 1,
    category: 2,
    description: 3,
    gross_amount: 4,
    vat_rate: 5,
    invoice_number: null,
  });
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length < 2) {
          alert('CSV muss mindestens 2 Zeilen haben (Header + Daten)');
          return;
        }
        setHeaders(results.data[0]);
        setRawData(results.data.slice(1));
        setStep(1);
      },
      error: (err) => alert('Fehler beim Lesen: ' + err.message),
    });
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      const rows = rawData.map(row => {
        const mapped = {};
        Object.entries(mapping).forEach(([key, colIdx]) => {
          if (colIdx != null) mapped[key] = row[colIdx];
        });
        return mapped;
      });

      const result = await api.validateImport({ rows, mapping: Object.fromEntries(Object.entries(mapping).map(([k, v]) => [k, k])) });
      // For simplicity, we re-map locally
      setPreview(rows.map((r, i) => ({
        ...r,
        transaction_type: r.transaction_type === 'Einnahme' ? 'income' : r.transaction_type === 'Ausgabe' ? 'expense' : r.transaction_type,
        gross_amount: parseFloat(String(r.gross_amount).replace(',', '.')),
        vat_rate: parseInt(r.vat_rate) || 0,
      })));
      setStep(2);
    } catch (err) {
      alert('Validierung fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const importResult = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: preview.map(r => ({
            date: r.date,
            transaction_type: r.transaction_type,
            category_name: r.category,
            description: r.description,
            gross_amount: r.gross_amount,
            vat_rate: r.vat_rate,
            invoice_number: r.invoice_number,
          })),
        }),
      }).then(r => r.json());
      setResult(importResult);
      setStep(3);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'date', label: 'Datum' },
    { key: 'transaction_type', label: 'Typ (Einnahme/Ausgabe)' },
    { key: 'category', label: 'Kategorie' },
    { key: 'description', label: 'Beschreibung' },
    { key: 'gross_amount', label: 'Bruttobetrag' },
    { key: 'vat_rate', label: 'USt-Satz' },
    { key: 'invoice_number', label: 'Rechnungsnr. (optional)' },
  ];

  return (
    <div>
      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-1 text-sm ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {i + 1}
            </span>
            {s}
            {i < STEPS.length - 1 && <span className="mx-2 text-gray-300">—</span>}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">CSV-Datei mit Buchungen auswählen (Semikolon-getrennt)</p>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm" />
        </div>
      )}

      {/* Step 1: Mapping */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Spalten zuordnen</h3>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-4">
                <label className="w-48 text-sm font-medium text-gray-700">{f.label}</label>
                <select
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping(m => ({ ...m, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                  className="border rounded px-3 py-1.5 text-sm"
                >
                  {f.key === 'invoice_number' && <option value="">— Nicht zuordnen —</option>}
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Spalte ${i + 1}`}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={handleValidate} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Prüfen...' : 'Weiter'}
            </button>
            <button onClick={() => setStep(0)} className="px-4 py-2 bg-gray-100 rounded text-sm">Zurück</button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Vorschau ({preview.length} Buchungen)</h3>
          <div className="max-h-64 overflow-y-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-1 text-left">Datum</th>
                  <th className="px-2 py-1 text-left">Typ</th>
                  <th className="px-2 py-1 text-left">Kategorie</th>
                  <th className="px-2 py-1 text-left">Beschreibung</th>
                  <th className="px-2 py-1 text-right">Brutto</th>
                  <th className="px-2 py-1 text-right">USt%</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1">{row.date}</td>
                    <td className="px-2 py-1">{row.transaction_type}</td>
                    <td className="px-2 py-1">{row.category}</td>
                    <td className="px-2 py-1">{row.description}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(row.gross_amount)}</td>
                    <td className="px-2 py-1 text-right">{row.vat_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && <p className="text-gray-400 text-xs mt-2">...und {preview.length - 50} weitere</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Importieren...' : 'Importieren'}
            </button>
            <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-100 rounded text-sm">Zurück</button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Import abgeschlossen</h3>
          <div className="space-y-2 text-sm">
            <p className="text-green-700">Importiert: {result.imported} Buchungen</p>
            {result.skipped > 0 && <p className="text-yellow-600">Übersprungen: {result.skipped}</p>}
            {result.errors?.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600 font-medium">Fehler:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-red-500 text-xs">Zeile {err.row}: {err.error}</p>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setStep(0); setRawData(null); setPreview(null); setResult(null); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Neuer Import
          </button>
        </div>
      )}
    </div>
  );
}
