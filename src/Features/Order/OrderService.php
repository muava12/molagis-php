<?php
declare(strict_types=1);

namespace Molagis\Features\Order;

use Molagis\Shared\SupabaseClient;
use InvalidArgumentException;
use RuntimeException;
use GuzzleHttp\Client as GuzzleClient;

class OrderService
{
    public function __construct(
        private SupabaseClient $supabase
    ) {}

    /**
     * Mengambil daftar customer dari Supabase.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Daftar customer.
     */
    public function getCustomers(?string $accessToken = null): array
    {
        $response = $this->supabase->get('/rest/v1/customers?select=id,nama,ongkir,alamat', [], $accessToken);
        return $response['data'] ?? [];
    }

    /**
     * Mengambil daftar paket makanan dari Supabase.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Daftar paket.
     */
    public function getPackages(?string $accessToken = null): array
    {
        $response = $this->supabase->get('/rest/v1/paket?select=id,nama,harga_jual,harga_modal&order=urutan.asc', [], $accessToken);
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
        // Validasi
        if (!isset($data['customer_id']) || !is_int($data['customer_id'])) {
            throw new InvalidArgumentException('customer_id tidak valid atau hilang.');
        }
        if (!isset($data['order_data']) || !is_array($data['order_data'])) {
            throw new InvalidArgumentException('order_data tidak valid atau hilang.');
        }

        // Panggil RPC
        $response = $this->supabase->rpc('submit_order', ['params' => $data], [], $accessToken);
        
        if ($response['error'] || !isset($response['data']['order_id'])) {
            error_log('Supabase RPC submit_order error: ' . ($response['error'] ?? 'No order_id returned'));
            throw new RuntimeException('Gagal mengirimkan pesanan ke database.');
        }

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
        $response = $this->supabase->get($query, [], $accessToken);
        
        if ($response['error']) {
            error_log('Supabase getRecentOrders error: ' . $response['error']);
            return [];
        }

        return array_map(function ($order) {
            return [
                'order_id' => $order['id'],
                'total_harga' => $order['total_harga'],
                'customer_name' => $order['customers']['nama'] ?? 'N/A',
            ];
        }, $response['data'] ?? []);
    }

    // Fungsi getHolidays tetap sama seperti sebelumnya
    public function getHolidays(int $year): array
    {
        try {
            $client = new GuzzleClient();
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
        $response = $this->supabase->get($query, [], $accessToken);
        return ['data' => $response['data'] ?? [], 'error' => $response['error']];
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
        $response = $this->supabase->get($query, [], $accessToken);

        if ($response['error']) {
            return ['data' => [], 'error' => $response['error']];
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
            usort($allDeliveries, fn($a, $b) => strcmp($a['delivery_tanggal'], $b['delivery_tanggal']));
        }
        return ['data' => $allDeliveries, 'error' => null];
    }

    /**
     * Updates a daily order using the update_daily_order RPC.
     *
     * @param int $deliveryId The ID of the delivery to update.
     * @param array $updateData Data for the update. Keys should match RPC's request structure.
     * @param string|null $accessToken User access token.
     * @return void
     * @throws RuntimeException If the RPC call fails.
     */
    public function updateDailyOrder(int $deliveryId, array $updateData, ?string $accessToken = null): void
    {
        // Logic di sini butuh RPC
        $response = $this->supabase->rpc(
            'update_daily_order',
            [
                'p_delivery_id' => $deliveryId,
                'request' => $updateData
            ],
            [],
            $accessToken
        );

        if ($response['error']) {
            error_log('Supabase RPC update_daily_order error: ' . $response['error']);
            throw new RuntimeException('Gagal update pesanan harian.');
        }
    }
}
