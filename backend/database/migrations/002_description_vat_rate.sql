-- Add vat_rate to description_category_usage so descriptions remember their typical USt-Satz
ALTER TABLE description_category_usage ADD COLUMN vat_rate INTEGER DEFAULT NULL;
