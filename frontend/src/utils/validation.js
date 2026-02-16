export function validateTransaction(data) {
  const errors = {};

  if (!data.date) errors.date = 'Datum ist erforderlich';
  if (!data.transaction_type) errors.transaction_type = 'Typ ist erforderlich';
  if (!data.category_id) errors.category_id = 'Kategorie ist erforderlich';
  if (!data.description?.trim()) errors.description = 'Beschreibung ist erforderlich';
  const grossNum = Number(String(data.gross_amount).replace(',', '.'));
  if (!data.gross_amount || isNaN(grossNum) || grossNum <= 0) errors.gross_amount = 'Bruttobetrag muss positiv sein';
  if (![0, 7, 19].includes(Number(data.vat_rate))) errors.vat_rate = 'USt-Satz muss 0, 7 oder 19 sein';

  return { valid: Object.keys(errors).length === 0, errors };
}
