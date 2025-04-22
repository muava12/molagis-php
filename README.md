## Struktur JavaScript

- public/js/: Berisi library pihak ketiga dan kode kustom.

- Library: File seperti tabler.min.js langsung di root public/js/.

- Kustom: Kode buatan proyek di public/js/app/ (misalnya, theme.js, auth.js, index.js).

## Struktur Template
- `src/Shared/templates/layouts/`: Base template (misalnya, `base.html.twig`).
- `src/Shared/templates/partials/`: Komponen reusable (misalnya, `header.html.twig`, `footer.html.twig`).
- `src/Features/*/templates/`: Template spesifik fitur (misalnya, `Dashboard/templates/index.html.twig`).


catering/
├── public/
│   ├── css/
│   │   └── tabler.min.css
│   ├── js/
│   │   └── tabler.min.js
│   └── index.php
├── src/
│   ├── Features/
│   │   ├── Auth/
│   │   │   ├── AuthController.php
│   │   │   ├── AuthService.php
│   │   │   └── templates/
│   │   │       └── login.html.twig
│   │   ├── Dashboard/
│   │   │   ├── DashboardController.php
│   │   │   └── templates/
│   │   │       └── index.html.twig
│   ├── Shared/
│   │   ├── SupabaseService.php
│   │   └── templates/
│   │       ├── layouts/
│   │       │   └── base.html.twig
│   │       └── partials/
│   │           ├── header.html.twig
│   │           └── footer.html.twig
├── .env
├── composer.json


## URL dan Routing
- Menggunakan **FastRoute** untuk routing bersih tanpa ekstensi (.php/.html).
- **Pengembangan (Nginx, Valet)**:
  - Default Valet tanpa konfigurasi tambahan.
  - URL: `/login`, `/dashboard`.
- **Produksi (Apache)**:
  - `public/.htaccess` untuk URL bersih.
  - Aktifkan `mod_rewrite` dan `AllowOverride All`.
- Rute:
  - `GET /` atau `/login`: Halaman login.
  - `POST /login`: Proses login.
  - `GET /dashboard`: Halaman dashboard.
- Tambah rute di `index.php` dengan `$r->addRoute()`.
- Jalankan `composer check-templates` untuk validasi folder.
## URL dan Routing
- Menggunakan **FastRoute** untuk routing bersih tanpa ekstensi (.php/.html).
- **Pengembangan (Nginx, Valet)**:
  - Default Valet tanpa konfigurasi tambahan.
  - URL: `/login`, `/dashboard`.
- **Produksi (Apache)**:
  - `public/.htaccess` untuk URL bersih.
  - Aktifkan `mod_rewrite` dan `AllowOverride All`.
- Rute:
  - `GET /` atau `/login`: Halaman login.
  - `POST /login`: Proses login.
  - `GET /dashboard`: Halaman dashboard.
- Tambah rute di `index.php` dengan `$r->addRoute()`.
- Jalankan `composer check-templates` untuk validasi folder.

## JavaScript Structure
- **dashboard.js**:
  - Struktur: Variabel DOM di awal, fungsi utilitas (`fetchDeliveries`), event listener di akhir.
  - Fungsi `renderErrorAlert` dipindah ke `utils.js` untuk reusability.
  - Menggunakan Tabler CSS untuk alert dan spinner.
  - Pembersihan listener untuk mencegah duplikasi.
- **Error Handling**:
  - Server-side: Twig (`error_alert.html.twig`) untuk alert awal.
  - Client-side: JavaScript (`renderErrorAlert`) untuk alert dinamis, lebih efisien daripada Twig client-side.
  - Alert ditampilkan di `#error-container` (page-body).
- **Verifikasi**:
  - Cek konsol untuk log: `Fetch error:`, `Previous button clicked`.
  - Uji error dengan hard-coded error di `getDeliveries` atau matikan internet.