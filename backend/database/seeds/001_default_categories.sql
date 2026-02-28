-- Default categories for German sole proprietorship (travel agency)

-- Income categories
INSERT OR IGNORE INTO categories (name, type, description, sort_order) VALUES
('Provisionen', 'income', 'Provisionen mit 19% USt', 1),
('Provisionen USt frei', 'income', 'Provisionen ohne USt (0%)', 2);

-- Expense categories
INSERT OR IGNORE INTO categories (name, type, description, sort_order) VALUES
('Betriebsbedarf', 'expense', 'Allgemeiner Betriebsbedarf', 10),
('Bewirtungskosten Büro', 'expense', 'Bürobewirtung und Verpflegung', 11),
('Franchise/Lizenzkosten', 'expense', 'Franchise- und Lizenzgebühren', 12),
('Geringwertige Wirtschaftsgüter', 'expense', 'GWG bis 800€ netto', 13),
('Kfz-Kosten (betriebl. Anteil)', 'expense', 'Betriebliche Kfz-Kosten', 14),
('Kosten der Warenabgabe', 'expense', 'Versand und Warenabgabe', 15),
('Raumkosten', 'expense', 'Miete, Nebenkosten, Büro', 16),
('Telefon, Internet, Porto', 'expense', 'Kommunikationskosten', 17),
('Verkaufsprovisionen', 'expense', 'Provisionen an Dritte', 18),
('Werbekosten', 'expense', 'Werbung und Marketing', 19);
