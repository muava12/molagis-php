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
                    "net_product_profit": 4400000,
                    "delivery_cost": 1350000,
                    "net_delivery_profit": 150000,
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

8. **Net Product Profit (Laba Bersih Produk)**
   - Calculation: Product Revenue - Product Cost
   - Description: Keuntungan murni dari penjualan produk setelah dikurangi modal

9. **Net Delivery Profit (Laba Bersih Pengiriman)**
   - Calculation: Delivery Revenue - Total Delivery Cost
   - Description: Keuntungan murni dari jasa pengiriman setelah dikurangi biaya operasional pengiriman

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

#### New Array-Based Response Format (Updated 2024)
RPC function sekarang mengembalikan array dengan wrapper object dan struktur yang diperbaharui:

**Latest Update**: Menambahkan section `gross_profit` terpisah untuk laba kotor harian yang dihitung di RPC level.

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
                    "revenue": {
                        "daily_catering": 8000000,
                        "delivery": 1500000,
                        "total": 9500000
                    },
                    "cost_of_goods_sold": {
                        "daily_catering": 3600000
                    },
                    "gross_profit": {
                        "daily_catering": 4400000
                    },
                    "operating_expenses": {
                        "delivery": 1350000,
                        "other": 1500000,
                        "total": 2850000
                    },
                    "net_profit_analysis": {
                        "daily_catering_profit": 4400000,
                        "event_catering_profit": 500000,
                        "delivery_profit": 150000,
                        "total_net_profit": 2200000,
                        "net_profit_margin_percent": 23.16
                    }
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
- **Net Product Profit**: Product Revenue - Product Cost
- **Net Delivery Profit**: Delivery Revenue - Total Delivery Cost

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
4. **Transform data structure** untuk kompatibilitas dengan template yang ada
5. Apply role-based filtering jika diperlukan
6. Generate period description yang user-friendly

#### Data Transformation (Updated 2024)
ReportsService.php sekarang melakukan transformasi data dari struktur RPC baru ke format yang diharapkan template:

**Mapping Revenue:**
- `revenue.daily_catering` → `product_revenue`
- `revenue.delivery` → `delivery_revenue`
- `revenue.total` → `total_revenue` & `gross_revenue`

**Mapping Costs:**
- `cost_of_goods_sold.daily_catering` → `product_cost`
- `operating_expenses.delivery` → `delivery_cost`
- `operating_expenses.other` → `other_expenses`
- `operating_expenses.total` → `total_operating_expenses`

**Mapping Profits:**
- `gross_profit.daily_catering` → `gross_profit` (UPDATED)
- `net_profit_analysis.daily_catering_profit` → `net_product_profit`
- `net_profit_analysis.event_catering_profit` → `event_catering_profit`
- `net_profit_analysis.delivery_profit` → `net_delivery_profit`
- `net_profit_analysis.total_net_profit` → `net_profit`
- `net_profit_analysis.net_profit_margin_percent` → `net_margin`

**Calculated Fields:**
- `gross_margin` dihitung dari `gross_profit.daily_catering / daily_catering_revenue * 100` (UPDATED)

#### Business Logic Changes (Latest Update)

**RPC Level Calculations:**
1. **Gross Profit**: Sekarang dihitung di RPC sebagai `daily_catering_revenue - daily_catering_cogs`
2. **Daily Catering Profit**: Dihitung sebagai `gross_profit - other_operating_expenses`
3. **Total Net Profit**: Formula baru = `daily_catering_profit + event_catering_profit + delivery_profit`

**Formula Changes:**
- **Old Formula**: `Laba Catering Harian + Laba Event + Laba Pengiriman - Biaya Operasional Lain`
- **New Formula**: `Laba Catering Harian + Laba Event + Laba Pengiriman`
- **Reason**: Biaya Operasional Lain sudah dikurangi di level Laba Catering Harian

**Impact on Frontend:**
- Template tetap menggunakan field names yang sama
- Data transformation layer di ReportsService.php diupdate untuk mapping yang benar
- Formula text diupdate untuk mencerminkan logika bisnis yang benar
- Tidak ada perubahan visual di UI, hanya perbaikan akurasi kalkulasi dan formula
