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

    /**
     * Mengambil daftar pesanan terbaru dari Supabase.
     *
     * @param int $limit Jumlah maksimal item yang diambil.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (daftar pesanan) atau 'error'.
     */
    public function getRecentOrders(int $limit = 5, ?string $accessToken = null): array
    {
        $query = sprintf(
            '/rest/v1/orders?select=id,total_harga,customers!inner(id,nama)&order=tanggal_pesan.desc&limit=%d',
            $limit
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : (string) $response['error'];
                error_log('Supabase getRecentOrders error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            $fetchedData = $response['data'] ?? [];
            $processedData = array_map(function ($order) {
                return [
                    'order_id' => $order['id'],
                    'total_harga' => $order['total_harga'],
                    'customer_name' => $order['customers']['nama'] ?? 'N/A', // Handle if customer somehow is null despite inner join
                ];
            }, $fetchedData);

            return ['data' => $processedData, 'error' => null];
        } catch (\Exception $e) {
            error_log('Exception in getRecentOrders: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching recent orders: ' . $e->getMessage()];
        }
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

    /**
     * Mengambil daftar pesanan dari Supabase dengan paginasi dan filter.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param int $limit Jumlah maksimal item yang diambil.
     * @param int $offset Jumlah item yang dilewati (untuk paginasi).
     * @return array Daftar pesanan atau array kosong jika terjadi error.
     */
    public function getOrderList(?string $accessToken = null, int $limit = 25, int $offset = 0): array
    {
        $query = sprintf(
            '/rest/v1/orders?select=id,tanggal_pesan,total_harga,metode_pembayaran,status_pesanan,customers(nama)&order=tanggal_pesan.desc,id.desc&limit=%d&offset=%d',
            $limit,
            $offset
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log('Supabase getOrderList error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            return ['data' => $response['data'] ?? [], 'error' => null];
        } catch (\Exception $e) {
            error_log('Exception in getOrderList: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching orders: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil semua data pengiriman untuk pelanggan tertentu, diratakan dan diurutkan.
     *
     * @param int $customerId ID pelanggan.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (daftar pengiriman yang diratakan) atau 'error'.
     */
    public function getDeliveriesByCustomerId(int $customerId, ?string $accessToken = null): array
    {
        $query = sprintf(
            '/rest/v1/orders?customer_id=eq.%d&select=id,tanggal_pesan,metode_pembayaran,notes,customers(nama),deliverydates(id,tanggal,status,ongkir,item_tambahan,harga_tambahan,total_harga_perhari,couriers(nama,color),orderdetails(id,jumlah,subtotal_harga,catatan_dapur,catatan_kurir,paket(nama)))&order=tanggal_pesan.desc',
            $customerId
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log('Supabase getDeliveriesByCustomerId error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            $allDeliveries = [];
            if (!empty($response['data'])) {
                foreach ($response['data'] as $order) {
                    $customerName = $order['customers']['nama'] ?? 'N/A';
                    if (isset($order['deliverydates']) && is_array($order['deliverydates'])) {
                        foreach ($order['deliverydates'] as $delivery) {
                            $allDeliveries[] = [
                                'delivery_id' => $delivery['id'],
                                'delivery_tanggal' => $delivery['tanggal'],
                                'delivery_status' => $delivery['status'] ?? 'N/A',
                                'delivery_ongkir' => $delivery['ongkir'] ?? 0,
                                'item_tambahan' => $delivery['item_tambahan'] ?? '',
                                'harga_tambahan' => $delivery['harga_tambahan'] ?? 0,
                                'total_harga_perhari' => $delivery['total_harga_perhari'] ?? 0,
                                'courier_nama' => $delivery['couriers']['nama'] ?? 'N/A',
                                'courier_color' => $delivery['couriers']['color'] ?? 'blue',
                                'order_id' => $order['id'],
                                'order_tanggal_pesan' => $order['tanggal_pesan'],
                                'order_metode_pembayaran' => $order['metode_pembayaran'] ?? 'N/A',
                                'order_notes' => $order['notes'] ?? '',
                                'customer_nama' => $customerName,
                                'details' => $delivery['orderdetails'] ?? []
                            ];
                        }
                    }
                }
                // Sort all deliveries by delivery_tanggal ascending
                usort($allDeliveries, function($a, $b) {
                    return strcmp($a['delivery_tanggal'], $b['delivery_tanggal']);
                });
            }
            return ['data' => $allDeliveries, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getDeliveriesByCustomerId: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching customer deliveries: ' . $e->getMessage()];
        }
    }
}
