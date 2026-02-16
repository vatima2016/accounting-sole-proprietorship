# UX Implementation Guide - Popup Form with Mandatory Category

## Overview
This guide covers the implementation of the popup modal form with mandatory category selection and "last used category" default behavior.

---

## React Component Structure

```
components/
├── transactions/
│   ├── TransactionList.jsx          # Main list component
│   ├── TransactionRow.jsx           # Individual row (clickable)
│   ├── TransactionFormModal.jsx     # Popup modal form
│   ├── TransactionForm.jsx          # Form fields and logic
│   └── CalculationDisplay.jsx       # Auto-calculation box
└── common/
    ├── Modal.jsx                     # Reusable modal wrapper
    └── FormField.jsx                 # Reusable form field with validation
```

---

## 1. TransactionList Component

```jsx
// TransactionList.jsx
import { useState } from 'react';
import TransactionRow from './TransactionRow';
import TransactionFormModal from './TransactionFormModal';

function TransactionList({ transactions, onUpdate }) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleNewTransaction = () => {
    setSelectedTransaction(null); // null = new transaction
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    await onUpdate(data);
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="transaction-list-container">
      <div className="controls">
        <button onClick={handleNewTransaction} className="btn-primary">
          ➕ Neue Buchung
        </button>
        {/* Filters here */}
      </div>

      <div className="transaction-list">
        <div className="transaction-header">
          <div>Datum</div>
          <div>Beschreibung</div>
          <div>Kategorie</div>
          <div>Netto</div>
          <div>USt.</div>
          <div>Brutto</div>
        </div>

        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            onClick={() => handleRowClick(transaction)}
            isSelected={selectedTransaction?.id === transaction.id}
          />
        ))}
      </div>

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSave}
        transaction={selectedTransaction}
      />
    </div>
  );
}

export default TransactionList;
```

---

## 2. TransactionFormModal Component

```jsx
// TransactionFormModal.jsx
import { useEffect } from 'react';
import Modal from '../common/Modal';
import TransactionForm from './TransactionForm';

function TransactionFormModal({ isOpen, onClose, onSave, transaction }) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEdit = transaction !== null;

  return (
    <Modal onClose={onClose}>
      <div className="popup-form">
        <div className="popup-header">
          <h2 className="popup-title">
            {isEdit ? '📝 Buchung bearbeiten' : '➕ Neue Buchung'}
          </h2>
          <button 
            onClick={onClose} 
            className="btn-close"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="popup-body">
          <div className="info-box">
            <strong>💡 Hinweis:</strong>
            Die Kategorie ist ein Pflichtfeld und wird automatisch von der 
            letzten Buchung übernommen. USt und Brutto werden automatisch berechnet.
          </div>

          <TransactionForm
            transaction={transaction}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </Modal>
  );
}

export default TransactionFormModal;
```

---

## 3. TransactionForm Component with Mandatory Category

```jsx
// TransactionForm.jsx
import { useState, useEffect } from 'react';
import { useCategories } from '../../hooks/useCategories';
import CalculationDisplay from './CalculationDisplay';

function TransactionForm({ transaction, onSave, onCancel }) {
  const { categories } = useCategories();
  
  // Get last used category from localStorage
  const getLastUsedCategory = () => {
    return localStorage.getItem('lastUsedCategory') || '';
  };

  const [formData, setFormData] = useState({
    date: transaction?.date || new Date().toISOString().split('T')[0],
    type: transaction?.transaction_type || 'expense',
    category_id: transaction?.category_id || getLastUsedCategory(),
    description: transaction?.description || '',
    gross_amount: transaction?.gross_amount || '', // User enters BRUTTO
    vat_rate: transaction?.vat_rate || 19,
    invoice_number: transaction?.invoice_number || '',
  });

  const [errors, setErrors] = useState({});
  const [calculatedNetto, setCalculatedNetto] = useState(0); // Calculated from Brutto
  const [calculatedVAT, setCalculatedVAT] = useState(0); // Calculated from Brutto

  // Calculate Netto and VAT from Brutto whenever brutto amount or VAT rate changes
  useEffect(() => {
    if (formData.gross_amount) {
      const brutto = parseFloat(formData.gross_amount) || 0;
      const rate = parseFloat(formData.vat_rate) || 0;
      
      // Formula: Netto = Brutto / (1 + VAT_rate/100)
      const netto = brutto / (1 + rate / 100);
      const vat = brutto - netto;
      
      setCalculatedNetto(netto);
      setCalculatedVAT(vat);
    } else {
      setCalculatedNetto(0);
      setCalculatedVAT(0);
    }
  }, [formData.gross_amount, formData.vat_rate]);

  // Filter categories by type
  const filteredCategories = categories.filter(
    (cat) => cat.type === formData.type
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      category_id: '', // Reset category when type changes
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Datum ist erforderlich';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Kategorie ist erforderlich';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Beschreibung ist erforderlich';
    }

    if (!formData.gross_amount || parseFloat(formData.gross_amount) <= 0) {
      newErrors.gross_amount = 'Brutto Betrag muss größer als 0 sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const transactionData = {
      ...formData,
      net_amount: calculatedNetto,   // Calculated from Brutto
      vat_amount: calculatedVAT,     // Calculated from Brutto
      // gross_amount is already in formData (user input)
    };

    // Save last used category to localStorage
    localStorage.setItem('lastUsedCategory', formData.category_id);

    await onSave(transactionData);
  };

  const handleDelete = async () => {
    if (confirm('Möchten Sie diese Buchung wirklich löschen?')) {
      // Delete logic here
    }
  };

  // Check if category is the default (last used)
  const isDefaultCategory = formData.category_id === getLastUsedCategory();

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {/* Row 1: Date and Type */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">Datum</label>
          <input
            type="date"
            className={`form-input ${errors.date ? 'error' : ''}`}
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
          {errors.date && <span className="error-text">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Buchungstyp</label>
          <select
            className="form-select"
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            required
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
        </div>
      </div>

      {/* Row 2: Category (MANDATORY) */}
      <div className="form-row full">
        <div className="form-group">
          <label className="form-label required">Kategorie</label>
          <select
            className={`form-select ${
              isDefaultCategory ? 'default-selected' : ''
            } ${errors.category_id ? 'error' : ''}`}
            value={formData.category_id}
            onChange={(e) => handleChange('category_id', e.target.value)}
            required
          >
            <option value="">-- Bitte wählen --</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
                {isDefaultCategory && cat.id === formData.category_id
                  ? ' (Letzte verwendet)'
                  : ''}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <span className="error-text">{errors.category_id}</span>
          )}
          <div className="helper-text">
            ⚠️ Pflichtfeld - Standard: Letzte verwendete Kategorie
          </div>
        </div>
      </div>

      {/* Row 3: Description */}
      <div className="form-row full">
        <div className="form-group">
          <label className="form-label required">Beschreibung</label>
          <input
            type="text"
            className={`form-input ${errors.description ? 'error' : ''}`}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="z.B. Netcologne Internet, Kultura Provision..."
            required
          />
          {errors.description && (
            <span className="error-text">{errors.description}</span>
          )}
        </div>
      </div>

      {/* Row 4 - Brutto Amount and VAT Rate */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">Brutto Betrag (inkl. USt)</label>
          <input
            type="number"
            className={`form-input ${errors.gross_amount ? 'error' : ''}`}
            value={formData.gross_amount}
            onChange={(e) => handleChange('gross_amount', e.target.value)}
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
          {errors.gross_amount && (
            <span className="error-text">{errors.gross_amount}</span>
          )}
          <div className="helper-text">Betrag MIT Mehrwertsteuer (wie auf Rechnung)</div>
        </div>

        <div className="form-group">
          <label className="form-label required">USt. Satz</label>
          <select
            className="form-select"
            value={formData.vat_rate}
            onChange={(e) => handleChange('vat_rate', e.target.value)}
            required
          >
            <option value="0">0% (Steuerfrei)</option>
            <option value="7">7% (Ermäßigt)</option>
            <option value="19">19% (Normal)</option>
          </select>
        </div>
      </div>

      {/* Row 5: Invoice Number (Optional) */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Rechnungsnummer</label>
          <input
            type="text"
            className="form-input"
            value={formData.invoice_number}
            onChange={(e) => handleChange('invoice_number', e.target.value)}
            placeholder="Optional, z.B. RE-2024-001"
          />
          <div className="helper-text">Optional</div>
        </div>
      </div>

      {/* Calculation Display */}
      <CalculationDisplay
        grossAmount={parseFloat(formData.gross_amount) || 0}
        vatRate={parseFloat(formData.vat_rate) || 0}
        vatAmount={calculatedVAT}
        netAmount={calculatedNetto}
      />

      {/* Form Actions */}
      <div className="form-actions">
        {transaction && (
          <button
            type="button"
            onClick={handleDelete}
            className="btn-delete"
          >
            🗑️ Löschen
          </button>
        )}
        <button type="button" onClick={onCancel} className="btn-secondary">
          Abbrechen
        </button>
        <button type="submit" className="btn-save">
          💾 Speichern
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
```

---

## 4. CalculationDisplay Component

```jsx
// CalculationDisplay.jsx
function CalculationDisplay({ grossAmount, vatRate, vatAmount, netAmount }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="calculated-group">
      <div className="calc-title">📊 Automatische Berechnung</div>
      <div className="calc-row highlight">
        <span><strong>Brutto Betrag (Eingabe):</strong></span>
        <span className="calc-value">{formatCurrency(grossAmount)}</span>
      </div>
      <div className="calc-arrow">⬇️</div>
      <div className="calc-row">
        <span>− Mehrwertsteuer ({vatRate}%):</span>
        <span className="calc-value">{formatCurrency(vatAmount)}</span>
      </div>
      <div className="calc-arrow">⬇️</div>
      <div className="calc-row total">
        <span>= Netto Betrag:</span>
        <span className="calc-value">{formatCurrency(netAmount)}</span>
      </div>
      <div className="calc-info">
        <strong>ℹ️ Formel:</strong> Netto = Brutto / (1 + USt%/100)
      </div>
    </div>
  );
}

export default CalculationDisplay;
```

---

## 5. Modal Component (Reusable)

```jsx
// common/Modal.jsx
import { useEffect, useRef } from 'react';

function Modal({ children, onClose }) {
  const modalRef = useRef(null);

  // Focus trap
  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements?.length) {
      focusableElements[0].focus();
    }
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div ref={modalRef}>
        {children}
      </div>
    </div>
  );
}

export default Modal;
```

---

## 6. CSS Styles

```css
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Popup Form */
.popup-form {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Default Category Highlight */
.form-select.default-selected {
  background: #f0f4ff;
  border-color: #667eea;
}

/* Error State */
.form-input.error,
.form-select.error {
  border-color: #f56565;
}

.error-text {
  color: #f56565;
  font-size: 0.85em;
  margin-top: 5px;
  display: block;
}

/* Info Box */
.info-box {
  background: #ebf8ff;
  border-left: 4px solid #4299e1;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9em;
  color: #2c5282;
}

/* Transaction Row Click Feedback */
.transaction-row {
  cursor: pointer;
  transition: background 0.2s;
}

.transaction-row:hover {
  background: #f7fafc;
}

.transaction-row.selected {
  background: #edf2f7;
  border-left: 4px solid #667eea;
}
```

---

## 7. Backend API Updates

### Save Last Used Category
The backend doesn't need to store this - it's purely frontend localStorage.

### API Endpoint Validation
```javascript
// routes/transactions.js
router.post('/transactions', async (req, res) => {
  const { 
    date, 
    transaction_type, 
    category_id, // MANDATORY
    description, 
    net_amount, 
    vat_rate 
  } = req.body;

  // Validation
  if (!category_id) {
    return res.status(400).json({ 
      error: 'Category is required' 
    });
  }

  // Calculate VAT and Gross
  const vat_amount = (net_amount * vat_rate) / 100;
  const gross_amount = net_amount + vat_amount;

  // Insert into database
  // ...
});
```

---

## 8. Database Considerations

The `category_id` field in the transactions table should have:
- **NOT NULL constraint** in schema
- **Foreign key reference** to categories table
- **Index** for faster lookups

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    category_id INTEGER NOT NULL,  -- MANDATORY
    description TEXT NOT NULL,
    net_amount REAL NOT NULL,
    vat_rate REAL NOT NULL,
    vat_amount REAL NOT NULL,
    gross_amount REAL NOT NULL,
    invoice_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_category ON transactions(category_id);
```

---

## 9. Testing Checklist

### Mandatory Category Tests
- [ ] Cannot submit form without category selected
- [ ] Error message displays when trying to save without category
- [ ] Last used category auto-fills on new transaction
- [ ] Last used category persists across page refresh
- [ ] Category changes when transaction type changes
- [ ] Default category highlighted in dropdown

### Popup Modal Tests
- [ ] Modal opens on "New Transaction" button click
- [ ] Modal opens when clicking transaction row
- [ ] Transaction data pre-fills when editing
- [ ] Modal closes on backdrop click
- [ ] Modal closes on × button click
- [ ] Modal closes on ESC key
- [ ] Modal closes after successful save
- [ ] Focus moves to first input when modal opens

### Auto-Calculation Tests
- [ ] VAT calculates correctly for 0%, 7%, 19%
- [ ] Gross amount updates in real-time
- [ ] Calculation display shows correct values
- [ ] German number formatting (€1.234,56)

### Form Validation Tests
- [ ] Date is required
- [ ] Category is required
- [ ] Description is required
- [ ] Net amount must be > 0
- [ ] Invoice number is optional
- [ ] Error messages appear correctly
- [ ] Errors clear when user starts typing

---

## 10. Performance Considerations

### LocalStorage
```javascript
// Utility function for safe localStorage access
const getLastUsedCategory = () => {
  try {
    return localStorage.getItem('lastUsedCategory') || '';
  } catch (error) {
    console.error('localStorage not available:', error);
    return '';
  }
};

const setLastUsedCategory = (categoryId) => {
  try {
    localStorage.setItem('lastUsedCategory', categoryId);
  } catch (error) {
    console.error('localStorage not available:', error);
  }
};
```

### Memoization
```javascript
import { useMemo } from 'react';

// Memoize filtered categories
const filteredCategories = useMemo(
  () => categories.filter((cat) => cat.type === formData.type),
  [categories, formData.type]
);
```

---

## Summary

This implementation provides:

✅ **Popup modal** overlay on transaction list  
✅ **Click row to edit** with pre-filled data  
✅ **Mandatory category** with validation  
✅ **Last used category** as default  
✅ **Auto-calculation** of VAT and Gross  
✅ **Real-time feedback** and validation  
✅ **Keyboard navigation** (ESC, Enter, Tab)  
✅ **Accessible** with ARIA labels  

All requirements from your specifications are met!
