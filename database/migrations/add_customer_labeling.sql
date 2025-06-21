-- Membuat tabel 'labels' untuk menyimpan definisi label dengan kategori
CREATE TABLE public.labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL, -- e.g., 'Status Pelanggan', 'Info Hari Besar'
    description TEXT,
    color VARCHAR(50),
    UNIQUE (name, category) -- Menjamin nama label unik dalam satu kategori
);

-- Membuat tabel penghubung 'customer_labels' untuk relasi many-to-many
CREATE TABLE public.customer_labels (
    customer_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (customer_id, label_id),
    FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES public.labels (id) ON DELETE CASCADE
);

-- Menambahkan data awal untuk 'labels' dengan kategori
INSERT INTO public.labels (name, category, description, color) VALUES
-- Kategori: Status Pelanggan
('Prospek', 'Status Pelanggan', 'Calon pelanggan yang baru bertanya.', 'blue'),
('Pelanggan Baru', 'Status Pelanggan', 'Baru melakukan 1-2 kali pesanan.', 'cyan'),
('Pelanggan Setia', 'Status Pelanggan', 'Sering melakukan pesanan berulang.', 'teal'),
('Tidak Aktif', 'Status Pelanggan', 'Sudah lama tidak memesan (> 6 bulan).', 'gray'),
('VIP', 'Status Pelanggan', 'Pelanggan dengan nilai pesanan sangat besar atau sangat berpengaruh.', 'yellow'),

-- Kategori: Info Hari Besar
('Muslim', 'Info Hari Besar', 'Untuk ucapan Idul Fitri, Idul Adha, dll.', 'green'),
('Kristen/Katolik', 'Info Hari Besar', 'Untuk ucapan Natal, Paskah, dll.', 'purple'),
('Tionghoa', 'Info Hari Besar', 'Untuk ucapan Imlek.', 'red'),
('Hindu', 'Info Hari Besar', 'Untuk ucapan Nyepi, Galungan, dll.', 'orange'),
('Buddha', 'Info Hari Besar', 'Untuk ucapan Waisak.', 'yellow'); 