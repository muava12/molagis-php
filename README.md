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