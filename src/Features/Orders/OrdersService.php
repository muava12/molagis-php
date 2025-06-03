<?php
declare(strict_types=1);

namespace Molagis\Features\Orders;

use Molagis\Shared\SupabaseClient;
// Note: InvalidArgumentException and RuntimeException are not strictly needed here
// as the copied methods don't directly throw them, but can be added if future methods do.

class OrdersService
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
     * Mengambil semua data pengiriman untuk pelanggan tertentu, diratakan dan diurutkan.
     *
     * @param int $customerId ID pelanggan.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (daftar pengiriman yang diratakan) atau 'error'.
     */
    public function getDeliveriesByCustomerId(int $customerId, ?string $accessToken = null): array
    {
        $query = sprintf(
            '/rest/v1/orders?customer_id=eq.%d&select=id,tanggal_pesan,metode_pembayaran,notes,customers(nama),deliverydates(id,tanggal,status,ongkir,item_tambahan,harga_tambahan,total_harga_perhari,couriers(nama),orderdetails(id,jumlah,subtotal_harga,catatan_dapur,catatan_kurir,paket(nama)))&order=tanggal_pesan.desc',
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
