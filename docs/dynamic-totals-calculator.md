# Dynamic Totals Calculator with Period Selection

## Overview
The transactions list shows aggregated totals (Einnahmen, Ausgaben, USt) with flexible period selection:
- **Default**: Current quarter (Q1, Q2, Q3, Q4)
- **Options**: Any month, any quarter, entire year, custom date range

---

## UI Layout

```
┌────────────────────────────────────────────────────────────┐
│  📊 Buchhaltung 2026                                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Zeitraum: [Q1 2026 ▼]  [Jahr: 2026 ▼]               │ │
│  │                                                       │ │
│  │ Einnahmen:    €19,167.57  (Netto)                   │ │
│  │ Ausgaben:     €12,345.80  (Netto)                   │ │
│  │ ─────────────────────────                            │ │
│  │ Gewinn:       €6,821.77                              │ │
│  │                                                       │ │
│  │ USt Einnahmen:  €3,641.85                           │ │
│  │ USt Ausgaben:   €2,345.70                           │ │
│  │ USt Zahllast:   €1,296.15                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [➕ Neue Buchung]  [Suche...] [Filter]                  │
│                                                            │
│  Datum       Beschreibung         Kategorie    Netto  ... │
│  ──────────────────────────────────────────────────────── │
│  16.02.2026  Kultura Provision    Provisionen  €1,250    │
│  15.02.2026  Netcologne Internet  Telefon      €56       │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```

---

## Database Query Functions

### 1. Get Totals for Period
```javascript
// services/totalsCalculator.js
const db = require('../config/database');

class TotalsCalculator {
  /**
   * Calculate totals for a given period
   * @param {Object} period - { type: 'month'|'quarter'|'year'|'custom', year, month?, quarter?, startDate?, endDate? }
   * @returns {Object} - Totals breakdown
   */
  static calculateTotals(period) {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const query = `
      SELECT 
        transaction_type,
        SUM(net_amount) as total_net,
        SUM(vat_amount) as total_vat,
        SUM(gross_amount) as total_gross,
        vat_rate,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY transaction_type, vat_rate
    `;
    
    const results = db.prepare(query).all(startDate, endDate);
    
    return this.aggregateResults(results);
  }
  
  /**
   * Get start and end dates for a period
   */
  static getPeriodDates(period) {
    const { type, year, month, quarter, startDate, endDate } = period;
    
    switch (type) {
      case 'month':
        return this.getMonthDates(year, month);
      
      case 'quarter':
        return this.getQuarterDates(year, quarter);
      
      case 'year':
        return this.getYearDates(year);
      
      case 'custom':
        return { startDate, endDate };
      
      default:
        throw new Error(`Unknown period type: ${type}`);
    }
  }
  
  static getMonthDates(year, month) {
    // month is 1-12
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    return { startDate, endDate };
  }
  
  static getQuarterDates(year, quarter) {
    // quarter is 1-4
    const quarterMonths = {
      1: { start: 1, end: 3 },   // Q1: Jan-Mar
      2: { start: 4, end: 6 },   // Q2: Apr-Jun
      3: { start: 7, end: 9 },   // Q3: Jul-Sep
      4: { start: 10, end: 12 }  // Q4: Oct-Dec
    };
    
    const months = quarterMonths[quarter];
    const startDate = `${year}-${String(months.start).padStart(2, '0')}-01`;
    
    const lastDay = new Date(year, months.end, 0).getDate();
    const endDate = `${year}-${String(months.end).padStart(2, '0')}-${lastDay}`;
    
    return { startDate, endDate };
  }
  
  static getYearDates(year) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }
  
  /**
   * Aggregate results into totals structure
   */
  static aggregateResults(results) {
    const totals = {
      income: {
        net: 0,
        vat_0: 0,
        vat_7: 0,
        vat_19: 0,
        total_vat: 0,
        gross: 0,
        count: 0
      },
      expenses: {
        net: 0,
        vat_0: 0,
        vat_7: 0,
        vat_19: 0,
        total_vat: 0,
        gross: 0,
        count: 0
      },
      profit: 0,
      vat_liability: 0
    };
    
    results.forEach(row => {
      const type = row.transaction_type === 'income' ? 'income' : 'expenses';
      
      totals[type].net += row.total_net;
      totals[type].total_vat += row.total_vat;
      totals[type].gross += row.total_gross;
      totals[type].count += row.transaction_count;
      
      // VAT breakdown
      if (row.vat_rate === 0) {
        totals[type].vat_0 += row.total_vat;
      } else if (row.vat_rate === 7) {
        totals[type].vat_7 += row.total_vat;
      } else if (row.vat_rate === 19) {
        totals[type].vat_19 += row.total_vat;
      }
    });
    
    // Calculate profit and VAT liability
    totals.profit = totals.income.net - totals.expenses.net;
    totals.vat_liability = totals.income.total_vat - totals.expenses.total_vat;
    
    return totals;
  }
  
  /**
   * Get current quarter
   */
  static getCurrentQuarter() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3);
    
    return {
      year: now.getFullYear(),
      quarter: quarter
    };
  }
}

module.exports = TotalsCalculator;
```

---

## Backend API Endpoint

```javascript
// routes/totals.js
const express = require('express');
const router = express.Router();
const TotalsCalculator = require('../services/totalsCalculator');

/**
 * GET /api/totals
 * Query params:
 *   - type: 'month' | 'quarter' | 'year' | 'custom'
 *   - year: YYYY
 *   - month: 1-12 (for type=month)
 *   - quarter: 1-4 (for type=quarter)
 *   - startDate: YYYY-MM-DD (for type=custom)
 *   - endDate: YYYY-MM-DD (for type=custom)
 */
router.get('/', (req, res) => {
  try {
    const { type, year, month, quarter, startDate, endDate } = req.query;
    
    // Default to current quarter if no parameters
    let period;
    if (!type) {
      const current = TotalsCalculator.getCurrentQuarter();
      period = {
        type: 'quarter',
        year: current.year,
        quarter: current.quarter
      };
    } else {
      period = {
        type,
        year: parseInt(year),
        month: month ? parseInt(month) : undefined,
        quarter: quarter ? parseInt(quarter) : undefined,
        startDate,
        endDate
      };
    }
    
    const totals = TotalsCalculator.calculateTotals(period);
    const dates = TotalsCalculator.getPeriodDates(period);
    
    res.json({
      period: {
        ...period,
        ...dates
      },
      totals
    });
    
  } catch (error) {
    console.error('Error calculating totals:', error);
    res.status(500).json({ error: 'Failed to calculate totals' });
  }
});

module.exports = router;
```

---

## React Components

### 1. PeriodSelector Component

```jsx
// components/common/PeriodSelector.jsx
import { useState, useEffect } from 'react';

function PeriodSelector({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  const [type, setType] = useState(value?.type || 'quarter');
  const [year, setYear] = useState(value?.year || currentYear);
  const [month, setMonth] = useState(value?.month || currentMonth);
  const [quarter, setQuarter] = useState(value?.quarter || currentQuarter);
  
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 1, label: 'Januar' },
    { value: 2, label: 'Februar' },
    { value: 3, label: 'März' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Dezember' }
  ];
  
  const quarters = [
    { value: 1, label: 'Q1 (Jan-Mär)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Okt-Dez)' }
  ];
  
  useEffect(() => {
    // Notify parent of period change
    let period = { type, year };
    
    if (type === 'month') {
      period.month = month;
    } else if (type === 'quarter') {
      period.quarter = quarter;
    }
    
    onChange(period);
  }, [type, year, month, quarter, onChange]);
  
  return (
    <div className="period-selector">
      {/* Period Type */}
      <select 
        className="period-type-select"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="month">Monat</option>
        <option value="quarter">Quartal</option>
        <option value="year">Jahr</option>
      </select>
      
      {/* Month Selector */}
      {type === 'month' && (
        <select 
          className="period-detail-select"
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      )}
      
      {/* Quarter Selector */}
      {type === 'quarter' && (
        <select 
          className="period-detail-select"
          value={quarter}
          onChange={(e) => setQuarter(parseInt(e.target.value))}
        >
          {quarters.map(q => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>
      )}
      
      {/* Year Selector */}
      <select 
        className="period-year-select"
        value={year}
        onChange={(e) => setYear(parseInt(e.target.value))}
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export default PeriodSelector;
```

### 2. TotalsDisplay Component

```jsx
// components/transactions/TotalsDisplay.jsx
import { formatCurrency } from '../../utils/formatting';

function TotalsDisplay({ totals, period }) {
  if (!totals) return null;
  
  const getPeriodLabel = () => {
    const { type, year, month, quarter, startDate, endDate } = period;
    
    switch (type) {
      case 'month':
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        return `${monthNames[month - 1]} ${year}`;
      
      case 'quarter':
        return `Q${quarter} ${year}`;
      
      case 'year':
        return `${year}`;
      
      case 'custom':
        return `${startDate} bis ${endDate}`;
      
      default:
        return '';
    }
  };
  
  return (
    <div className="totals-display">
      <div className="totals-header">
        <h3 className="totals-title">
          📊 Zusammenfassung: {getPeriodLabel()}
        </h3>
        <div className="totals-period-info">
          {period.startDate} bis {period.endDate}
        </div>
      </div>
      
      <div className="totals-grid">
        {/* Income Section */}
        <div className="totals-section income">
          <div className="section-header">
            <span className="section-icon">📈</span>
            <span className="section-title">Einnahmen</span>
            <span className="section-count">({totals.income.count})</span>
          </div>
          
          <div className="totals-row">
            <span className="label">Netto:</span>
            <span className="value income-value">
              {formatCurrency(totals.income.net)}
            </span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 19%:</span>
            <span className="value">{formatCurrency(totals.income.vat_19)}</span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 7%:</span>
            <span className="value">{formatCurrency(totals.income.vat_7)}</span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 0%:</span>
            <span className="value">{formatCurrency(totals.income.vat_0)}</span>
          </div>
          
          <div className="totals-row total">
            <span className="label">Brutto:</span>
            <span className="value">{formatCurrency(totals.income.gross)}</span>
          </div>
        </div>
        
        {/* Expenses Section */}
        <div className="totals-section expenses">
          <div className="section-header">
            <span className="section-icon">📉</span>
            <span className="section-title">Ausgaben</span>
            <span className="section-count">({totals.expenses.count})</span>
          </div>
          
          <div className="totals-row">
            <span className="label">Netto:</span>
            <span className="value expense-value">
              {formatCurrency(totals.expenses.net)}
            </span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 19%:</span>
            <span className="value">{formatCurrency(totals.expenses.vat_19)}</span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 7%:</span>
            <span className="value">{formatCurrency(totals.expenses.vat_7)}</span>
          </div>
          
          <div className="totals-row vat-breakdown">
            <span className="label">USt 0%:</span>
            <span className="value">{formatCurrency(totals.expenses.vat_0)}</span>
          </div>
          
          <div className="totals-row total">
            <span className="label">Brutto:</span>
            <span className="value">{formatCurrency(totals.expenses.gross)}</span>
          </div>
        </div>
        
        {/* Summary Section */}
        <div className="totals-section summary">
          <div className="section-header">
            <span className="section-icon">💰</span>
            <span className="section-title">Ergebnis</span>
          </div>
          
          <div className="totals-row big">
            <span className="label">Gewinn/Verlust:</span>
            <span className={`value ${totals.profit >= 0 ? 'profit' : 'loss'}`}>
              {formatCurrency(totals.profit)}
            </span>
          </div>
          
          <div className="totals-row separator"></div>
          
          <div className="totals-row big">
            <span className="label">USt Zahllast:</span>
            <span className={`value ${totals.vat_liability >= 0 ? 'liability' : 'refund'}`}>
              {formatCurrency(totals.vat_liability)}
            </span>
          </div>
          
          {totals.vat_liability < 0 && (
            <div className="helper-text">
              ✓ Erstattung vom Finanzamt
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TotalsDisplay;
```

### 3. Updated TransactionsList Component

```jsx
// pages/Transactions.jsx
import { useState, useEffect } from 'react';
import PeriodSelector from '../components/common/PeriodSelector';
import TotalsDisplay from '../components/transactions/TotalsDisplay';
import TransactionList from '../components/transactions/TransactionList';
import api from '../services/api';

function TransactionsPage() {
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();
  
  const [period, setPeriod] = useState({
    type: 'quarter',
    year: currentYear,
    quarter: currentQuarter
  });
  
  const [totals, setTotals] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [period]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch totals
      const totalsResponse = await api.get('/totals', { params: period });
      setTotals(totalsResponse.data);
      
      // Fetch transactions for the same period
      const transactionsResponse = await api.get('/transactions', { 
        params: {
          startDate: totalsResponse.data.period.startDate,
          endDate: totalsResponse.data.period.endDate
        }
      });
      setTransactions(transactionsResponse.data.transactions);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1>📊 Buchungen</h1>
        
        <PeriodSelector 
          value={period} 
          onChange={setPeriod}
        />
      </div>
      
      {loading ? (
        <div className="loading">Lade Daten...</div>
      ) : (
        <>
          <TotalsDisplay 
            totals={totals?.totals} 
            period={totals?.period}
          />
          
          <TransactionList 
            transactions={transactions}
            onUpdate={loadData}
          />
        </>
      )}
    </div>
  );
}

export default TransactionsPage;
```

---

## CSS Styles

```css
/* Period Selector */
.period-selector {
  display: flex;
  gap: 10px;
  align-items: center;
}

.period-type-select,
.period-detail-select,
.period-year-select {
  padding: 10px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.period-type-select:hover,
.period-detail-select:hover,
.period-year-select:hover {
  border-color: #cbd5e0;
}

.period-type-select:focus,
.period-detail-select:focus,
.period-year-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Totals Display */
.totals-display {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
}

.totals-header {
  margin-bottom: 20px;
}

.totals-title {
  font-size: 1.3em;
  color: #2d3748;
  margin-bottom: 5px;
}

.totals-period-info {
  font-size: 0.9em;
  color: #718096;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

/* Totals Section */
.totals-section {
  background: #f7fafc;
  border-radius: 10px;
  padding: 20px;
}

.totals-section.income {
  border-left: 4px solid #48bb78;
}

.totals-section.expenses {
  border-left: 4px solid #f56565;
}

.totals-section.summary {
  border-left: 4px solid #667eea;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}

.section-icon {
  font-size: 1.3em;
}

.section-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 1.1em;
}

.section-count {
  font-size: 0.85em;
  color: #718096;
  margin-left: auto;
}

/* Totals Row */
.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #4a5568;
  font-size: 0.95em;
}

.totals-row.vat-breakdown {
  font-size: 0.85em;
  color: #718096;
  padding-left: 15px;
}

.totals-row.total {
  border-top: 2px solid #cbd5e0;
  margin-top: 10px;
  padding-top: 12px;
  font-weight: 600;
  color: #2d3748;
}

.totals-row.big {
  font-size: 1.1em;
  font-weight: 600;
  padding: 12px 0;
}

.totals-row.separator {
  height: 2px;
  background: #e2e8f0;
  margin: 10px 0;
}

.totals-row .label {
  font-weight: 500;
}

.totals-row .value {
  font-weight: 600;
}

/* Value Colors */
.income-value {
  color: #48bb78;
}

.expense-value {
  color: #f56565;
}

.profit {
  color: #48bb78;
}

.loss {
  color: #f56565;
}

.liability {
  color: #f56565;
}

.refund {
  color: #48bb78;
}

.helper-text {
  font-size: 0.85em;
  color: #718096;
  margin-top: 8px;
  text-align: right;
}

/* Responsive */
@media (max-width: 768px) {
  .totals-grid {
    grid-template-columns: 1fr;
  }
  
  .period-selector {
    flex-direction: column;
    width: 100%;
  }
  
  .period-type-select,
  .period-detail-select,
  .period-year-select {
    width: 100%;
  }
}
```

---

## Utility Function: Currency Formatting

```javascript
// utils/formatting.js

/**
 * Format number as German currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date in German format
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Get period display name
 */
export function getPeriodName(period) {
  const { type, year, month, quarter } = period;
  
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  
  switch (type) {
    case 'month':
      return `${monthNames[month - 1]} ${year}`;
    case 'quarter':
      return `Q${quarter} ${year}`;
    case 'year':
      return `${year}`;
    default:
      return '';
  }
}
```

---

## Example API Response

```json
{
  "period": {
    "type": "quarter",
    "year": 2026,
    "quarter": 1,
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "totals": {
    "income": {
      "net": 19167.57,
      "vat_0": 206.37,
      "vat_7": 0,
      "vat_19": 3641.85,
      "total_vat": 3848.22,
      "gross": 23015.79,
      "count": 18
    },
    "expenses": {
      "net": 12345.80,
      "vat_0": 0,
      "vat_7": 86.90,
      "vat_19": 2345.70,
      "total_vat": 2432.60,
      "gross": 14778.40,
      "count": 144
    },
    "profit": 6821.77,
    "vat_liability": 1415.62
  }
}
```

---

## Quick Period Navigation Component (Optional)

```jsx
// components/common/QuickPeriodNav.jsx
function QuickPeriodNav({ currentPeriod, onPeriodChange }) {
  const goToPreviousPeriod = () => {
    const { type, year, quarter, month } = currentPeriod;
    
    if (type === 'quarter') {
      if (quarter === 1) {
        onPeriodChange({ type, year: year - 1, quarter: 4 });
      } else {
        onPeriodChange({ type, year, quarter: quarter - 1 });
      }
    } else if (type === 'month') {
      if (month === 1) {
        onPeriodChange({ type, year: year - 1, month: 12 });
      } else {
        onPeriodChange({ type, year, month: month - 1 });
      }
    } else if (type === 'year') {
      onPeriodChange({ type, year: year - 1 });
    }
  };
  
  const goToNextPeriod = () => {
    const { type, year, quarter, month } = currentPeriod;
    
    if (type === 'quarter') {
      if (quarter === 4) {
        onPeriodChange({ type, year: year + 1, quarter: 1 });
      } else {
        onPeriodChange({ type, year, quarter: quarter + 1 });
      }
    } else if (type === 'month') {
      if (month === 12) {
        onPeriodChange({ type, year: year + 1, month: 1 });
      } else {
        onPeriodChange({ type, year, month: month + 1 });
      }
    } else if (type === 'year') {
      onPeriodChange({ type, year: year + 1 });
    }
  };
  
  const goToCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    
    onPeriodChange({ 
      type: currentPeriod.type, 
      year,
      quarter: currentPeriod.type === 'quarter' ? quarter : undefined,
      month: currentPeriod.type === 'month' ? month : undefined
    });
  };
  
  return (
    <div className="quick-period-nav">
      <button onClick={goToPreviousPeriod} className="nav-btn">
        ← Zurück
      </button>
      <button onClick={goToCurrentPeriod} className="nav-btn current">
        Aktuell
      </button>
      <button onClick={goToNextPeriod} className="nav-btn">
        Weiter →
      </button>
    </div>
  );
}

export default QuickPeriodNav;
```

---

## Testing Examples

```javascript
// Test quarter dates
console.log(TotalsCalculator.getQuarterDates(2026, 1));
// { startDate: '2026-01-01', endDate: '2026-03-31' }

console.log(TotalsCalculator.getQuarterDates(2026, 4));
// { startDate: '2026-10-01', endDate: '2026-12-31' }

// Test month dates
console.log(TotalsCalculator.getMonthDates(2026, 2));
// { startDate: '2026-02-01', endDate: '2026-02-28' }

// Test year dates
console.log(TotalsCalculator.getYearDates(2026));
// { startDate: '2026-01-01', endDate: '2026-12-31' }

// Test current quarter
console.log(TotalsCalculator.getCurrentQuarter());
// { year: 2026, quarter: 1 } (if current date is in Q1)
```

---

## Summary

This implementation provides:

✅ **Flexible period selection** - Month, Quarter, Year  
✅ **Default to current quarter** - Automatic on load  
✅ **Real-time totals** - Income, Expenses, Profit, VAT  
✅ **VAT breakdown** - Separate 0%, 7%, 19%  
✅ **Quick navigation** - Previous/Next/Current buttons  
✅ **Visual clarity** - Color-coded sections  
✅ **Responsive design** - Works on all screens  
✅ **Performance optimized** - Single query per period  

The totals update automatically when the period changes!
