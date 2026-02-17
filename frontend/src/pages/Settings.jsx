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
  const [backupStatus, setBackupStatus] = useState(null);
  const [backing, setBacking] = useState(false);

  const fetchAllCategories = () => {
    api.getAllCategories().then(setAllCategories).catch(console.error);
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const handleBackup = async () => {
    setBacking(true);
    setBackupStatus(null);
    try {
      const result = await api.createBackup();
      setBackupStatus({ success: true, path: result.path });
    } catch (err) {
      setBackupStatus({ success: false, error: err.message });
    } finally {
      setBacking(false);
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

  const incomeActive = allCategories.filter(c => c.type === 'income' && c.is_active);
  const incomeInactive = allCategories.filter(c => c.type === 'income' && !c.is_active);
  const expenseActive = allCategories.filter(c => c.type === 'expense' && c.is_active);
  const expenseInactive = allCategories.filter(c => c.type === 'expense' && !c.is_active);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Einstellungen</h1>

      {/* Backup */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Datenbank-Backup</h2>
        <p className="text-sm text-gray-500 mb-4">
          Erstellt eine Sicherung der Datenbank im Google Drive Backup-Ordner.
        </p>
        <button
          onClick={handleBackup}
          disabled={backing}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {backing ? 'Backup läuft...' : 'Backup erstellen'}
        </button>
        {backupStatus && (
          <div className={`mt-3 text-sm ${backupStatus.success ? 'text-green-700' : 'text-red-600'}`}>
            {backupStatus.success ? `Backup erstellt: ${backupStatus.path}` : `Fehler: ${backupStatus.error}`}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Kategorien</h2>
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
