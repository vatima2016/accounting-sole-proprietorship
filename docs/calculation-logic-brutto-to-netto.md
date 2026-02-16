# Calculation Logic: Brutto → Netto

## Overview
Your bookkeeping app uses **Brutto-to-Netto calculation**, matching the workflow from EasyCashTax. Users enter the gross amount (Brutto) as shown on invoices, and the system automatically calculates the net amount (Netto) and VAT (USt).

---

## Mathematical Formula

### Given:
- **Brutto** (Gross amount including VAT) - **USER INPUT**
- **USt% Satz** (VAT rate: 0%, 7%, or 19%) - **USER SELECTS**

### Calculate:
```
Netto = Brutto / (1 + USt% / 100)
USt = Brutto - Netto
```

### Example 1: 7% VAT
```
Brutto (Eingabe): €25.44
USt% Satz: 7%

Netto = €25.44 / (1 + 7/100)
      = €25.44 / 1.07
      = €23.78

USt = €25.44 - €23.78
    = €1.66
```

### Example 2: 19% VAT
```
Brutto (Eingabe): €66.75
USt% Satz: 19%

Netto = €66.75 / (1 + 19/100)
      = €66.75 / 1.19
      = €56.09

USt = €66.75 - €56.09
    = €10.66
```

### Example 3: 0% VAT (Tax-free)
```
Brutto (Eingabe): €45.38
USt% Satz: 0%

Netto = €45.38 / (1 + 0/100)
      = €45.38 / 1.00
      = €45.38

USt = €45.38 - €45.38
    = €0.00
```

---

## Why This Approach?

### Advantages:
1. **Matches invoice amounts** - You enter exactly what's on the invoice/receipt
2. **No rounding errors** - Start with the correct Brutto amount
3. **Matches EasyCashTax** - Same workflow you're used to
4. **Real-world workflow** - Invoices show Brutto, not Netto
5. **German accounting standard** - Most invoices display Brutto prominently

### Real-world Example:
```
You receive an invoice from Netcologne:
┌─────────────────────────────────┐
│ Internet Service February        │
│ Netto:           €56.09         │
│ + USt (19%):     €10.66         │
│ ────────────────────────────     │
│ GESAMT:          €66.75 ◄─────  │ ← This is what you enter
└─────────────────────────────────┘

You enter: €66.75 (Brutto)
System calculates:
  - Netto: €56.09
  - USt: €10.66
```

---

## Implementation in Code

### JavaScript/React
```javascript
function calculateFromBrutto(brutto, vatRate) {
  // Convert brutto to number
  const bruttoAmount = parseFloat(brutto) || 0;
  const rate = parseFloat(vatRate) || 0;
  
  // Calculate Netto
  const netto = bruttoAmount / (1 + rate / 100);
  
  // Calculate VAT
  const vat = bruttoAmount - netto;
  
  return {
    brutto: bruttoAmount,
    netto: netto,
    vat: vat
  };
}

// Usage
const result = calculateFromBrutto(25.44, 7);
console.log(result);
// {
//   brutto: 25.44,
//   netto: 23.776635514018692,  // Will be rounded for display
//   vat: 1.6633644859813084      // Will be rounded for display
// }
```

### Rounding for Display
```javascript
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Display
const netto = 23.776635514018692;
console.log(formatCurrency(netto)); // "23,78 €"
```

### Store in Database
**Store with full precision** (as REAL type in SQLite):
```sql
INSERT INTO transactions (
  gross_amount,  -- 25.44
  vat_rate,      -- 7
  net_amount,    -- 23.776635514018692
  vat_amount     -- 1.6633644859813084
) VALUES (?, ?, ?, ?);
```

Only round for **display purposes**, never in calculations or storage.

---

## Reverse Calculation (For Reference Only)

If you ever need to calculate Brutto from Netto:
```
Brutto = Netto × (1 + USt% / 100)
```

Example:
```
Netto: €23.78
USt%: 7%

Brutto = €23.78 × 1.07
       = €25.4446 ≈ €25.44
```

But in your app, you **don't need this** because users always enter Brutto.

---

## Validation Rules

### Input Validation
- Brutto must be > 0
- VAT rate must be 0, 7, or 19
- Brutto should have max 2 decimal places for EUR

### Edge Cases
```javascript
// Case 1: Brutto = 0
calculateFromBrutto(0, 19)
// Result: { brutto: 0, netto: 0, vat: 0 }

// Case 2: VAT = 0% (tax-free)
calculateFromBrutto(100, 0)
// Result: { brutto: 100, netto: 100, vat: 0 }

// Case 3: Very small amounts
calculateFromBrutto(0.01, 19)
// Result: { brutto: 0.01, netto: 0.008403..., vat: 0.001596... }
```

---

## Testing Calculation Accuracy

### Test Cases
```javascript
// Test 1: 7% VAT
const test1 = calculateFromBrutto(25.44, 7);
assert(Math.round(test1.netto * 100) / 100 === 23.78);
assert(Math.round(test1.vat * 100) / 100 === 1.66);

// Test 2: 19% VAT
const test2 = calculateFromBrutto(66.75, 19);
assert(Math.round(test2.netto * 100) / 100 === 56.09);
assert(Math.round(test2.vat * 100) / 100 === 10.66);

// Test 3: 0% VAT
const test3 = calculateFromBrutto(45.38, 0);
assert(test3.netto === 45.38);
assert(test3.vat === 0);

// Test 4: Rounding
const test4 = calculateFromBrutto(100, 19);
// netto should be 84.03361344537815
assert(Math.round(test4.netto * 100) / 100 === 84.03);
```

---

## UI Workflow

### Step-by-Step User Flow:
```
1. User clicks "Neue Buchung"
   ↓
2. Popup form opens with default category pre-selected
   ↓
3. User enters date (e.g., 12.02.2026)
   ↓
4. User enters description (e.g., "Kaffee für Büro")
   ↓
5. User enters BRUTTO: €25.44 ← **User types this**
   ↓
6. User selects VAT rate: 7%
   ↓
7. System AUTOMATICALLY calculates:
   - Netto: €23.78
   - USt: €1.66
   ↓
8. Calculation displayed in real-time
   ↓
9. User clicks "Speichern"
   ↓
10. Transaction saved to database:
    - gross_amount: 25.44
    - vat_rate: 7
    - net_amount: 23.776635514018692 (full precision)
    - vat_amount: 1.6633644859813084 (full precision)
```

---

## Database Schema

### Storage
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    
    -- User input
    gross_amount REAL NOT NULL,        -- Brutto (user enters this)
    vat_rate REAL NOT NULL,            -- 0, 7, or 19
    
    -- Calculated values (stored with full precision)
    net_amount REAL NOT NULL,          -- Calculated from Brutto
    vat_amount REAL NOT NULL,          -- Calculated from Brutto
    
    invoice_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Why Store Both?
1. **gross_amount** - What the user entered (source of truth)
2. **net_amount** - For accounting reports (Einnahmen/Ausgaben)
3. **vat_amount** - For VAT reports (Umsatzsteuervoranmeldung)

---

## VAT Report Calculation

### Quarterly VAT Report
```javascript
function generateVATReport(transactions, year, quarter) {
  const filtered = transactions.filter(t => 
    isInQuarter(t.date, year, quarter)
  );
  
  const report = {
    // Income with 19% VAT
    income_19_net: 0,
    income_19_vat: 0,
    
    // Income with 7% VAT
    income_7_net: 0,
    income_7_vat: 0,
    
    // Tax-free income
    income_0_net: 0,
    
    // Input VAT (Vorsteuer)
    input_vat_19: 0,
    input_vat_7: 0,
  };
  
  filtered.forEach(t => {
    if (t.transaction_type === 'income') {
      if (t.vat_rate === 19) {
        report.income_19_net += t.net_amount;
        report.income_19_vat += t.vat_amount;
      } else if (t.vat_rate === 7) {
        report.income_7_net += t.net_amount;
        report.income_7_vat += t.vat_amount;
      } else {
        report.income_0_net += t.net_amount;
      }
    } else { // expense
      if (t.vat_rate === 19) {
        report.input_vat_19 += t.vat_amount;
      } else if (t.vat_rate === 7) {
        report.input_vat_7 += t.vat_amount;
      }
    }
  });
  
  // Calculate Zahllast/Erstattung
  const vatToCollect = report.income_19_vat + report.income_7_vat;
  const vatToPay = report.input_vat_19 + report.input_vat_7;
  report.vat_liability = vatToCollect - vatToPay;
  
  return report;
}
```

---

## Comparison with Alternative (Netto-to-Brutto)

### If You Used Netto-to-Brutto (NOT recommended for your case):
```
User enters: €23.78 (Netto)
System calculates:
  - USt: €23.78 × 0.07 = €1.6646
  - Brutto: €23.78 + €1.6646 = €25.4446 ≈ €25.44
```

**Problem:** Invoice shows €25.44, but you entered €23.78. Risk of mismatch!

### With Brutto-to-Netto (YOUR approach):
```
User enters: €25.44 (Brutto) ← Matches invoice exactly
System calculates:
  - Netto: €25.44 / 1.07 = €23.78
  - USt: €25.44 - €23.78 = €1.66
```

**Advantage:** No risk of mismatch. You enter what's on the invoice.

---

## Summary

✅ **User enters:** Brutto (Gross amount including VAT)  
✅ **System calculates:** Netto and USt automatically  
✅ **Formula:** `Netto = Brutto / (1 + VAT%/100)`  
✅ **Storage:** Full precision in database  
✅ **Display:** Rounded to 2 decimals for EUR  
✅ **Matches:** EasyCashTax workflow  

This approach ensures accuracy and matches real-world invoicing practices!
