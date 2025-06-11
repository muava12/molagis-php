-- Sample data for expense_categories table
-- Used for testing finance page

-- Insert expense categories
INSERT INTO expense_categories (name, display_name, description) VALUES
('fee_kurir', 'Fee Kurir', 'Biaya fee untuk kurir pengiriman'),
('gaji', 'Gaji Karyawan', 'Gaji bulanan karyawan'),
('listrik', 'Listrik', 'Biaya listrik bulanan'),
('air', 'Air', 'Biaya air bulanan'),
('internet', 'Internet', 'Biaya internet dan telekomunikasi'),
('bahan_baku', 'Bahan Baku', 'Pembelian bahan baku makanan'),
('kemasan', 'Kemasan', 'Biaya kemasan dan packaging'),
('transportasi', 'Transportasi', 'Biaya transportasi dan bensin'),
('perawatan', 'Perawatan', 'Biaya perawatan peralatan dan kendaraan'),
('promosi', 'Promosi & Marketing', 'Biaya promosi dan marketing'),
('administrasi', 'Administrasi', 'Biaya administrasi dan operasional'),
('pajak', 'Pajak', 'Pembayaran pajak'),
('asuransi', 'Asuransi', 'Biaya asuransi'),
('sewa', 'Sewa Tempat', 'Biaya sewa tempat usaha'),
('lainnya', 'Lainnya', 'Pengeluaran lain-lain')
ON CONFLICT (name) DO NOTHING;

-- Sample financial records for testing
INSERT INTO financial_records (transaction_date, amount, type, description, category_id) VALUES
-- Fee kurir
(CURRENT_DATE - INTERVAL '1 day', 150000, 'expense', 'Fee kurir harian', (SELECT id FROM expense_categories WHERE name = 'fee_kurir')),
(CURRENT_DATE - INTERVAL '2 days', 175000, 'expense', 'Fee kurir harian', (SELECT id FROM expense_categories WHERE name = 'fee_kurir')),
(CURRENT_DATE - INTERVAL '3 days', 160000, 'expense', 'Fee kurir harian', (SELECT id FROM expense_categories WHERE name = 'fee_kurir')),

-- Bahan baku
(CURRENT_DATE - INTERVAL '1 day', 500000, 'expense', 'Belanja sayuran dan daging', (SELECT id FROM expense_categories WHERE name = 'bahan_baku')),
(CURRENT_DATE - INTERVAL '5 days', 750000, 'expense', 'Belanja bahan baku mingguan', (SELECT id FROM expense_categories WHERE name = 'bahan_baku')),

-- Kemasan
(CURRENT_DATE - INTERVAL '2 days', 200000, 'expense', 'Pembelian box makanan dan plastik', (SELECT id FROM expense_categories WHERE name = 'kemasan')),

-- Transportasi
(CURRENT_DATE - INTERVAL '1 day', 100000, 'expense', 'Bensin motor pengiriman', (SELECT id FROM expense_categories WHERE name = 'transportasi')),
(CURRENT_DATE - INTERVAL '4 days', 150000, 'expense', 'Bensin dan parkir', (SELECT id FROM expense_categories WHERE name = 'transportasi')),

-- Listrik
(CURRENT_DATE - INTERVAL '7 days', 350000, 'expense', 'Bayar listrik bulan ini', (SELECT id FROM expense_categories WHERE name = 'listrik')),

-- Internet
(CURRENT_DATE - INTERVAL '10 days', 200000, 'expense', 'Bayar internet bulanan', (SELECT id FROM expense_categories WHERE name = 'internet')),

-- Gaji
(CURRENT_DATE - INTERVAL '15 days', 2500000, 'expense', 'Gaji karyawan bulan lalu', (SELECT id FROM expense_categories WHERE name = 'gaji')),

-- Promosi
(CURRENT_DATE - INTERVAL '3 days', 100000, 'expense', 'Iklan Facebook dan Instagram', (SELECT id FROM expense_categories WHERE name = 'promosi')),

-- Perawatan
(CURRENT_DATE - INTERVAL '6 days', 75000, 'expense', 'Service motor pengiriman', (SELECT id FROM expense_categories WHERE name = 'perawatan')),

-- Administrasi
(CURRENT_DATE - INTERVAL '8 days', 50000, 'expense', 'Fotokopi dan ATK', (SELECT id FROM expense_categories WHERE name = 'administrasi'));
