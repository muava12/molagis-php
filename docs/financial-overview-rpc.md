# Financial Overview RPC Functions

## Overview
Dokumentasi untuk RPC functions yang akan digunakan untuk mengambil data financial overview pada halaman reports.

## RPC Function: `get_financial_overview`

### Purpose
Mengambil data overview keuangan yang mencakup pendapatan, biaya, dan laba untuk periode tertentu.

### Parameters
```sql
CREATE OR REPLACE FUNCTION get_financial_overview(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_period_type TEXT DEFAULT 'all_time' -- 'weekly', 'monthly', 'all_time'
)
RETURNS JSON
```

### Expected Return Structure (Updated)
```json
[
    {
        "get_financial_overview": {
            "success": true,
            "data": {
                "period_info": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31"
                },
                "financial_overview": {
                    "product_revenue": 8000000,
                    "delivery_revenue": 1500000,
                    "gross_revenue": 9500000,
                    "product_cost": 3600000,
                    "gross_profit": 4400000,
                    "gross_margin": 55.0,
                    "delivery_cost": 1350000,
                    "other_expenses": 1500000,
                    "total_operating_expenses": 2850000,
                    "net_profit": 1550000,
                    "net_margin": 16.3
                }
            },
            "error": null
        }
    }
]
```

### Data Sources (Updated Implementation)
1. **Product Revenue (Pendapatan Produk)**
   - Source: `deliverydates.total_harga_perhari`
   - Calculation: SUM(total_harga_perhari) untuk semua deliverydates dalam periode
   - Note: Data sudah teragregasi per hari di tabel deliverydates

2. **Delivery Revenue (Pendapatan Jasa Kirim)**
   - Source: `deliverydates.ongkir`
   - Calculation: SUM(ongkir) untuk semua deliverydates dalam periode

3. **Product Cost (Modal Produk)**
   - Source: `deliverydates.total_modal_perhari`
   - Calculation: SUM(total_modal_perhari) untuk semua deliverydates dalam periode
   - Note: Data sudah teragregasi per hari di tabel deliverydates

4. **Variable Delivery Cost (Biaya Ongkir Variabel)**
   - Source: `deliverydates.ongkir_kurir_luar`
   - Calculation: SUM(ongkir_kurir_luar) untuk semua deliverydates dalam periode

5. **Courier Fee Cost (Biaya Fee Kurir)**
   - Source: `financial_records` dengan `expense_categories.name = 'fee_kurir'`
   - Calculation: SUM(amount) WHERE category = 'fee_kurir' AND type = 'expense'

6. **Other Expenses (Pengeluaran Lain)**
   - Source: `financial_records` dengan `expense_categories.name != 'fee_kurir'`
   - Calculation: SUM(amount) WHERE category != 'fee_kurir' AND type = 'expense'

7. **Total Delivery Cost (Total Biaya Pengiriman)**
   - Calculation: Variable Delivery Cost + Courier Fee Cost

### Database Schema Changes Needed

#### 1. Add modal_satuan to paket table
```sql
ALTER TABLE paket ADD COLUMN modal_satuan DECIMAL(10,2) DEFAULT 0;
```

#### 2. Add biaya_kurir to deliverydates table
```sql
ALTER TABLE deliverydates ADD COLUMN biaya_kurir DECIMAL(10,2) DEFAULT 0;
```

#### 3. Create expenses table (optional)
```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    tanggal DATE NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Implementation Notes

1. **Current Implementation**: ✅ **IMPLEMENTED** - Menggunakan RPC function `get_financial_overview` di Supabase
2. **Data Sources**:
   - `deliverydates` table untuk revenue dan cost data
   - `financial_records` table untuk expense data
   - `expense_categories` table untuk kategorisasi expenses
3. **Calculation Logic**:
   - Gross Profit = Product Revenue - Product Cost
   - Net Profit = Gross Profit - Total Operating Expenses
   - Margins dihitung sebagai persentase dari revenue
4. **Role-based Access**: Filtering dilakukan di application layer (ReportsService.php)

### Usage in Code

```php
// Di ReportsService.php - Method baru yang menggunakan RPC
$result = $this->getFinancialOverview($startDate, $endDate, $accessToken);

// Internal RPC call
$result = $this->callReportsRPC('get_financial_overview', [
    'p_start_date' => $startDate,
    'p_end_date' => $endDate
], $accessToken);
```

### Database Schema Used

#### deliverydates table
- `tanggal`: Date field untuk filtering periode
- `total_harga_perhari`: Product revenue per hari
- `total_modal_perhari`: Product cost per hari
- `ongkir`: Delivery revenue (customer pays)
- `ongkir_kurir_luar`: Variable delivery cost (company pays)

#### financial_records table
- `transaction_date`: Date field untuk filtering periode
- `amount`: Jumlah expense
- `type`: 'expense' untuk pengeluaran
- `category_id`: Reference ke expense_categories

#### expense_categories table
- `id`: Primary key
- `name`: Nama kategori (contoh: 'fee_kurir', 'gaji', 'listrik', dll)

### Updated Response Structure (Real Implementation)

#### New Array-Based Response Format
RPC function sekarang mengembalikan array dengan wrapper object:

```json
[
    {
        "get_financial_overview": {
            "success": true,
            "data": {
                "period_info": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31"
                },
                "financial_overview": {
                    "delivery_cost": 1350000
                }
            },
            "error": null
        }
    }
]
```

#### Simplified delivery_cost Structure
RPC function sekarang mengembalikan `delivery_cost` sebagai nilai tunggal (total):
- `delivery_cost` = `variable_delivery_cost` + `courier_fee_cost`
- Tidak ada breakdown object, sudah disederhanakan di level RPC
- Template langsung menggunakan nilai `delivery_cost` tanpa konversi

#### Period Description
Sistem sekarang menggenerate deskripsi periode yang user-friendly:
- `"Januari 2024"` untuk periode bulanan penuh
- `"Minggu 1-7 Januari 2024"` untuk periode mingguan
- `"1-15 Januari 2024"` untuk periode custom dalam bulan yang sama
- `"1 Januari 2024 - 15 Februari 2024"` untuk periode lintas bulan

### Testing Data
Data sekarang diambil dari database real melalui RPC:
- **Product Revenue**: SUM(deliverydates.total_harga_perhari)
- **Delivery Revenue**: SUM(deliverydates.ongkir)
- **Product Cost**: SUM(deliverydates.total_modal_perhari)
- **Variable Delivery Cost**: SUM(deliverydates.ongkir_kurir_luar)
- **Courier Fee Cost**: SUM(financial_records.amount) WHERE category = 'fee_kurir'
- **Other Expenses**: SUM(financial_records.amount) WHERE category != 'fee_kurir'
- **Total Delivery Cost**: Variable Delivery Cost + Courier Fee Cost

### Error Response Format
```json
[
    {
        "get_financial_overview": {
            "success": false,
            "data": null,
            "error": {
                "code": "SQLSTATE_CODE",
                "message": "Error message"
            }
        }
    }
]
```

### Backend Processing
ReportsService.php menangani format array response:
1. Extract `rpcData[0]['get_financial_overview']`
2. Validasi `success` flag
3. Extract `data` untuk template
4. Apply role-based filtering jika diperlukan
5. Generate period description yang user-friendly
