<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Molagis\Shared\SupabaseClient;

/**
 * Service untuk mengelola data dashboard, termasuk pengambilan dan pembaruan status pengantaran.
 */
class DashboardService
{
    private SupabaseClient $client;

    public function __construct(SupabaseClient $client)
    {
        $this->client = $client;
    }

    /**
     * Mengambil data pengantaran sekaligus memperbarui status berdasarkan tanggal.
     *
     * @param string $date Format YYYY-MM-DD
     * @param array|null $deliveryIds Daftar ID pengiriman yang akan diperbarui (opsional)
     * @param string|null $status Status baru (pending/completed, opsional)
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'total' => int, 'today_date' => string, 'processing_date' => string, 'error' => string|null]
     * @throws \InvalidArgumentException Jika parameter tidak valid
     */
    public function getDeliveriesAndUpdateStatus(string $date, ?array $deliveryIds = null, ?string $status = null, ?string $accessToken = null): array
    {
        try {
            // Validasi format tanggal YYYY-MM-DD
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }

            // Validasi status jika diberikan
            if ($status && !in_array($status, ['pending', 'in-progress', 'completed', 'canceled'])) {
                throw new \InvalidArgumentException('Status tidak valid');
            }

            // Validasi deliveryIds jika diberikan
            if ($deliveryIds && empty($deliveryIds)) {
                throw new \InvalidArgumentException('Delivery IDs cannot be empty');
            }

            // Siapkan payload untuk RPC
            $payload = [
                'p_date' => $date,
                'p_delivery_ids' => $deliveryIds ?? [],
                'p_status' => $status,
            ];

            $options = [];
            if ($accessToken) {
                $options['headers'] = ['Authorization' => "Bearer $accessToken"];
            }

            // Panggil fungsi RPC
            $response = $this->client->rpc(
                'get_deliveries_and_update_status',
                $payload,
                $options
            );

            // Tangani error dari RPC, termasuk error struktur query
            if ($response['error']) {
                $errorMessage = $response['error']['message'] ?? 'Gagal mengambil data pengantaran';
                error_log('Supabase RPC error in getDeliveriesAndUpdateStatus: ' . $errorMessage . ' | Date: ' . $date . ' | Payload: ' . json_encode($payload));
                return [
                    'data' => [],
                    'total' => 0,
                    'today_date' => $date,
                    'processing_date' => date('Y-m-d'),
                    'error' => null, // Tidak ada error di frontend untuk kasus kosong
                ];
            }

            $data = $response['data'] ?? [];

            // Jika data kosong atau hanya baris default dengan courier_id NULL
            if (empty($data) || (count($data) === 1 && is_null($data[0]['courier_id']))) {
                return [
                    'data' => [],
                    'total' => 0,
                    'today_date' => $date,
                    'processing_date' => date('Y-m-d'),
                    'error' => null,
                ];
            }

            // Validasi struktur data untuk memastikan konsistensi
            $deliveries = array_map(function ($item) {
                return [
                    'kurir_id' => (int) ($item['courier_id'] ?? 0),
                    'courier_name' => (string) ($item['courier_name'] ?? 'Unknown'),
                    'jumlah_pengantaran' => (int) ($item['jumlah_pengantaran'] ?? 0),
                    'jumlah_selesai' => (int) ($item['jumlah_selesai'] ?? 0),
                ];
            }, $data);

            // Hitung total pengantaran
            $totalDeliveries = (int) ($data[0]['total_deliveries'] ?? array_sum(array_column($data, 'jumlah_pengantaran')));

            return [
                'data' => array_filter($deliveries, fn($item) => $item['kurir_id'] !== 0),
                'total' => $totalDeliveries,
                'today_date' => $date,
                'processing_date' => date('Y-m-d'),
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid argument in getDeliveriesAndUpdateStatus: ' . $e->getMessage() . ' | Date: ' . $date);
            return [
                'data' => [],
                'total' => 0,
                'today_date' => $date,
                'processing_date' => date('Y-m-d'),
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            error_log('Unexpected error in getDeliveriesAndUpdateStatus: ' . $e->getMessage() . ' | Date: ' . $date . ' | Payload: ' . json_encode($payload));
            return [
                'data' => [],
                'total' => 0,
                'today_date' => $date,
                'processing_date' => date('Y-m-d'),
                'error' => null, // Tidak ada error di frontend
            ];
        }
    }

    /**
     * Mengambil detail pengantaran untuk kurir tertentu berdasarkan tanggal.
     *
     * @param string $courierId ID kurir
     * @param string $date Format YYYY-MM-DD
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     * @throws \InvalidArgumentException Jika parameter tidak valid
     */
    public function getDeliveryDetails(string $courierId, string $date, ?string $accessToken = null): array
    {
        try {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }

            $headers = [];
            if ($accessToken) {
                $headers = ['Authorization' => "Bearer $accessToken"];
            }

            $response = $this->client->get(
                "/rest/v1/deliverydates?select=id,tanggal,kurir_id,ongkir,status,couriers(id,nama),item_tambahan,harga_tambahan,orders(id,notes,customer_id,total_harga,tanggal_pesan,metode_pembayaran,customers(nama,alamat,telepon,telepon_alt,maps)),orderdetails(id,paket(id,nama),jumlah,paket_id,delivery_id,catatan_dapur,catatan_kurir,subtotal_harga)&tanggal=eq.{$date}&kurir_id=eq.{$courierId}&status=neq.canceled",
                $headers
            );

            if ($response['error']) {
                error_log('Supabase GET error in getDeliveryDetails: ' . ($response['error']['message'] ?? 'Unknown error') . ' | CourierID: ' . $courierId . ' | Date: ' . $date);
                return [
                    'data' => [],
                    'error' => null, // Tidak ada error di frontend
                ];
            }

            $deliveryDatesData = $response['data'] ?? [];
            $groupedOrders = $this->groupByCustomerAndDate($deliveryDatesData);

            return [
                'data' => $groupedOrders,
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid date format in getDeliveryDetails: ' . $e->getMessage() . ' | Date: ' . $date);
            return [
                'data' => [],
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            error_log('Unexpected error in getDeliveryDetails: ' . $e->getMessage() . ' | CourierID: ' . $courierId . ' | Date: ' . $date);
            return [
                'data' => [],
                'error' => null, // Tidak ada error di frontend
            ];
        }
    }

    /**
     * Mengelompokkan data pengantaran berdasarkan pelanggan dan tanggal.
     *
     * @param array $deliveryDatesData Data pengantaran dari Supabase
     * @return array Data yang dikelompokkan
     */
    private function groupByCustomerAndDate(array $deliveryDatesData): array
    {
        $groupedOrders = [];
        foreach ($deliveryDatesData as $delivery) {
            $order = $delivery['orders'] ?? [];
            $customerId = $order['customer_id'] ?? null;
            $tanggalPesan = $order['tanggal_pesan'] ?? null;
            $namaKurir = $delivery['couriers']['nama'] ?? 'Belum dipilih';
            $ongkirKurir = $delivery['ongkir'] && isset($delivery['couriers']) ? (int) $delivery['ongkir'] : 0;

            if ($customerId && !isset($groupedOrders[$customerId])) {
                $groupedOrders[$customerId] = [
                    'customer_id' => $customerId,
                    'customer_name' => $order['customers']['nama'] ?? 'Unknown',
                    'customer_address' => $order['customers']['alamat'] ?? '',
                    'customer_phone' => $order['customers']['telepon'] ?? '',
                    'customer_telepon_alt' => $order['customers']['telepon_alt'] ?? '',
                    'customer_maps' => $order['customers']['maps'] ?? '',
                    'tanggal_pesan' => $tanggalPesan,
                    'nama_kurir' => $namaKurir,
                    'ongkir' => $ongkirKurir,
                    'item_tambahan' => $delivery['item_tambahan'] ?? '',
                    'harga_tambahan' => $delivery['harga_tambahan'] ?? 0,
                    'orders' => [],
                ];
            }

            if ($customerId) {
                foreach ($delivery['orderdetails'] ?? [] as $detail) {
                    $groupedOrders[$customerId]['orders'][] = [
                        'delivery_date_id' => $delivery['id'] ?? 0,
                        'order_detail_id' => $detail['id'] ?? 0,
                        'paket_id' => $detail['paket_id'] ?? null,
                        'nama_paket' => $detail['paket']['nama'] ?? 'Unknown',
                        'jumlah' => $detail['jumlah'] ?? 0,
                        'subtotal_harga' => $detail['subtotal_harga'] ?? 0,
                        'notes' => $detail['catatan_kurir'] ?? '',
                        'metode_pembayaran' => $order['metode_pembayaran'] ?? 'unknown',
                        'status_pengiriman' => $delivery['status'] ?? 'pending',
                        'kurir_id' => $delivery['kurir_id'] ?? 0,
                    ];
                }
            }
        }

        return array_values($groupedOrders);
    }
}