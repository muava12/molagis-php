<?php
declare(strict_types=1);

namespace Molagis\Features\Order;

use Molagis\Shared\SupabaseClient;
use InvalidArgumentException;
use RuntimeException;

class OrderService
{
    public function __construct(
        private SupabaseClient $supabaseClient
    ) {}

    /**
     * Mengambil daftar customer dari Supabase.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Daftar customer.
     */
    public function getCustomers(?string $accessToken = null): array
    {
        // Ambil juga ongkir default untuk potensi penggunaan di frontend
        $response = $this->supabaseClient->get('/rest/v1/customers?select=id,nama,ongkir,alamat', [], $accessToken);
        return $response['data'] ?? [];
    }

    /**
     * Mengambil daftar paket makanan dari Supabase.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Daftar paket.
     */
    public function getPackages(?string $accessToken = null): array
    {
        // Ambil harga jual dan modal untuk perhitungan di frontend
        $response = $this->supabaseClient->get('/rest/v1/paket?select=id,nama,harga_jual,harga_modal', [], $accessToken);
        return $response['data'] ?? [];
    }

    /**
     * Menyimpan data pesanan baru menggunakan RPC Supabase.
     * Menerima data yang sudah terstruktur dari frontend.
     *
     * @param array $data Data pesanan terstruktur sesuai format params RPC.
     * @param string|null $accessToken Token akses pengguna.
     * @return int ID pesanan yang baru dibuat.
     * @throws InvalidArgumentException Jika data input tidak valid.
     * @throws RuntimeException Jika terjadi error saat memanggil RPC.
     */
    public function saveOrder(array $data, ?string $accessToken = null): int
    {
        // --- Validasi Server-Side Struktur Data Input ---
        if (!isset($data['customer_id']) || !is_int($data['customer_id'])) {
            throw new InvalidArgumentException('customer_id tidak valid atau hilang.');
        }
        // new_ongkir bersifat opsional di RPC, tapi kita pastikan tipenya jika ada
        if (isset($data['new_ongkir']) && !is_numeric($data['new_ongkir']) && $data['new_ongkir'] !== null) {
             throw new InvalidArgumentException('Format new_ongkir tidak valid.');
        }
        if (!isset($data['order_data']) || !is_array($data['order_data'])) {
            throw new InvalidArgumentException('order_data tidak valid atau hilang.');
        }
        if (!isset($data['delivery_dates']) || !is_array($data['delivery_dates'])) {
            // Membolehkan array kosong jika logika bisnis mengizinkan,
            // tapi RPC mungkin memerlukan setidaknya satu. Sesuaikan jika perlu.
             throw new InvalidArgumentException('delivery_dates tidak valid atau hilang.');
        }
         if (!isset($data['order_details']) || !is_array($data['order_details'])) {
             // Membolehkan array kosong jika logika bisnis mengizinkan.
             throw new InvalidArgumentException('order_details tidak valid atau hilang.');
         }

        // Validasi isi order_data (contoh)
        $orderData = $data['order_data'];
        if (empty($orderData['customer_id']) || $orderData['customer_id'] !== $data['customer_id']) {
             throw new InvalidArgumentException('customer_id dalam order_data tidak konsisten.');
        }
        if (empty($orderData['tanggal_pesan']) /*|| !validasi_format_tanggal($orderData['tanggal_pesan'])*/) {
             throw new InvalidArgumentException('tanggal_pesan dalam order_data tidak valid.');
        }
        if (!isset($orderData['total_harga']) || !is_numeric($orderData['total_harga'])) {
             throw new InvalidArgumentException('total_harga dalam order_data tidak valid.');
        }
        // Tambahkan validasi lain untuk order_data jika perlu (notes, metode_pembayaran)

        // Validasi isi delivery_dates (contoh untuk elemen pertama)
        if (!empty($data['delivery_dates'])) {
            foreach ($data['delivery_dates'] as $index => $dd) {
                 if (empty($dd['tanggal']) /*|| !validasi_format_tanggal($dd['tanggal'])*/) {
                      throw new InvalidArgumentException("tanggal tidak valid untuk delivery_dates index {$index}.");
                 }
                 if (!isset($dd['ongkir']) || !is_numeric($dd['ongkir'])) {
                      throw new InvalidArgumentException("ongkir tidak valid untuk delivery_dates index {$index}.");
                 }
                  // Pastikan kurir_id adalah integer atau null
                 if (isset($dd['kurir_id']) && !is_int($dd['kurir_id']) && $dd['kurir_id'] !== null) {
                     throw new InvalidArgumentException("kurir_id tidak valid untuk delivery_dates index {$index}.");
                 }
                 // Tambahkan validasi lain untuk delivery_dates (status, item_tambahan, dll.)
            }
        } else {
             // Jika delivery_dates kosong, order_details juga harus kosong (asumsi)
             if (!empty($data['order_details'])) {
                 throw new InvalidArgumentException('order_details harus kosong jika delivery_dates kosong.');
             }
        }


        // Validasi isi order_details (contoh untuk elemen pertama)
         if (!empty($data['order_details'])) {
             foreach ($data['order_details'] as $index => $od) {
                 if (!isset($od['delivery_index']) || !is_int($od['delivery_index'])) {
                     throw new InvalidArgumentException("delivery_index tidak valid untuk order_details index {$index}.");
                 }
                 if (empty($od['paket_id']) || !is_int($od['paket_id'])) {
                     throw new InvalidArgumentException("paket_id tidak valid untuk order_details index {$index}.");
                 }
                 if (!isset($od['jumlah']) || !is_int($od['jumlah']) || $od['jumlah'] <= 0) {
                      throw new InvalidArgumentException("jumlah tidak valid untuk order_details index {$index}.");
                 }
                  // Tambahkan validasi lain untuk order_details (subtotal_harga, catatan, dll.)
             }
         }

        // Data dianggap valid dan memiliki struktur yang benar sesuai frontend
        // Langsung teruskan ke RPC

        // Panggil fungsi transaksi di Supabase dengan data yang sudah divalidasi
        // Nama fungsi RPC adalah 'save_order_transaction'
        // Parameter kedua untuk rpc adalah data itu sendiri, dibungkus dalam 'params' jika
        // fungsi RPC Anda didefinisikan untuk menerima satu argumen JSON bernama 'params'.
        // Jika fungsi RPC Anda menerima argumen terpisah (misal: customer_id, order_data, dll.),
        // Anda perlu menyesuaikan cara pemanggilan di SupabaseClient atau di sini.
        // Berdasarkan JS dan RPC sebelumnya, kita asumsikan RPC menerima satu objek 'params'.
        $response = $this->supabaseClient->rpc(
            'save_order_transaction', // Nama fungsi RPC
            ['params' => $data],       // Bungkus data dalam 'params'
            [],                        // Opsi Guzzle tambahan (jika ada)
            $accessToken               // Token akses
        );

        // Penanganan Error RPC
        if ($response['error']) {
            // Log error detail dari Supabase jika memungkinkan
            error_log('Supabase RPC save_order_transaction error: ' . print_r($response['error'], true));
            // Berikan pesan error yang lebih umum ke pengguna
            throw new RuntimeException('Gagal menyimpan pesanan ke database. Error: ' . $response['error']);
        }

        // Cek apakah data dan order_id ada dalam respons
        if (!isset($response['data']['order_id'])) {
             error_log('Supabase RPC save_order_transaction success but missing order_id in response: ' . print_r($response['data'], true));
            throw new RuntimeException('Gagal mendapatkan ID pesanan setelah menyimpan.');
        }

        // Kembalikan order_id jika berhasil
        return (int) $response['data']['order_id'];
    }

    // Fungsi getHolidays tetap sama seperti sebelumnya
    public function getHolidays(int $year): array
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get("https://date.nager.at/api/v3/PublicHolidays/{$year}/ID");
            return json_decode((string) $response->getBody(), true);
        } catch (\Exception $e) {
            error_log('Failed to fetch holidays: ' . $e->getMessage());
            return [];
        }
    }
}
