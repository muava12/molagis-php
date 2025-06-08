# Implementasi Warna Kurir (Courier Color Implementation)

## Overview
Implementasi ini menambahkan field `color` pada tabel `couriers` untuk memberikan warna yang konsisten dan dapat dikonfigurasi untuk badge kurir di halaman orders.

## Perubahan Database

### 1. Tambah Field Color
```sql
ALTER TABLE couriers 
ADD COLUMN color VARCHAR(20) DEFAULT 'blue';
```

### 2. Constraint Validasi
```sql
ALTER TABLE couriers 
ADD CONSTRAINT check_color_valid 
CHECK (color IN ('blue', 'azure', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'dark', 'muted'));
```

### 3. Index untuk Performance
```sql
CREATE INDEX idx_couriers_color ON couriers(color);
```

## Perubahan Kode

### 1. Database Queries
Semua query yang mengambil data kurir telah diupdate untuk include field `color`:

**Files yang diubah:**
- `src/Shared/SupabaseService.php`
- `src/Features/Orders/OrdersService.php`
- `src/Features/Settings/SettingsService.php`
- `src/Features/Order/OrderService.php`

**Contoh perubahan:**
```php
// Sebelum
'select=id,nama&aktif=eq.true'

// Sesudah  
'select=id,nama,color&aktif=eq.true'
```

### 2. Template Twig
Template telah diupdate untuk menggunakan field `color` dari database:

**Files yang diubah:**
- `src/Features/Orders/templates/order-list.html.twig`
- `src/Features/Orders/templates/_orders_table_partial.html.twig`

**Contoh perubahan:**
```twig
{# Sebelum - menggunakan hash algorithm #}
{% set courier_hash = ... %}
{% set color_index = courier_hash % (courier_colors | length) %}
{% set courier_color = courier_colors[color_index] %}

{# Sesudah - menggunakan field database #}
{% set courier_color = delivery.courier_color | default('blue') %}
```

### 3. JavaScript
Function `renderCourierBadge` telah diupdate untuk menerima parameter color:

**File:** `public/js/app/orders-page.js`

```javascript
// Sebelum
function renderCourierBadge(courierName) {
    // Complex hash algorithm...
}

// Sesudah
function renderCourierBadge(courierName, courierColor = null) {
    const badgeColor = courierColor || 'blue';
    return `<span class="badge bg-${badgeColor}-lt">${courierName}</span>`;
}
```

## Cara Menggunakan

### 1. Jalankan Migration
```sql
-- Jalankan file database/migrations/add_color_to_couriers.sql
```

### 2. Update RPC Function (PENTING!)
RPC function `get_deliveries_by_date` perlu diupdate untuk mengembalikan field `courier_color`:

```sql
-- Update RPC function untuk include courier_color
-- Pastikan SELECT statement dalam RPC include:
-- c.color as courier_color
-- dari join dengan tabel couriers c
```

### 3. Set Warna Kurir
Warna kurir dapat diatur melalui database:

```sql
-- Contoh mengubah warna kurir
UPDATE couriers SET color = 'green' WHERE nama = 'Kurir A';
UPDATE couriers SET color = 'red' WHERE nama = 'Kurir B';
```

### 4. Warna yang Tersedia
Warna yang dapat digunakan (sesuai Tabler CSS):
- `blue` (default)
- `azure`
- `indigo` 
- `purple`
- `pink`
- `red`
- `orange`
- `yellow`
- `lime`
- `green`
- `teal`
- `cyan`
- `dark`
- `muted`

## Keuntungan Implementasi Ini

1. **Konsisten**: Warna kurir akan selalu sama di semua halaman
2. **Dapat Dikonfigurasi**: Admin dapat mengatur warna sesuai keinginan
3. **Robust**: Tidak ada lagi masalah collision warna
4. **Performance**: Tidak perlu kalkulasi hash di runtime
5. **User-Friendly**: Warna dapat disesuaikan dengan branding atau preferensi

## Fallback
Jika field `color` kosong atau null, sistem akan menggunakan warna default `blue`.

## Testing
Setelah implementasi:
1. Pastikan semua kurir memiliki warna yang berbeda
2. Test di halaman /orders pada semua tab (By Name, By Date, By Order ID)
3. Verifikasi warna konsisten saat refresh halaman
4. Test dengan data kurir baru (harus mendapat warna default 'blue')
