import { useState } from 'react';
import Papa from 'papaparse';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatting';

const STEPS_GENERIC = ['Upload', 'Mapping', 'Vorschau', 'Ergebnis'];
const STEPS_EASYCT = ['Upload', 'Vorschau', 'Ergebnis'];

export default function ImportWizard() {
  const [format, setFormat] = useState(null); // null = selection, 'generic' | 'easyct'
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

  // EasyCash&Tax state
  const [easyctFileType, setEasyctFileType] = useState(null); // 'income' | 'expense'
  const [easyctRawRows, setEasyctRawRows] = useState(null); // original parsed rows for import
  const [duplicates, setDuplicates] = useState([]);
  const [missingCategories, setMissingCategories] = useState([]);
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [categoryMappings, setCategoryMappings] = useState({}); // csvName → dbName | '__create__'
  const [allCategories, setAllCategories] = useState([]);

  const steps = format === 'easyct' ? STEPS_EASYCT : STEPS_GENERIC;

  const resetAll = () => {
    setFormat(null);
    setStep(0);
    setRawData(null);
    setHeaders([]);
    setPreview(null);
    setResult(null);
    setEasyctFileType(null);
    setEasyctRawRows(null);
    setDuplicates([]);
    setMissingCategories([]);
    setExcludedRows(new Set());
    setCategoryMappings({});
    setAllCategories([]);
  };

  // --- Generic CSV handlers ---
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

      await api.validateImport({ rows, mapping: Object.fromEntries(Object.entries(mapping).map(([k]) => [k, k])) });
      setPreview(rows.map((r) => ({
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
      setStep(format === 'easyct' ? 2 : 3);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- EasyCash&Tax handlers ---
  const handleEasyctFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // EasyCash&Tax exports Latin-1 (ISO-8859-1) encoded files
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      parseEasyctText(text);
    };
    reader.onerror = () => alert('Fehler beim Lesen der Datei');
    reader.readAsText(file, 'ISO-8859-1');
  };

  const parseEasyctText = async (text) => {
    const results = Papa.parse(text, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
    });

    if (results.data.length === 0) {
      alert('Datei ist leer');
      return;
    }

    // Auto-detect file type from headers
    const fields = results.meta.fields || [];
    let detectedType;
    if (fields.includes('MWSt-Satz')) {
      detectedType = 'expense';
    } else if (fields.includes('MWSt-Betrag')) {
      detectedType = 'income';
    } else {
      alert('Datei konnte nicht als EasyCash&Tax erkannt werden. Erwartet: MWSt-Satz oder MWSt-Betrag Spalte.');
      return;
    }

    setEasyctFileType(detectedType);
    setEasyctRawRows(results.data);

    // Validate on backend
    setLoading(true);
    try {
      const validationResult = await api.validateEasyCashTax({
        rows: results.data,
        fileType: detectedType,
      });

      setPreview(validationResult.preview);
      setDuplicates(validationResult.duplicates || []);
      setMissingCategories(validationResult.missingCategories || []);

      // Fetch all categories for the mapping dropdown
      const cats = await api.getAllCategories();
      setAllCategories(cats);

      // Initialize mappings from suggestions
      const missing = validationResult.missingCategories || [];
      const initialMappings = {};
      const seen = new Set();
      for (const m of missing) {
        if (seen.has(m.category)) continue;
        seen.add(m.category);
        initialMappings[m.category] = m.suggestion || '__create__';
      }
      setCategoryMappings(initialMappings);

      if (validationResult.errors?.length > 0) {
        const errorMsg = validationResult.errors.slice(0, 5).map(e => `Zeile ${e.row}: ${e.errors.join(', ')}`).join('\n');
        alert(`Warnungen:\n${errorMsg}${validationResult.errors.length > 5 ? `\n...und ${validationResult.errors.length - 5} weitere` : ''}`);
      }

      setStep(1);
    } catch (err) {
      alert('Validierung fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEasyctImport = async (overwrite = false) => {
    setLoading(true);
    try {
      const importResult = await api.importEasyCashTax({
        rows: easyctRawRows,
        fileType: easyctFileType,
        excludeRows: Array.from(excludedRows),
        overwriteDuplicates: overwrite,
        categoryMappings,
      });
      setResult(importResult);
      setStep(2);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExcludeRow = (rowNum) => {
    setExcludedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const duplicateRowSet = new Set(duplicates.map(d => d.row));
  const missingCatRowSet = new Set(missingCategories.map(m => m.row));

  const fields = [
    { key: 'date', label: 'Datum' },
    { key: 'transaction_type', label: 'Typ (Einnahme/Ausgabe)' },
    { key: 'category', label: 'Kategorie' },
    { key: 'description', label: 'Beschreibung' },
    { key: 'gross_amount', label: 'Bruttobetrag' },
    { key: 'vat_rate', label: 'USt-Satz' },
    { key: 'invoice_number', label: 'Rechnungsnr. (optional)' },
  ];

  // --- Format selection ---
  if (format === null) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h3 className="font-semibold mb-4">Import-Format wählen</h3>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setFormat('generic')}
            className="px-6 py-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium">App CSV</div>
            <div className="text-sm text-gray-500 mt-1">Manuelle Spaltenzuordnung</div>
          </button>
          <button
            onClick={() => setFormat('easyct')}
            className="px-6 py-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium">EasyCash&Tax</div>
            <div className="text-sm text-gray-500 mt-1">Automatische Erkennung</div>
          </button>
        </div>
      </div>
    );
  }

  // --- EasyCash&Tax flow ---
  if (format === 'easyct') {
    return (
      <div>
        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {STEPS_EASYCT.map((s, i) => (
            <div key={s} className={`flex items-center gap-1 text-sm ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {i + 1}
              </span>
              {s}
              {i < STEPS_EASYCT.length - 1 && <span className="mx-2 text-gray-300">—</span>}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">EasyCash&Tax CSV-Datei auswählen (Einnahmen oder Ausgaben)</p>
            <input type="file" accept=".csv,.CSV" onChange={handleEasyctFileUpload} className="text-sm" disabled={loading} />
            {loading && <p className="text-blue-500 mt-3 text-sm">Datei wird geprüft...</p>}
            <div className="mt-4">
              <button onClick={resetAll} className="text-sm text-gray-500 hover:text-gray-700">Anderes Format wählen</button>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && preview && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold">Vorschau ({preview.length} Buchungen)</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${easyctFileType === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {easyctFileType === 'income' ? 'Einnahmen' : 'Ausgaben'}
              </span>
            </div>

            {duplicates.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm">
                <p className="font-medium text-yellow-800">{duplicates.length} mögliche Duplikate gefunden</p>
                <p className="text-yellow-600 text-xs mt-1">Beim Import können Duplikate übersprungen oder überschrieben werden</p>
              </div>
            )}

            {Object.keys(categoryMappings).length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4 text-sm">
                <p className="font-medium text-orange-800 mb-2">Unbekannte Kategorien zuordnen:</p>
                <div className="space-y-2">
                  {Object.entries(categoryMappings).map(([csvName, mapping]) => (
                    <div key={csvName} className="flex items-center gap-3">
                      <span className="font-medium text-gray-700 w-48 truncate" title={csvName}>{csvName}</span>
                      <span className="text-gray-400">→</span>
                      <select
                        value={mapping}
                        onChange={(e) => setCategoryMappings(prev => ({ ...prev, [csvName]: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm flex-1"
                      >
                        <option value="__create__">Neu anlegen: "{csvName}"</option>
                        {allCategories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b sticky top-0">
                    <th className="px-2 py-1 text-center w-8"></th>
                    <th className="px-2 py-1 text-left">Datum</th>
                    <th className="px-2 py-1 text-left">Kategorie</th>
                    <th className="px-2 py-1 text-left">Beschreibung</th>
                    <th className="px-2 py-1 text-right">Brutto</th>
                    <th className="px-2 py-1 text-right">USt%</th>
                    <th className="px-2 py-1 text-left">Beleg-Nr.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const rowNum = i + 1;
                    const isDuplicate = duplicateRowSet.has(rowNum);
                    const isMissingCat = missingCatRowSet.has(rowNum);
                    const isExcluded = excludedRows.has(rowNum);
                    return (
                      <tr
                        key={i}
                        className={`border-b ${isDuplicate ? 'bg-yellow-50' : isMissingCat ? 'bg-red-50' : ''} ${isExcluded ? 'opacity-50' : ''}`}
                      >
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleExcludeRow(rowNum)}
                            title={isDuplicate ? 'Mögliches Duplikat' : ''}
                          />
                        </td>
                        <td className="px-2 py-1">{row.date}</td>
                        <td className={`px-2 py-1 ${isMissingCat ? 'text-red-600 font-medium' : ''}`}>{row.category_name}</td>
                        <td className="px-2 py-1">{row.description}</td>
                        <td className="px-2 py-1 text-right">{row.gross_amount ? formatCurrency(row.gross_amount) : ''}</td>
                        <td className="px-2 py-1 text-right">{row.vat_rate}%</td>
                        <td className="px-2 py-1 text-gray-500">{row.invoice_number || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              {preview.length - excludedRows.size} von {preview.length} werden importiert
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleEasyctImport(false)} disabled={loading || preview.length - excludedRows.size === 0}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Importieren...' : duplicates.length > 0 ? 'Importieren (Duplikate überspringen)' : 'Importieren'}
              </button>
              {duplicates.length > 0 && (
                <button onClick={() => handleEasyctImport(true)} disabled={loading}
                  className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 disabled:opacity-50">
                  {loading ? 'Importieren...' : 'Importieren (Duplikate überschreiben)'}
                </button>
              )}
              <button onClick={() => setStep(0)} className="px-4 py-2 bg-gray-100 rounded text-sm">Zurück</button>
            </div>
          </div>
        )}

        {/* Step 2: Result */}
        {step === 2 && result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Import abgeschlossen</h3>
            <div className="space-y-2 text-sm">
              <p className="text-green-700">Importiert: {result.imported} Buchungen</p>
              {result.overwritten > 0 && <p className="text-yellow-600">Davon überschrieben: {result.overwritten}</p>}
              {result.skipped > 0 && <p className="text-gray-500">Übersprungen: {result.skipped}</p>}
              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">Fehler:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-red-500 text-xs">Zeile {err.row}: {err.error}</p>
                  ))}
                </div>
              )}
            </div>
            <button onClick={resetAll}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Neuer Import
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Generic CSV flow ---
  return (
    <div>
      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {STEPS_GENERIC.map((s, i) => (
          <div key={s} className={`flex items-center gap-1 text-sm ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {i + 1}
            </span>
            {s}
            {i < STEPS_GENERIC.length - 1 && <span className="mx-2 text-gray-300">—</span>}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">CSV-Datei mit Buchungen auswählen (Semikolon-getrennt)</p>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm" />
          <div className="mt-4">
            <button onClick={resetAll} className="text-sm text-gray-500 hover:text-gray-700">Anderes Format wählen</button>
          </div>
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
          <button onClick={resetAll}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Neuer Import
          </button>
        </div>
      )}
    </div>
  );
}
