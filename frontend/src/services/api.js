const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.errors?.[0]?.msg || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request('/categories'),
  getAllCategories: () => request('/categories?all=1'),
  getCategoriesByType: (type) => request(`/categories/${type}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') query.set(k, v); });
    const qs = query.toString();
    return request(`/transactions${qs ? `?${qs}` : ''}`);
  },
  getTransaction: (id) => request(`/transactions/${id}`),
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Descriptions
  getDescriptionSuggestions: (params) => {
    const query = new URLSearchParams(params);
    return request(`/descriptions/suggest?${query}`);
  },
  trackDescription: (data) => request('/descriptions/track', { method: 'POST', body: JSON.stringify(data) }),

  // Totals
  getTotals: (params) => {
    const query = new URLSearchParams(params);
    return request(`/totals?${query}`);
  },

  // Reports
  getVATReport: (year, quarter) => request(`/reports/vat/${year}/${quarter}`),
  getYearlyReport: (year) => request(`/reports/yearly/${year}`),
  getYearlySummaries: (from = 2018) => request(`/reports/yearly-summaries?from=${from}`),
  exportCSV: (params) => {
    const query = new URLSearchParams(params);
    return `${BASE_URL}/reports/export/csv?${query}`;
  },
  exportElster: (year, quarter) => `${BASE_URL}/reports/elster/${year}/${quarter}`,

  // Import
  validateImport: (formData) => fetch(`${BASE_URL}/import/validate`, { method: 'POST', body: formData }).then(r => r.json()),
  importCSV: (formData) => fetch(`${BASE_URL}/import/csv`, { method: 'POST', body: formData }).then(r => r.json()),

  // EasyCash&Tax Import
  validateEasyCashTax: (data) => request('/import/easyct/validate', { method: 'POST', body: JSON.stringify(data) }),
  importEasyCashTax: (data) => request('/import/easyct/import', { method: 'POST', body: JSON.stringify(data) }),

  // Backup
  backupDownloadUrl: (year) => `${BASE_URL}/backup/download?year=${year || 'all'}`,
  getBackupPath: () => request('/settings/backup-path'),
  setBackupPath: (path) => request('/settings/backup-path', { method: 'PUT', body: JSON.stringify({ path }) }),
  getBackupFiles: () => request('/backup/files'),
  exportCategories: () => request('/backup/categories-export', { method: 'POST' }),
  categoriesDownloadUrl: () => `${BASE_URL}/backup/categories-download`,
  exportBackup: (year) => request('/backup/export', { method: 'POST', body: JSON.stringify({ year: year || 'all' }) }),
  dbCopy: () => request('/backup/db-copy', { method: 'POST' }),
  importBackup: (filename) => request('/backup/import', { method: 'POST', body: JSON.stringify({ filename }) }),
  uploadBackup: (data) => request('/backup/upload', { method: 'POST', body: JSON.stringify(data) }),
};
