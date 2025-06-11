# Halaman Keuangan - Feature Documentation

## Overview
Halaman Keuangan adalah fitur baru untuk mengelola financial records (catatan pengeluaran) dalam aplikasi Molagis. Fitur ini memungkinkan user untuk mencatat, mengedit, dan menghapus transaksi pengeluaran dengan kategorisasi yang terstruktur.

## 🎯 Tujuan
- Menyediakan interface yang user-friendly untuk input pengeluaran operasional
- Memberikan overview keuangan dengan summary cards
- Memungkinkan filtering dan pencarian transaksi
- Integrasi dengan sistem financial overview yang sudah ada

## 📁 Struktur File

### Backend
```
src/Features/Keuangan/
├── KeuanganController.php    # Controller untuk halaman dan API endpoints
├── KeuanganService.php       # Service layer untuk business logic
└── templates/
    └── keuangan.html.twig    # Template halaman keuangan
```

### Frontend
```
public/js/app/
└── keuangan.js              # JavaScript untuk interaksi halaman
```

### Database
```
database/sample-data/
└── expense_categories.sql   # Sample data untuk testing
```

## 🗄️ Database Schema

### Table: `financial_records`
```sql
create table public.financial_records (
  id bigint generated always as identity not null,
  transaction_date date not null,
  amount numeric(15, 2) not null,
  type text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  category_id integer null,
  constraint financial_records_pkey primary key (id),
  constraint fk_financial_records_category foreign KEY (category_id) references expense_categories (id)
);
```

### Table: `expense_categories`
```sql
create table public.expense_categories (
  id serial not null,
  name character varying(100) not null,
  display_name character varying(100) not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  constraint expense_categories_pkey primary key (id),
  constraint expense_categories_name_key unique (name)
);
```

## 🚀 Features

### 1. Input Pengeluaran
- **Form Fields:**
  - Tanggal Transaksi (Date picker dengan Flatpickr)
  - Kategori (Dropdown dari expense_categories)
  - Jumlah (Number input dengan validasi)
  - Deskripsi (Optional textarea)

- **Validasi:**
  - Semua field wajib kecuali deskripsi
  - Jumlah harus > 0
  - Format tanggal yang benar

### 2. Kategori Cepat
- Tombol quick access untuk 5 kategori teratas
- Auto-fill kategori dan focus ke input jumlah
- Meningkatkan UX untuk input yang sering digunakan

### 3. Summary Cards
- **Total Pengeluaran Bulan Ini:** Agregasi amount untuk periode aktif
- **Jumlah Transaksi:** Count records dalam periode
- **Periode Aktif:** Menampilkan range tanggal filter

### 4. Filter Transaksi
- Filter berdasarkan tanggal (dari - sampai)
- Filter berdasarkan kategori
- Auto-submit saat filter berubah
- Reset filter ke default

### 5. Riwayat Transaksi
- Tabel responsive dengan data transaksi
- Kolom: Tanggal, Kategori, Deskripsi, Jumlah, Aksi
- Pagination (handled by JavaScript)
- Empty state yang informatif

### 6. CRUD Operations
- **Create:** Tambah transaksi baru
- **Read:** Tampilkan list dengan filter
- **Update:** Edit transaksi existing
- **Delete:** Hapus transaksi dengan konfirmasi

## 🛠️ API Endpoints

### GET `/keuangan`
Menampilkan halaman keuangan dengan data awal

### GET `/api/keuangan/categories`
Mengambil semua expense categories
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "fee_kurir",
      "display_name": "Fee Kurir",
      "description": "Biaya fee untuk kurir pengiriman"
    }
  ]
}
```

### GET `/api/keuangan/records`
Mengambil financial records dengan filter
**Query Parameters:**
- `start_date`: Filter tanggal mulai (Y-m-d)
- `end_date`: Filter tanggal akhir (Y-m-d)
- `category_id`: Filter kategori
- `limit`: Jumlah records (default: 50)
- `offset`: Offset pagination (default: 0)

### POST `/api/keuangan/records`
Menambah financial record baru
```json
{
  "transaction_date": "2024-12-19",
  "category_id": 1,
  "amount": 150000,
  "description": "Fee kurir harian"
}
```

### PUT `/api/keuangan/records/{id}`
Update financial record existing

### DELETE `/api/keuangan/records/{id}`
Hapus financial record

## 🎨 UI/UX Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Page Header: 💰 Keuangan                                │
├─────────────────┬───────────────────────────────────────┤
│ Left Column     │ Right Column                          │
│ ┌─────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ Input Form  │ │ │ Summary Cards (2 cards)             │ │
│ └─────────────┘ │ └─────────────────────────────────────┘ │
│ ┌─────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ Quick       │ │ │ Filter Form                         │ │
│ │ Categories  │ │ └─────────────────────────────────────┘ │
│ └─────────────┘ │ ┌─────────────────────────────────────┐ │
│                 │ │ Transaction History Table           │ │
│                 │ └─────────────────────────────────────┘ │
└─────────────────┴───────────────────────────────────────┘
```

### Responsive Design
- **Desktop (lg+):** 2 kolom layout (4:8 ratio)
- **Tablet (md):** 2 kolom layout dengan adjustment
- **Mobile (sm):** Single column, form di atas

### Color Scheme
- **Primary Actions:** Tabler primary blue
- **Amounts:** Red text untuk expenses
- **Categories:** Secondary badges
- **Success:** Green untuk confirmations
- **Danger:** Red untuk delete actions

## 🔧 Technical Implementation

### JavaScript Features
- **Flatpickr Integration:** Consistent date picking dengan orders page
- **Form Validation:** Client-side validation sebelum submit
- **AJAX Operations:** Semua CRUD operations via fetch API
- **Toast Notifications:** Feedback untuk user actions
- **Auto-submit Filters:** UX improvement untuk filtering

### PHP Architecture
- **Service Layer:** Business logic terpisah dari controller
- **Error Handling:** Comprehensive error handling dan logging
- **Validation:** Server-side validation untuk semua inputs
- **Database Transactions:** Ensure data consistency

### Security
- **CSRF Protection:** Via session tokens
- **Input Sanitization:** Semua input di-sanitize
- **SQL Injection Prevention:** Menggunakan prepared statements via Supabase
- **Authentication:** Semua endpoints require valid session

## 📊 Integration dengan Financial Overview

Halaman Keuangan terintegrasi dengan sistem financial overview yang sudah ada:

- **Data Source:** financial_records table digunakan oleh RPC `get_financial_overview`
- **Categories:** expense_categories untuk kategorisasi dalam reports
- **Consistency:** Data yang diinput langsung mempengaruhi reports page

## 🧪 Testing

### Sample Data
File `database/sample-data/expense_categories.sql` berisi:
- 15 kategori expense yang umum digunakan
- Sample financial records untuk testing
- Data realistic untuk demo

### Test Scenarios
1. **Input Form:** Test semua validasi dan success cases
2. **Filter:** Test berbagai kombinasi filter
3. **CRUD:** Test create, read, update, delete operations
4. **Responsive:** Test di berbagai screen sizes
5. **Integration:** Test impact ke financial overview

## 🚀 Deployment

### Prerequisites
1. Database tables sudah dibuat
2. Sample data sudah diinsert (opsional)
3. Supabase RLS policies sudah dikonfigurasi

### Steps
1. Deploy backend files ke server
2. Update navigation menu
3. Test semua endpoints
4. Verify integration dengan reports

## 🔮 Future Enhancements

1. **Bulk Import:** Upload CSV untuk import transaksi
2. **Recurring Expenses:** Setup pengeluaran berulang
3. **Budget Planning:** Set budget per kategori
4. **Export:** Export data ke Excel/PDF
5. **Analytics:** Grafik trend pengeluaran
6. **Mobile App:** PWA untuk input mobile
7. **Receipt Upload:** Upload foto struk/nota
8. **Approval Workflow:** Multi-level approval untuk expense besar
