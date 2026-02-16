import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useCategories } from '../hooks/useCategories';

export default function Settings() {
  const { categories } = useCategories();
  const [backupStatus, setBackupStatus] = useState(null);
  const [backing, setBacking] = useState(false);

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
              {categories.filter(c => c.type === 'income').map(c => (
                <li key={c.id} className="text-sm text-gray-700 flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-gray-400">{c.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-700 mb-2">Ausgaben</h3>
            <ul className="space-y-1">
              {categories.filter(c => c.type === 'expense').map(c => (
                <li key={c.id} className="text-sm text-gray-700 flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-gray-400 text-xs">{c.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
