-- Pre-populate typical descriptions for autocomplete

-- Description history (global)
INSERT OR IGNORE INTO description_history (description, usage_count, last_used_at, created_at) VALUES
('Kultura Provision', 1, datetime('now'), datetime('now')),
('Netcologne Internet', 1, datetime('now'), datetime('now')),
('Kultura SW Paket', 1, datetime('now'), datetime('now')),
('Freenet Mobilfunk', 1, datetime('now'), datetime('now')),
('Kaffee für Büro', 1, datetime('now'), datetime('now')),
('Kaffeemaschine Wartung', 1, datetime('now'), datetime('now')),
('Microsoft 365 Abo', 1, datetime('now'), datetime('now')),
('Strato Hosting Abo', 1, datetime('now'), datetime('now'));

-- Description-category links with vat_rate
-- (category IDs match 001_default_categories.sql sort order)
-- 1=Provisionen, 2=Provisionen USt frei
-- 3=Betriebsbedarf, 4=Bewirtungskosten Büro, 5=Franchise/Lizenzkosten
-- 6=GWG, 7=Kfz-Kosten, 8=Kosten der Warenabgabe
-- 9=Raumkosten, 10=Telefon Internet Porto, 11=Verkaufsprovisionen, 12=Werbekosten

INSERT OR IGNORE INTO description_category_usage (description, category_id, usage_count, last_used_at, vat_rate) VALUES
-- Income: Provisionen 19%
('Kultura Provision', 1, 1, datetime('now'), 19),
-- Telefon Internet Porto 19%
('Netcologne Internet', 10, 1, datetime('now'), 19),
('Freenet Mobilfunk', 10, 1, datetime('now'), 19),
-- Franchise/Lizenzkosten 19%
('Kultura SW Paket', 5, 1, datetime('now'), 19),
('Microsoft 365 Abo', 5, 1, datetime('now'), 19),
('Strato Hosting Abo', 5, 1, datetime('now'), 19),
-- Bewirtungskosten Büro 7%
('Kaffee für Büro', 4, 1, datetime('now'), 7),
('Kaffeemaschine Wartung', 4, 1, datetime('now'), 19);
