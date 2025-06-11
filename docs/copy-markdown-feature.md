# 📋 Copy as Markdown Feature

## Overview
Fitur "Copy as Markdown" memungkinkan user untuk menyalin seluruh overview keuangan dalam format Markdown yang rapi dan terstruktur.

## How to Use
1. Buka halaman Reports & Analytics
2. Klik tombol **"Copy MD"** di card header Overview Keuangan
3. Data akan otomatis disalin ke clipboard dalam format Markdown
4. Paste di aplikasi yang mendukung Markdown (Notion, GitHub, Discord, dll)

## Sample Output

Berikut adalah contoh output Markdown yang dihasilkan:

```markdown
# 📊 Overview Keuangan

**📅 Periode: Januari 2024**  
*Laporan dibuat: 15 Januari 2024*

---

## 💰 Pendapatan (Revenue)

| Kategori | Jumlah |
|----------|--------|
| 🍱 Pendapatan Catering Harian | Rp 8.000.000 |
| 🚚 Pendapatan Jasa Kirim (Ongkir) | Rp 1.500.000 |
| **💰 Total Pendapatan** | **Rp 9.500.000** |

---

## 🏭 Biaya Pokok Penjualan (COGS)

| Kategori | Jumlah |
|----------|--------|
| 🏭 Modal Catering Harian | Rp 3.600.000 |

---

## 💎 Laba Kotor Catering Harian

| Metrik | Nilai |
|--------|-------|
| 💎 Laba Kotor Catering | Rp 4.400.000 |
| 📈 Margin | 55% |

*Formula: Pendapatan Catering Harian - Modal Produk*

---

## 💸 Biaya Operasional (Operating Expenses)

| Kategori | Jumlah |
|----------|--------|
| 🛵 Beban Jasa Kirim (Fee Kurir) | Rp 1.350.000 |
| 🏢 Pengeluaran Operasional Lain | Rp 1.500.000 |
| **💸 Total Biaya Operasional** | **Rp 2.850.000** |

---

## 🔍 Rincian Laba Bersih per Lini Bisnis

| Lini Bisnis | Laba Bersih |
|-------------|-------------|
| 🍱 Laba Catering Harian | Rp 4.400.000 |
| 🎉 Laba Catering Event | Rp 500.000 |
| 🚚 Laba Bersih Pengiriman | Rp 150.000 |

---

## 🏆 Laba Bersih Total (Net Profit)

| Metrik | Nilai |
|--------|-------|
| 🏆 Laba Bersih Total | Rp 2.200.000 |
| 📊 Margin | 23.16% |

*Formula: Laba Catering Harian + Laba Event + Laba Pengiriman - Biaya Operasional Lain*

---

*Laporan ini dibuat secara otomatis dari sistem Molagis*
```

## Features

### ✅ **Automatic Data Extraction**
- Mengambil data langsung dari DOM elements
- Menggunakan data attributes untuk identifikasi section
- Fallback ke 'N/A' jika data tidak tersedia

### ✅ **Professional Formatting**
- Header dengan emoji dan periode
- Tabel Markdown yang rapi
- Separator sections dengan horizontal rules
- Formula explanations
- Timestamp otomatis

### ✅ **Responsive Design**
- Button copy yang responsive
- Hover effects yang smooth
- Mobile-friendly sizing

### ✅ **User Experience**
- Toast notification untuk feedback
- Error handling yang robust
- Clipboard API support

## Technical Implementation

### HTML Structure
```html
<button class="btn btn-sm btn-outline-primary me-2" id="copyMarkdownBtn" title="Copy as Markdown">
  <svg>...</svg>
  Copy MD
</button>
```

### JavaScript Functions
- `copyAsMarkdown()` - Main function
- `extractFinancialDataFromDOM()` - Data extraction
- `generateFinancialMarkdown()` - Markdown generation
- `initializeCopyMarkdown()` - Event listener setup

### CSS Styling
- Hover effects dengan transform
- Responsive button sizing
- Icon scaling untuk mobile

## Browser Support
- ✅ Chrome/Edge (Clipboard API native)
- ✅ Firefox (Clipboard API native)
- ✅ Safari (Clipboard API native)
- ⚠️ Older browsers (fallback required)

## Use Cases

### 📊 **Business Reporting**
- Copy ke presentation slides
- Share via email/chat
- Documentation purposes

### 📝 **Documentation**
- Meeting notes
- Financial analysis
- Progress tracking

### 💬 **Communication**
- Team updates
- Stakeholder reports
- Quick sharing

## Future Enhancements

### 🔮 **Potential Improvements**
- Export to PDF option
- Custom formatting templates
- Include charts/graphs
- Email integration
- Multiple format support (CSV, JSON)

---

*Feature ini meningkatkan produktivitas dengan memungkinkan sharing data keuangan yang cepat dan profesional.*
