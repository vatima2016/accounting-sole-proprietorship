import { useState, useEffect, useRef } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { validateTransaction, parseAmountExpression } from '../../utils/validation';
import { api } from '../../services/api';
import CalculationDisplay from './CalculationDisplay';
import SmartDescriptionInput from './SmartDescriptionInput';

const LAST_CATEGORY_KEY = 'lastUsedCategory';
const LAST_DATE_KEY = 'lastTransactionDate';

function getLastCategory(type) {
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) || '{}');
    return stored[type] || '';
  } catch { return ''; }
}

function saveLastCategory(type, categoryId) {
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) || '{}');
    stored[type] = categoryId;
    localStorage.setItem(LAST_CATEGORY_KEY, JSON.stringify(stored));
  } catch {}
}

export default function TransactionForm({ transaction, onSave, onDelete, onCancel }) {
  const { incomeCategories, expenseCategories } = useCategories();
  const isEdit = !!transaction;

  const [form, setForm] = useState({
    date: transaction?.date || localStorage.getItem(LAST_DATE_KEY) || new Date().toISOString().split('T')[0],
    transaction_type: transaction?.transaction_type || 'expense',
    category_id: transaction?.category_id || '',
    description: transaction?.description || '',
    gross_amount: transaction?.gross_amount || '',
    vat_rate: transaction?.vat_rate ?? 19,
    invoice_number: transaction?.invoice_number || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const grossInputRef = useRef(null);

  // Set last-used category for new transactions
  useEffect(() => {
    if (!isEdit && !form.category_id) {
      const lastCat = getLastCategory(form.transaction_type);
      if (lastCat) setForm(f => ({ ...f, category_id: lastCat }));
    }
  }, [isEdit, form.transaction_type]);

  const categories = form.transaction_type === 'income' ? incomeCategories : expenseCategories;
  const selectedCategory = categories.find(c => String(c.id) === String(form.category_id));
  const lockedVatRates = { 'Provisionen USt frei': 0, 'Provisionen': 19 };
  const vatLocked = selectedCategory?.name in lockedVatRates;

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));

    // Reset category and description when type changes
    if (field === 'transaction_type') {
      const lastCat = getLastCategory(value);
      setForm(f => ({ ...f, [field]: value, category_id: lastCat || '', description: '' }));
    }

    // Clear description, lock VAT rate, and auto-fill if only one description
    if (field === 'category_id') {
      const cat = categories.find(c => String(c.id) === String(value));
      const vatOverride = (cat?.name in lockedVatRates) ? { vat_rate: lockedVatRates[cat.name] } : {};
      setForm(f => ({ ...f, [field]: value, description: '', ...vatOverride }));

      if (value) {
        api.getDescriptionSuggestions({ category_id: value }).then(suggestions => {
          if (suggestions.length === 1) {
            const s = suggestions[0];
            const autoFill = { description: s.description };
            if (s.vat_rate != null && !(cat?.name in lockedVatRates)) autoFill.vat_rate = s.vat_rate;
            if (s.last_amount != null) autoFill.gross_amount = String(s.last_amount).replace('.', ',');
            if (s.last_invoice_number != null) autoFill.invoice_number = s.last_invoice_number;
            setForm(f => ({ ...f, ...autoFill }));
          }
        }).catch(() => {});
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid, errors: validationErrors } = validateTransaction(form);
    if (!valid) { setErrors(validationErrors); return; }

    setSaving(true);
    try {
      const { total, isNet } = parseAmountExpression(form.gross_amount);
      const vatRate = Number(form.vat_rate);
      const gross = isNet ? Math.round(total * (1 + vatRate / 100) * 100) / 100 : total;
      const data = {
        ...form,
        gross_amount: gross,
        vat_rate: vatRate,
        category_id: Number(form.category_id),
      };
      await onSave(data);
      saveLastCategory(form.transaction_type, form.category_id);
      localStorage.setItem(LAST_DATE_KEY, form.date);
      api.trackDescription({ description: form.description, category_id: data.category_id, vat_rate: data.vat_rate, gross_amount: data.gross_amount, invoice_number: form.invoice_number || null }).catch(() => {});
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm ${errors[field] ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{errors.submit}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
          <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={inputClass('date')} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
          <select value={form.transaction_type} onChange={(e) => handleChange('transaction_type', e.target.value)} className={inputClass('transaction_type')}>
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
        <select value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)} className={inputClass('category_id')}>
          <option value="">-- Kategorie wählen --</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
        <SmartDescriptionInput
          value={form.description}
          onChange={(val, suggestedVatRate, lastAmount, lastInvoiceNumber) => {
            handleChange('description', val);
            const updates = {};
            if (suggestedVatRate != null && !vatLocked) {
              updates.vat_rate = suggestedVatRate;
            }
            if (lastAmount != null) {
              updates.gross_amount = String(lastAmount).replace('.', ',');
            }
            if (lastInvoiceNumber != null) {
              updates.invoice_number = lastInvoiceNumber;
            }
            if (Object.keys(updates).length > 0) {
              setForm(f => ({ ...f, ...updates }));
            }
          }}
          categoryId={form.category_id}
          className={inputClass('description')}
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bruttobetrag (€) *</label>
          <div className="relative">
            <input
              ref={grossInputRef}
              type="text"
              inputMode="decimal"
              value={form.gross_amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,+\-*() =Nn]/g, '');
                handleChange('gross_amount', val);
              }}
              placeholder="0,00 oder N59,75 (Netto)"
              className={`${inputClass('gross_amount')} pr-8`}
            />
            {form.gross_amount && (
              <button
                type="button"
                onClick={() => { handleChange('gross_amount', ''); grossInputRef.current?.focus(); }}
                title="Betrag löschen"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600"
                tabIndex={-1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {errors.gross_amount && <p className="text-red-500 text-xs mt-1">{errors.gross_amount}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">USt-Satz</label>
          <select value={form.vat_rate} onChange={(e) => handleChange('vat_rate', e.target.value)} disabled={vatLocked} className={`${inputClass('vat_rate')} ${vatLocked ? 'bg-gray-100 text-gray-500' : ''}`}>
            <option value={19}>19%</option>
            <option value={7}>7%</option>
            <option value={0}>0%</option>
          </select>
          {vatLocked && <p className="text-xs text-gray-400 mt-1">Durch Kategorie festgelegt</p>}
        </div>
      </div>

      <CalculationDisplay grossAmount={form.gross_amount} vatRate={form.vat_rate} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer</label>
        <input
          type="text"
          value={form.invoice_number}
          onChange={(e) => handleChange('invoice_number', e.target.value)}
          placeholder="Optional"
          className={inputClass('invoice_number')}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Speichern...' : isEdit ? 'Aktualisieren' : 'Speichern'}
        </button>
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            Löschen
          </button>
        )}
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
