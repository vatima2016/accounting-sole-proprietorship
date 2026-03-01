import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { clearCategoryCache } from '../hooks/useCategories';

function CategoryRow({ category, onSave, onToggleActive }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inactive = !category.is_active;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(category.id, { name: name.trim(), description: description.trim() || null });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(category.name);
    setDescription(category.description || '');
    setEditing(false);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-1">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
          placeholder="Name"
          autoFocus
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
          placeholder="Beschreibung"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '...' : 'Speichern'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          Abbrechen
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </li>
    );
  }

  return (
    <li className={`flex items-center justify-between py-1 group ${inactive ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${inactive ? 'line-through text-gray-400' : 'text-gray-700'}`}>{category.name}</span>
        {category.description && (
          <span className="text-gray-400 text-xs ml-2">{category.description}</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!inactive && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-800 px-1"
          >
            Bearbeiten
          </button>
        )}
        <button
          onClick={() => onToggleActive(category)}
          className={`text-xs px-1 ${inactive ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}
        >
          {inactive ? 'Aktivieren' : 'Deaktivieren'}
        </button>
      </div>
    </li>
  );
}

function NewCategoryForm({ type, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createCategory({ name: name.trim(), type, description: description.trim() || null });
      setName('');
      setDescription('');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setOpen(false);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 mt-2"
      >
        + Neue Kategorie
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
        placeholder="Name"
        autoFocus
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
        placeholder="Beschreibung"
      />
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '...' : 'Speichern'}
      </button>
      <button
        onClick={handleCancel}
        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
      >
        Abbrechen
      </button>
      {error && <span className="text-xs text-red-600 ml-1">{error}</span>}
    </div>
  );
}

export default function Settings() {
  const [allCategories, setAllCategories] = useState([]);
  const [backupYear, setBackupYear] = useState(String(new Date().getFullYear()));
  const [backupStatus, setBackupStatus] = useState(null);
  const [backing, setBacking] = useState(false);
  const [backupFiles, setBackupFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState('');
  const [pathSaving, setPathSaving] = useState(false);
  const [dbCopying, setDbCopying] = useState(false);
  const [dbCopyStatus, setDbCopyStatus] = useState(null);
  const [catExporting, setCatExporting] = useState(false);
  const [catExportStatus, setCatExportStatus] = useState(null);

  // DATEV state
  const [datevBeraternr, setDatevBeraternr] = useState('');
  const [datevMandantnr, setDatevMandantnr] = useState('');
  const [datevSaving, setDatevSaving] = useState(false);
  const [datevSaved, setDatevSaved] = useState(false);
  const [datevYear, setDatevYear] = useState(() => sessionStorage.getItem('datevYear') || String(new Date().getFullYear()));
  const [datevPreview, setDatevPreview] = useState(null);
  const [datevLoading, setDatevLoading] = useState(false);
  const [sachkontenSaving, setSachkontenSaving] = useState({});

  const now = new Date();
  const backupYears = ['all', ...Array.from({ length: now.getFullYear() - 2017 }, (_, i) => String(now.getFullYear() - i))];

  const fetchAllCategories = () => {
    api.getAllCategories().then(setAllCategories).catch(console.error);
  };

  const fetchBackupFiles = () => {
    api.getBackupFiles().then(r => {
      setBackupFiles(r.files || []);
      setBackupPath(r.path || '');
    }).catch(console.error);
  };

  useEffect(() => {
    fetchAllCategories();
    api.getBackupPath().then(r => {
      setBackupPath(r.path || '');
      setPathDraft(r.path || '');
    }).catch(console.error);
    fetchBackupFiles();
    api.getDatevSettings().then(r => {
      setDatevBeraternr(r.beraternr || '');
      setDatevMandantnr(r.mandantnr || '');
    }).catch(console.error);
  }, []);

  const handleExportBackup = async (force = false) => {
    setBacking(true);
    setBackupStatus(null);
    try {
      const result = await api.exportBackup(backupYear, force);
      if (result.duplicate) {
        const save = window.confirm(
          `${result.message}\n\nTrotzdem ein zusätzliches Backup speichern?`
        );
        if (save) {
          return handleExportBackup(true);
        }
        setBackupStatus({ success: true, path: null, count: null, skipped: true });
        return;
      }
      setBackupStatus({ success: true, path: result.path, count: result.transactions });
      fetchBackupFiles();
    } catch (err) {
      setBackupStatus({ success: false, error: err.message });
    } finally {
      setBacking(false);
    }
  };

  const handleExportCategories = async () => {
    setCatExporting(true);
    setCatExportStatus(null);
    try {
      const result = await api.exportCategories();
      setCatExportStatus({ success: true, path: result.path, count: result.count });
    } catch (err) {
      setCatExportStatus({ success: false, error: err.message });
    } finally {
      setCatExporting(false);
    }
  };

  const handleDbCopy = async () => {
    setDbCopying(true);
    setDbCopyStatus(null);
    try {
      const result = await api.dbCopy();
      setDbCopyStatus({ success: true, path: result.path });
    } catch (err) {
      setDbCopyStatus({ success: false, error: err.message });
    } finally {
      setDbCopying(false);
    }
  };

  const handleImportBackup = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const result = await api.importBackup(selectedFile);
      setImportStatus({ success: true, ...result });
    } catch (err) {
      setImportStatus({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleUploadBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.uploadBackup(data);
      setImportStatus({ success: true, ...result });
    } catch (err) {
      setImportStatus({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleSavePath = async () => {
    if (!pathDraft.trim()) return;
    setPathSaving(true);
    try {
      await api.setBackupPath(pathDraft.trim());
      setBackupPath(pathDraft.trim());
      setEditingPath(false);
      fetchBackupFiles();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setPathSaving(false);
    }
  };

  const handleSave = async (id, data) => {
    await api.updateCategory(id, data);
    clearCategoryCache();
    fetchAllCategories();
  };

  const handleToggleActive = async (category) => {
    const newActive = category.is_active ? 0 : 1;
    if (category.is_active) {
      if (!confirm(`Kategorie "${category.name}" deaktivieren? Sie wird aus den Dropdowns entfernt.`)) return;
    }
    await api.updateCategory(category.id, { is_active: newActive });
    clearCategoryCache();
    fetchAllCategories();
  };

  const handleCreated = () => {
    clearCategoryCache();
    fetchAllCategories();
  };

  const handleSaveDatevSettings = async () => {
    setDatevSaving(true);
    setDatevSaved(false);
    try {
      await api.saveDatevSettings({ beraternr: datevBeraternr, mandantnr: datevMandantnr });
      setDatevSaved(true);
      setTimeout(() => setDatevSaved(false), 3000);
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setDatevSaving(false);
    }
  };

  const handleSachkontoBlur = async (categoryId, value) => {
    setSachkontenSaving(prev => ({ ...prev, [categoryId]: true }));
    try {
      await api.updateCategory(categoryId, { datev_account: value.trim() || null });
      fetchAllCategories();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setSachkontenSaving(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleDatevPreview = async () => {
    setDatevLoading(true);
    try {
      const stats = await api.datevExportPreview(datevYear);
      setDatevPreview(stats);
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setDatevLoading(false);
    }
  };

  const incomeActive = allCategories.filter(c => c.type === 'income' && c.is_active);
  const incomeInactive = allCategories.filter(c => c.type === 'income' && !c.is_active);
  const expenseActive = allCategories.filter(c => c.type === 'expense' && c.is_active);
  const expenseInactive = allCategories.filter(c => c.type === 'expense' && !c.is_active);
  const activeCategories = allCategories.filter(c => c.is_active);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Einstellungen</h1>

      {/* Backup */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Datenbank-Backup</h2>

        {/* Backup path */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Backup-Ordner:</span>
            {editingPath ? (
              <>
                <input
                  value={pathDraft}
                  onChange={(e) => setPathDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSavePath(); if (e.key === 'Escape') { setEditingPath(false); setPathDraft(backupPath); } }}
                  className="border rounded px-2 py-1 text-sm flex-1"
                  autoFocus
                />
                <button onClick={handleSavePath} disabled={pathSaving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                  {pathSaving ? '...' : 'Speichern'}
                </button>
                <button onClick={() => { setEditingPath(false); setPathDraft(backupPath); }} className="text-xs text-gray-500 hover:text-gray-700 px-1">
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-800 font-mono">{backupPath || '(nicht konfiguriert)'}</span>
                <button onClick={() => { setPathDraft(backupPath); setEditingPath(true); }} className="text-xs text-blue-600 hover:text-blue-800 px-1" title="Lokalen Ordnerpfad ändern, in dem Backups gespeichert und gelesen werden (z.B. Google Drive Sync-Ordner)">
                  Ändern
                </button>
              </>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-gray-600">Backup speichern:</span>
          <select
            value={backupYear}
            onChange={(e) => setBackupYear(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {backupYears.map(y => (
              <option key={y} value={y}>{y === 'all' ? 'Alle Jahre' : y}</option>
            ))}
          </select>
          <button
            onClick={() => handleExportBackup()}
            disabled={backing}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            title="Backup als JSON-Datei im konfigurierten Backup-Ordner speichern (z.B. Google Drive)"
          >
            {backing ? 'Speichert...' : 'Backup erstellen'}
          </button>
          <a
            href={api.backupDownloadUrl(backupYear)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
            title="Backup als JSON-Datei direkt im Browser herunterladen (ohne Backup-Ordner)"
          >
            Herunterladen
          </a>
        </div>
        {backupStatus && (
          <div className={`mb-4 text-sm ${backupStatus.success ? (backupStatus.skipped ? 'text-gray-500' : 'text-green-700') : 'text-red-600'}`}>
            {backupStatus.success
              ? (backupStatus.skipped ? 'Backup übersprungen — identisches Backup vorhanden.' : `Backup gespeichert: ${backupStatus.path} (${backupStatus.count} Buchungen)`)
              : `Fehler: ${backupStatus.error}`}
          </div>
        )}

        {/* DB Copy */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-gray-600">Datenbank-Kopie:</span>
          <button
            onClick={handleDbCopy}
            disabled={dbCopying}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Vollständige SQLite-Datenbankdatei in den Backup-Ordner kopieren (1:1 Kopie der .db-Datei)"
          >
            {dbCopying ? 'Kopiert...' : 'DB-Datei kopieren'}
          </button>
        </div>
        {dbCopyStatus && (
          <div className={`mb-4 text-sm ${dbCopyStatus.success ? 'text-green-700' : 'text-red-600'}`}>
            {dbCopyStatus.success
              ? `Datenbank-Kopie gespeichert: ${dbCopyStatus.path}`
              : `Fehler: ${dbCopyStatus.error}`}
          </div>
        )}

        {/* Import */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Backup importieren:</span>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1 max-w-md"
            >
              <option value="">-- Datei wählen --</option>
              {backupFiles.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button
              onClick={handleImportBackup}
              disabled={importing || !selectedFile}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              title="Ausgewählte Backup-Datei aus dem Backup-Ordner importieren. Bereits vorhandene Buchungen werden übersprungen."
            >
              {importing ? 'Importiert...' : 'Importieren'}
            </button>
            <span className="text-xs text-gray-400">oder</span>
            <label className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50 cursor-pointer" title="JSON-Backup-Datei vom Computer hochladen und importieren (ohne konfigurierten Backup-Ordner)">
              Datei hochladen
              <input type="file" accept=".json" onChange={handleUploadBackup} className="hidden" disabled={importing} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Bereits vorhandene Buchungen werden übersprungen. Datei hochladen funktioniert auch ohne konfigurierten Backup-Ordner.
          </p>
          {importStatus && (
            <div className={`mt-3 text-sm ${importStatus.success ? 'text-green-700' : 'text-red-600'}`}>
              {importStatus.success
                ? `Import abgeschlossen: ${importStatus.imported} importiert, ${importStatus.skipped} übersprungen (von ${importStatus.total} gesamt)`
                : `Fehler: ${importStatus.error}`}
            </div>
          )}
        </div>
      </section>

      {/* DATEV Export */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">DATEV Export</h2>

        {/* Beraternr + Mandantnr */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm text-gray-600">
            Beraternummer:
            <input
              value={datevBeraternr}
              onChange={e => setDatevBeraternr(e.target.value)}
              className="border rounded px-2 py-1 text-sm ml-1 w-28"
              placeholder="z.B. 1234"
            />
          </label>
          <label className="text-sm text-gray-600">
            Mandantennummer:
            <input
              value={datevMandantnr}
              onChange={e => setDatevMandantnr(e.target.value)}
              className="border rounded px-2 py-1 text-sm ml-1 w-28"
              placeholder="z.B. 5678"
            />
          </label>
          <button
            onClick={handleSaveDatevSettings}
            disabled={datevSaving}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            title="Beraternummer und Mandantennummer speichern — werden im EXTF-Header der Exportdateien verwendet"
          >
            {datevSaving ? '...' : 'Speichern'}
          </button>
          {datevSaved && <span className="text-sm text-green-600">Gespeichert</span>}
        </div>

        {/* Sachkonten-Zuordnung */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Sachkonten-Zuordnung (SKR 03)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-green-700 mb-1">Einnahmen</h4>
              <table className="w-full text-sm">
                <tbody>
                  {activeCategories.filter(c => c.type === 'income').map(cat => (
                    <tr key={cat.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2 text-gray-700">{cat.name}</td>
                      <td className="py-1 w-24">
                        <input
                          defaultValue={cat.datev_account || ''}
                          onBlur={e => {
                            if (e.target.value !== (cat.datev_account || '')) {
                              handleSachkontoBlur(cat.id, e.target.value);
                            }
                          }}
                          className="border rounded px-2 py-0.5 text-sm w-full font-mono"
                          placeholder="Konto"
                          disabled={sachkontenSaving[cat.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-xs font-medium text-red-700 mb-1">Ausgaben</h4>
              <table className="w-full text-sm">
                <tbody>
                  {activeCategories.filter(c => c.type === 'expense').map(cat => (
                    <tr key={cat.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2 text-gray-700">{cat.name}</td>
                      <td className="py-1 w-24">
                        <input
                          defaultValue={cat.datev_account || ''}
                          onBlur={e => {
                            if (e.target.value !== (cat.datev_account || '')) {
                              handleSachkontoBlur(cat.id, e.target.value);
                            }
                          }}
                          className="border rounded px-2 py-0.5 text-sm w-full font-mono"
                          placeholder="Konto"
                          disabled={sachkontenSaving[cat.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-gray-600">Jahr:</span>
            <select
              value={datevYear}
              onChange={e => { setDatevYear(e.target.value); sessionStorage.setItem('datevYear', e.target.value); setDatevPreview(null); }}
              className="border rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: now.getFullYear() - 2017 }, (_, i) => String(now.getFullYear() - i)).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <a
              href={api.datevBuchungsstapelUrl(datevYear)}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
              title="EXTF-Buchungsstapel als CSV herunterladen — enthält alle Buchungen mit zugeordneten Sachkonten"
            >
              Buchungsstapel exportieren
            </a>
            <a
              href={api.datevKontenbeschriftungenUrl(datevYear)}
              className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
              title="EXTF-Kontenbeschriftungen als CSV herunterladen — Sachkonten-Bezeichnungen für DATEV-Import"
            >
              Kontenbeschriftungen exportieren
            </a>
            <button
              onClick={handleDatevPreview}
              disabled={datevLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              title="Zeigt wie viele Buchungen exportiert werden und welche Kategorien noch kein DATEV-Konto haben"
            >
              {datevLoading ? '...' : 'Export-Vorschau'}
            </button>
          </div>
          {datevPreview && (
            <div className="text-sm bg-gray-50 rounded p-3">
              <div className="text-gray-700">
                <strong>{datevPreview.exported}</strong> Buchungen werden exportiert,{' '}
                <strong>{datevPreview.skipped}</strong> übersprungen (von {datevPreview.total} gesamt)
              </div>
              {datevPreview.unmappedCategories.length > 0 && (
                <div className="text-amber-600 mt-1">
                  Ohne DATEV-Konto: {datevPreview.unmappedCategories.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Kategorien</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCategories}
              disabled={catExporting}
              className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-50 disabled:opacity-50"
              title="Alle Kategorien als JSON-Datei im Backup-Ordner speichern"
            >
              {catExporting ? 'Exportiert...' : 'Exportieren'}
            </button>
            <a
              href={api.categoriesDownloadUrl()}
              className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-50"
              title="Alle Kategorien als JSON-Datei im Browser herunterladen"
            >
              Herunterladen
            </a>
          </div>
        </div>
        {catExportStatus && (
          <div className={`mb-3 text-sm ${catExportStatus.success ? 'text-green-700' : 'text-red-600'}`}>
            {catExportStatus.success
              ? `Kategorien exportiert: ${catExportStatus.path} (${catExportStatus.count} Kategorien)`
              : `Fehler: ${catExportStatus.error}`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-green-700 mb-2">Einnahmen</h3>
            <ul className="space-y-1">
              {incomeActive.map(c => (
                <CategoryRow key={c.id} category={c} onSave={handleSave} onToggleActive={handleToggleActive} />
              ))}
            </ul>
            {incomeInactive.length > 0 && (
              <>
                <div className="text-xs text-gray-400 mt-3 mb-1">Deaktiviert</div>
                <ul className="space-y-1">
                  {incomeInactive.map(c => (
                    <CategoryRow key={c.id} category={c} onSave={handleSave} onToggleActive={handleToggleActive} />
                  ))}
                </ul>
              </>
            )}
            <NewCategoryForm type="income" onCreated={handleCreated} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-700 mb-2">Ausgaben</h3>
            <ul className="space-y-1">
              {expenseActive.map(c => (
                <CategoryRow key={c.id} category={c} onSave={handleSave} onToggleActive={handleToggleActive} />
              ))}
            </ul>
            {expenseInactive.length > 0 && (
              <>
                <div className="text-xs text-gray-400 mt-3 mb-1">Deaktiviert</div>
                <ul className="space-y-1">
                  {expenseInactive.map(c => (
                    <CategoryRow key={c.id} category={c} onSave={handleSave} onToggleActive={handleToggleActive} />
                  ))}
                </ul>
              </>
            )}
            <NewCategoryForm type="expense" onCreated={handleCreated} />
          </div>
        </div>
      </section>
    </div>
  );
}
