// Simple recursive-descent expression evaluator supporting +, -, *, parentheses
function evaluate(str) {
  let pos = 0;

  function parseExpr() {
    let left = parseTerm();
    while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
      const op = str[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (pos < str.length && str[pos] === '*') {
      pos++;
      left = left * parseFactor();
    }
    return left;
  }

  function parseFactor() {
    if (str[pos] === '(') {
      pos++;
      const val = parseExpr();
      if (str[pos] !== ')') throw new Error('missing )');
      pos++;
      return val;
    }
    if (str[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    let numStr = '';
    while (pos < str.length && ((str[pos] >= '0' && str[pos] <= '9') || str[pos] === '.')) {
      numStr += str[pos++];
    }
    if (!numStr) throw new Error('expected number');
    return parseFloat(numStr);
  }

  const result = parseExpr();
  if (pos !== str.length) throw new Error('unexpected character');
  return result;
}

export function parseAmountExpression(input) {
  let str = String(input || '').trim();
  if (!str) return { total: NaN, parts: [], isNet: false };

  // Detect N/n prefix → net amount
  const isNet = /^[Nn]/.test(str);
  if (isNet) str = str.substring(1).trim();

  // Strip everything after = (user may type the result)
  const eqIdx = str.indexOf('=');
  if (eqIdx !== -1) str = str.substring(0, eqIdx).trim();

  // Normalize: comma -> dot, remove spaces
  const normalized = str.replace(/,/g, '.').replace(/\s+/g, '');
  if (!normalized) return { total: NaN, parts: [], isNet };

  // Simple expression (only digits, dots, +, *) — preserve parts breakdown
  if (/^[0-9.+*]+$/.test(normalized)) {
    const addTerms = normalized.split('+');
    const parts = addTerms.map(term => {
      const factors = term.split('*').map(f => parseFloat(f));
      if (factors.some(isNaN)) return NaN;
      return factors.reduce((a, b) => a * b, 1);
    });
    if (parts.some(isNaN)) return { total: NaN, parts: [], isNet };
    const total = Math.round(parts.reduce((sum, v) => sum + v, 0) * 100) / 100;
    return { total, parts: parts.map(p => Math.round(p * 100) / 100), isNet };
  }

  // Full expression with -, parentheses etc.
  try {
    const result = evaluate(normalized);
    const total = Math.round(result * 100) / 100;
    if (isNaN(total)) return { total: NaN, parts: [], isNet };
    return { total, parts: [total], isNet };
  } catch {
    return { total: NaN, parts: [], isNet };
  }
}

export function validateTransaction(data) {
  const errors = {};

  if (!data.date) errors.date = 'Datum ist erforderlich';
  if (!data.transaction_type) errors.transaction_type = 'Typ ist erforderlich';
  if (!data.category_id) errors.category_id = 'Kategorie ist erforderlich';
  if (!data.description?.trim()) errors.description = 'Beschreibung ist erforderlich';
  const { total } = parseAmountExpression(data.gross_amount);
  if (!data.gross_amount || isNaN(total) || total <= 0) errors.gross_amount = 'Bruttobetrag muss positiv sein';
  if (![0, 7, 19].includes(Number(data.vat_rate))) errors.vat_rate = 'USt-Satz muss 0, 7 oder 19 sein';

  return { valid: Object.keys(errors).length === 0, errors };
}
