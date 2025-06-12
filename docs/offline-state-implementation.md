# Implementasi Offline State

## Overview
Implementasi offline state untuk menangani koneksi internet yang terputus dengan menampilkan halaman empty state yang user-friendly.

## Komponen yang Dibuat

### 1. SVG Whale Icon
- **File**: `src/Shared/templates/svg/whale.svg.twig`
- **Ukuran**: 250x250px (lebih besar untuk visibility yang lebih baik)
- **Penggunaan**: Icon untuk halaman offline state

### 2. Template Offline
- **File**: `src/Shared/templates/offline.html.twig`
- **Layout**: Mengikuti struktur `404.html.twig`
- **Fitur**:
  - Tombol "Coba Lagi" untuk reload halaman
  - Tombol "Kembali ke Dashboard" untuk navigasi
  - Pesan yang user-friendly

### 3. JavaScript Offline Handler
- **File**: `public/js/app/offline-handler.js`
- **Fitur**:
  - Deteksi online/offline events
  - Periodic connection check (setiap 30 detik)
  - **Silent offline detection**: Tidak langsung menampilkan offline state
  - **Navigation-triggered offline state**: Hanya tampil saat ada attempt navigasi
  - Restore konten asli saat koneksi kembali
  - Fallback template jika endpoint tidak tersedia
  - **Navigation blocking**: Mencegah logout dengan memblokir navigasi saat offline
  - **Session preservation**: Mempertahankan sesi user saat koneksi terputus
  - **Retry mechanism**: Tombol "Coba Lagi" yang aman tanpa menyebabkan logout

### 4. Controller
- **File**: `src/Shared/OfflineController.php`
- **Endpoints**:
  - `GET /offline` - Halaman offline state
  - `GET /offline-template` - Template untuk AJAX
  - `HEAD|GET /api/ping` - Endpoint untuk cek koneksi

### 5. Routes
Ditambahkan ke `public/index.php`:
```php
['GET', '/offline', [OfflineController::class, 'showOfflinePage'], []],
['GET', '/offline-template', [OfflineController::class, 'getOfflineTemplate'], []],
['HEAD', '/api/ping', [OfflineController::class, 'ping'], []],
['GET', '/api/ping', [OfflineController::class, 'ping'], []],
```

## Cara Kerja

1. **Deteksi Koneksi**: JavaScript mendengarkan event `online`/`offline` dan melakukan periodic check
2. **Silent Offline Detection**: Saat koneksi terputus, sistem hanya mencatat status tanpa menampilkan offline state
3. **Navigation Trigger**: Offline state baru ditampilkan saat user mencoba navigasi/reload halaman
4. **Navigation Blocking**: Semua navigasi, form submission, dan reload diblokir saat offline state aktif
5. **Session Preservation**: User tetap login, tidak ada redirect ke halaman login
6. **Retry Mechanism**: Tombol "Coba Lagi" melakukan connection check tanpa reload
7. **Restore**: Saat koneksi kembali, konten asli dikembalikan dan event listeners dipulihkan
8. **Fallback**: Jika endpoint tidak tersedia, menggunakan template fallback yang embedded

## Penggunaan

Script offline handler akan otomatis aktif di semua halaman yang menggunakan `base.html.twig`. Tidak perlu konfigurasi tambahan.

## Testing

Untuk testing offline state:
1. Buka Developer Tools → Network tab
2. Set "Offline" atau "Slow 3G"
3. Navigasi atau reload halaman
4. Halaman offline state akan muncul
5. Kembalikan koneksi untuk melihat restore

## Customization

- **Pesan**: Edit `src/Shared/templates/offline.html.twig`
- **Icon**: Ganti `src/Shared/templates/svg/whale.svg.twig`
- **Behavior**: Modifikasi `public/js/app/offline-handler.js`
- **Styling**: Menggunakan CSS yang sama dengan halaman 404