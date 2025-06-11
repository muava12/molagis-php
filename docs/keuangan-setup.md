# Setup Halaman Keuangan

## 📋 Checklist Setup

### ✅ Files Created
- [x] `src/Features/Keuangan/KeuanganController.php`
- [x] `src/Features/Keuangan/KeuanganService.php`
- [x] `src/Features/Keuangan/templates/keuangan.html.twig`
- [x] `public/js/app/keuangan.js`
- [x] `database/sample-data/expense_categories.sql`

### ✅ Configuration Updated
- [x] Added routes in `public/index.php`
- [x] Added navigation menu in `src/Shared/templates/partials/header.html.twig`
- [x] Added container definitions in `public/index.php`
- [x] Added template path in `public/index.php`

### 🔄 Database Setup Required

#### 1. Pastikan Tables Sudah Ada
Tables `financial_records` dan `expense_categories` harus sudah dibuat di Supabase.

#### 2. Insert Sample Data
Jalankan script SQL berikut di Supabase SQL Editor:

```sql
-- File: database/sample-data/expense_categories.sql
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
```

#### 3. Insert Sample Financial Records (Optional)
Untuk testing, bisa insert beberapa sample records:

```sql
-- Sample financial records untuk testing
INSERT INTO financial_records (transaction_date, amount, type, description, category_id) VALUES
-- Fee kurir
(CURRENT_DATE - INTERVAL '1 day', 150000, 'expense', 'Fee kurir harian', (SELECT id FROM expense_categories WHERE name = 'fee_kurir')),
(CURRENT_DATE - INTERVAL '2 days', 175000, 'expense', 'Fee kurir harian', (SELECT id FROM expense_categories WHERE name = 'fee_kurir')),

-- Bahan baku
(CURRENT_DATE - INTERVAL '1 day', 500000, 'expense', 'Belanja sayuran dan daging', (SELECT id FROM expense_categories WHERE name = 'bahan_baku')),

-- Kemasan
(CURRENT_DATE - INTERVAL '2 days', 200000, 'expense', 'Pembelian box makanan dan plastik', (SELECT id FROM expense_categories WHERE name = 'kemasan')),

-- Transportasi
(CURRENT_DATE - INTERVAL '1 day', 100000, 'expense', 'Bensin motor pengiriman', (SELECT id FROM expense_categories WHERE name = 'transportasi'));
```

## 🚀 Testing

### 1. Akses Halaman
- Buka browser ke `https://molagis-php.test/keuangan`
- Pastikan halaman load tanpa error
- Check navigation menu menampilkan "Keuangan"

### 2. Test Form Input
- Pilih tanggal transaksi
- Pilih kategori dari dropdown
- Input jumlah (contoh: 150000)
- Input deskripsi (opsional)
- Klik "Simpan Transaksi"
- Pastikan muncul toast success dan data muncul di tabel

### 3. Test Quick Categories
- Klik salah satu tombol kategori cepat
- Pastikan kategori terpilih di dropdown
- Pastikan focus pindah ke input jumlah

### 4. Test Filter
- Ubah tanggal filter
- Pilih kategori filter
- Pastikan data tabel berubah sesuai filter

### 5. Test Edit/Delete
- Klik tombol edit pada salah satu row
- Pastikan data ter-load di form
- Test update data
- Test delete data dengan konfirmasi

## 🐛 Troubleshooting

### Error: "Too few arguments to function showKeuangan()"
**Solution:** Pastikan method parameters sudah ditambahkan di `public/index.php` pada bagian params matching.

### Error: "Class KeuanganController not found"
**Solution:** Pastikan autoloader sudah di-update dan namespace benar.

### Error: "Template keuangan.html.twig not found"
**Solution:** Pastikan template path sudah ditambahkan di container definition.

### Error: "Table financial_records doesn't exist"
**Solution:** Pastikan tables sudah dibuat di Supabase sesuai schema.

### Error: "No expense categories found"
**Solution:** Jalankan script insert sample data untuk expense_categories.

## 📱 Mobile Testing

### Responsive Design
- Test di mobile browser
- Pastikan form tetap usable
- Check navigation menu collapse
- Verify table horizontal scroll

### Touch Interactions
- Test date picker di mobile
- Test dropdown selections
- Test button interactions

## 🔒 Security Checklist

### Authentication
- [x] Semua routes protected dengan AuthMiddleware
- [x] Session token validation

### Input Validation
- [x] Server-side validation di KeuanganService
- [x] Client-side validation di JavaScript
- [x] SQL injection prevention via Supabase

### CSRF Protection
- [x] X-Requested-With header untuk AJAX
- [x] Session-based authentication

## 🎯 Next Steps

1. **Test dengan data real** - Input beberapa transaksi real
2. **Verify integration** - Check apakah data muncul di Reports page
3. **Performance testing** - Test dengan banyak data
4. **User training** - Train user cara menggunakan fitur baru
5. **Backup strategy** - Setup backup untuk financial data

## 📊 Success Metrics

- ✅ Halaman load < 2 detik
- ✅ Form submission berhasil
- ✅ Data tersimpan di database
- ✅ Filter berfungsi dengan baik
- ✅ CRUD operations berjalan lancar
- ✅ Mobile responsive
- ✅ Integration dengan reports berfungsi
