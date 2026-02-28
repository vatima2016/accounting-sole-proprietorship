-- Pre-populate typical descriptions for autocomplete (based on 2024 data)

-- Description history (global) with usage counts from real data
INSERT OR IGNORE INTO description_history (description, usage_count, last_used_at, created_at) VALUES
-- High frequency
('Büromaterial', 29, datetime('now'), datetime('now')),
('Kaffee', 16, datetime('now'), datetime('now')),
('Reisebüro Softwarepaket', 12, datetime('now'), datetime('now')),
('Netcologne', 12, datetime('now'), datetime('now')),
('Freenet', 12, datetime('now'), datetime('now')),
('URV', 10, datetime('now'), datetime('now')),
('Tee', 8, datetime('now'), datetime('now')),
('Getränke', 12, datetime('now'), datetime('now')),
('Kultura Provision', 4, datetime('now'), datetime('now')),
-- Medium frequency
('Powerbank USB C', 2, datetime('now'), datetime('now')),
-- Single use
('Steuerberater: Gewinnermittlung und USt-Erklärung', 2, datetime('now'), datetime('now')),
('LED Lampen', 1, datetime('now'), datetime('now')),
('Werkzeug', 1, datetime('now'), datetime('now')),
('Strato Power Web Basic', 1, datetime('now'), datetime('now')),
('Wireless Kopfhörer', 1, datetime('now'), datetime('now')),
('Kaffeefilter', 1, datetime('now'), datetime('now')),
('Ersatzteile', 1, datetime('now'), datetime('now')),
('Seife', 1, datetime('now'), datetime('now')),
('MS Office 365', 1, datetime('now'), datetime('now')),
('Wasserkocher', 1, datetime('now'), datetime('now')),
('Minikugelschreiber', 1, datetime('now'), datetime('now')),
('Strato Hosting Basic', 2, datetime('now'), datetime('now')),
('Steckschlüsselset', 1, datetime('now'), datetime('now')),
('Kaspersky Total Security', 1, datetime('now'), datetime('now')),
('Ersatz Fernbedienung', 1, datetime('now'), datetime('now')),
('Akku Staubsauger', 1, datetime('now'), datetime('now')),
('Handy Hülle', 1, datetime('now'), datetime('now')),
('Kaspersky VPN', 1, datetime('now'), datetime('now')),
('Corona Schnelltest', 1, datetime('now'), datetime('now')),
('Kaffee Filter', 1, datetime('now'), datetime('now')),
('Samsung Galaxy Handy', 1, datetime('now'), datetime('now')),
('Handy Schutzhülle', 1, datetime('now'), datetime('now')),
('Lesehilfe', 1, datetime('now'), datetime('now')),
('Wasserfilter', 1, datetime('now'), datetime('now')),
('Wasserhahn-Anzeigen', 1, datetime('now'), datetime('now')),
('Trinkglas 6er-Set', 1, datetime('now'), datetime('now')),
('Betriebliche Nutzung Kfz', 1, datetime('now'), datetime('now')),
('Miete betrieblicher Anteil', 1, datetime('now'), datetime('now')),
('Strom betrieblicher Anteil', 1, datetime('now'), datetime('now')),
('Reisegutschein', 4, datetime('now'), datetime('now')),
('Vermittlung von Kunden', 1, datetime('now'), datetime('now')),
('Ersatz Akku Wischmop Roboter', 1, datetime('now'), datetime('now'));

-- Description-category links with vat_rate
-- (category IDs match 001_default_categories.sql sort order)
-- 1=Provisionen, 2=Provisionen USt frei
-- 3=Betriebsbedarf, 4=Bewirtungskosten Büro, 5=Franchise/Lizenzkosten
-- 6=GWG, 7=Kfz-Kosten, 8=Kosten der Warenabgabe
-- 9=Raumkosten, 10=Telefon, Internet, Porto, 11=Verkaufsprovisionen, 12=Werbekosten

INSERT OR IGNORE INTO description_category_usage (description, category_id, usage_count, last_used_at, vat_rate) VALUES
-- Income: Provisionen 19%
('Kultura Provision', 1, 4, datetime('now'), 19),
-- Income: Provisionen USt frei 0%
('URV', 2, 10, datetime('now'), 0),
-- Betriebsbedarf 19%
('Büromaterial', 3, 29, datetime('now'), 19),
('Powerbank USB C', 3, 2, datetime('now'), 19),
('LED Lampen', 3, 1, datetime('now'), 19),
('Werkzeug', 3, 1, datetime('now'), 19),
('Wireless Kopfhörer', 3, 1, datetime('now'), 19),
('Kaffeefilter', 3, 1, datetime('now'), 19),
('Ersatzteile', 3, 1, datetime('now'), 19),
('Seife', 3, 1, datetime('now'), 19),
('Minikugelschreiber', 3, 1, datetime('now'), 19),
('Steckschlüsselset', 3, 1, datetime('now'), 19),
('Ersatz Fernbedienung', 3, 1, datetime('now'), 19),
('Akku Staubsauger', 3, 1, datetime('now'), 19),
('Handy Hülle', 3, 1, datetime('now'), 19),
('Corona Schnelltest', 3, 1, datetime('now'), 19),
('Kaffee Filter', 3, 1, datetime('now'), 19),
('Handy Schutzhülle', 3, 1, datetime('now'), 19),
('Lesehilfe', 3, 1, datetime('now'), 19),
('Wasserfilter', 3, 1, datetime('now'), 19),
('Wasserhahn-Anzeigen', 3, 1, datetime('now'), 19),
('Trinkglas 6er-Set', 3, 1, datetime('now'), 19),
('Ersatz Akku Wischmop Roboter', 3, 1, datetime('now'), 19),
-- Bewirtungskosten Büro
('Kaffee', 4, 16, datetime('now'), 7),
('Tee', 4, 8, datetime('now'), 7),
('Getränke', 4, 12, datetime('now'), 19),
-- Franchise/Lizenzkosten 19%
('Reisebüro Softwarepaket', 5, 12, datetime('now'), 19),
('MS Office 365', 5, 1, datetime('now'), 19),
('Kaspersky Total Security', 5, 1, datetime('now'), 19),
('Kaspersky VPN', 5, 1, datetime('now'), 19),
-- GWG 19%
('Wasserkocher', 6, 1, datetime('now'), 19),
('Samsung Galaxy Handy', 6, 1, datetime('now'), 19),
-- Kfz-Kosten 0%
('Betriebliche Nutzung Kfz', 7, 1, datetime('now'), 0),
-- Kosten der Warenabgabe 0%
('Reisegutschein', 8, 4, datetime('now'), 0),
('Vermittlung von Kunden', 8, 1, datetime('now'), 0),
-- Raumkosten 0%
('Miete betrieblicher Anteil', 9, 1, datetime('now'), 0),
('Strom betrieblicher Anteil', 9, 1, datetime('now'), 0),
-- Telefon, Internet, Porto 19%
('Netcologne', 10, 12, datetime('now'), 19),
('Freenet', 10, 12, datetime('now'), 19),
('Strato Power Web Basic', 10, 1, datetime('now'), 19),
('Strato Hosting Basic', 10, 2, datetime('now'), 19),
-- Werbekosten 19%
('Steuerberater: Gewinnermittlung und USt-Erklärung', 12, 2, datetime('now'), 19);
