<?php

declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Molagis\Shared\SupabaseClient;

class DashboardService
{
    private SupabaseClient $client;

    public function __construct(SupabaseClient $client)
    {
        $this->client = $client;
    }

    /**
     * Mengambil data pengantaran berdasarkan tanggal.
     * @param string $date Format YYYY-MM-DD
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'total' => int, 'error' => string|null]
     */
    public function getDeliveriesByDate(string $date, ?string $accessToken = null): array
    {
        try {
            // Validasi format tanggal YYYY-MM-DD
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }
            $response = $this->client->get(
                "/rest/v1/deliverydates?select=kurir_id,couriers(nama),status&tanggal=eq.{$date}&status=neq.canceled",
                [],
                $accessToken
            );
            if ($response['error']) {
                return [
                    'data' => [],
                    'total' => 0,
                    'error' => $response['error'],
                ];
            }

            // Kelompokkan per kurir dan hitung jumlah pengantaran serta selesai
            $data = $response['data'];
            $deliveries = [];
            $courierMap = [];
            foreach ($data as $delivery) {
                $kurirId = $delivery['kurir_id'] ?? null;
                if ($kurirId && isset($delivery['couriers']['nama'])) {
                    if (!isset($courierMap[$kurirId])) {
                        $courierMap[$kurirId] = [
                            'kurir_id' => $kurirId,
                            'courier_name' => $delivery['couriers']['nama'],
                            'jumlah_pengantaran' => 0,
                            'jumlah_selesai' => 0,
                        ];
                    }
                    $courierMap[$kurirId]['jumlah_pengantaran']++;
                    if ($delivery['status'] === 'completed') {
                        $courierMap[$kurirId]['jumlah_selesai']++;
                    }
                }
            }
            $deliveries = array_values($courierMap);
            $total = array_sum(array_column($deliveries, 'jumlah_pengantaran'));

            return [
                'data' => $deliveries,
                'total' => $total,
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid date format: ' . $e->getMessage());
            return [
                'data' => [],
                'total' => 0,
                'error' => 'Format tanggal tidak valid',
            ];
        }
    }

    /**
     * Mengambil detail pengantaran berdasarkan kurir dan tanggal.
     * @param string $courierId ID kurir
     * @param string $date Format YYYY-MM-DD
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getDeliveryDetails(string $courierId, string $date, ?string $accessToken = null): array
    {
        try {
            // Validasi format tanggal YYYY-MM-DD
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }

            $response = $this->client->get(
                "/rest/v1/deliverydates?select=id,tanggal,kurir_id,ongkir,status,couriers(id,nama),item_tambahan,harga_tambahan,orders(id,notes,customer_id,total_harga,tanggal_pesan,metode_pembayaran,customers(nama,alamat,telepon,telepon_alt,maps)),orderdetails(id,paket(id,nama),jumlah,paket_id,delivery_id,catatan_dapur,catatan_kurir,subtotal_harga)&tanggal=eq.{$date}&kurir_id=eq.{$courierId}&status=neq.canceled",
                [],
                $accessToken
            );

            if ($response['error']) {
                return [
                    'data' => [],
                    'error' => $response['error'],
                ];
            }

            $deliveryDatesData = $response['data'];
            $groupedOrders = $this->groupByCustomerAndDate($deliveryDatesData);

            return [
                'data' => $groupedOrders,
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid date format: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Format tanggal tidak valid',
            ];
        } catch (\Exception $e) {
            error_log('Error fetching delivery details: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Mengelompokkan pesanan berdasarkan pelanggan dan tanggal.
     * @param array $deliveryDatesData Data dari Supabase
     * @return array Data yang sudah dikelompokkan
     */
    private function groupByCustomerAndDate(array $deliveryDatesData): array
    {
        $groupedOrders = [];
        foreach ($deliveryDatesData as $delivery) {
            $order = $delivery['orders'];
            $customerId = $order['customer_id'];
            $tanggalPesan = $order['tanggal_pesan'];
            $namaKurir = $delivery['couriers']['nama'] ?? 'Belum dipilih';
            $ongkirKurir = $delivery['ongkir'] && $delivery['couriers'] ? $delivery['ongkir'] : 0;

            if (!isset($groupedOrders[$customerId])) {
                $groupedOrders[$customerId] = [
                    'customer_id' => $customerId,
                    'customer_name' => $order['customers']['nama'],
                    'customer_address' => $order['customers']['alamat'],
                    'customer_phone' => $order['customers']['telepon'],
                    'customer_telepon_alt' => $order['customers']['telepon_alt'],
                    'customer_maps' => $order['customers']['maps'],
                    'tanggal_pesan' => $tanggalPesan,
                    'nama_kurir' => $namaKurir,
                    'ongkir' => $ongkirKurir,
                    'item_tambahan' => $delivery['item_tambahan'],
                    'harga_tambahan' => $delivery['harga_tambahan'],
                    'orders' => [],
                ];
            }

            foreach ($delivery['orderdetails'] as $detail) {
                $groupedOrders[$customerId]['orders'][] = [
                    'delivery_date_id' => $delivery['id'],
                    'order_detail_id' => $detail['id'],
                    'paket_id' => $detail['paket_id'],
                    'nama_paket' => $detail['paket']['nama'],
                    'jumlah' => $detail['jumlah'],
                    'subtotal_harga' => $detail['subtotal_harga'],
                    'notes' => $detail['catatan_kurir'],
                    'metode_pembayaran' => $order['metode_pembayaran'],
                    'status_pengiriman' => $delivery['status'],
                    'kurir_id' => $delivery['kurir_id'],
                ];
            }
        }

        return array_values($groupedOrders);
    }

    /**
     * Memperbarui status pengiriman untuk beberapa delivery ID.
     * @param array $deliveryIds Daftar ID pengiriman
     * @param string $status Status baru (pending/completed)
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['error' => string|null]
     */
    public function updateDeliveryStatus(array $deliveryIds, string $status, ?string $accessToken = null): array
    {
        try {
            // Validate input
            if (empty($deliveryIds)) {
                throw new \InvalidArgumentException('Delivery IDs cannot be empty');
            }

            // Construct the query parameter for id IN (id1,id2,...)
            $idsString = '(' . implode(',', array_map('intval', $deliveryIds)) . ')';
            $endpoint = "/rest/v1/deliverydates?id=in.{$idsString}";

            // Perform the PATCH request
            $response = $this->client->update(
                $endpoint,
                ['status' => $status],
                [], // No need for additional options here since the filtering is in the URL
                $accessToken
            );

            if ($response['error']) {
                return ['error' => $response['error']];
            }

            return ['error' => null];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid argument in updateDeliveryStatus: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        } catch (\Exception $e) {
            error_log('Error updating delivery status: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}
