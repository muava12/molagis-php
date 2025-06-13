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
     * Mengambil statistik dashboard utama.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (statistik) atau 'error'.
     */
    public function getDashboardStatistics(?string $accessToken = null): array
    {
        $statistics = [
            'total_orders_today' => 0,
            'total_revenue_today' => 0.0,
            'pending_deliveries_today' => 0,
        ];
        $overallError = null;

        try {
            $tz = new \DateTimeZone('Asia/Makassar');
            $todayStart = new \DateTime('now', $tz);
            $todayStart->setTime(0, 0, 0);
            $todayEnd = new \DateTime('now', $tz);
            $todayEnd->setTime(23, 59, 59, 999999);

            $todayStartFormatted = $todayStart->format('Y-m-d\TH:i:s.v\Z');
            $todayEndFormatted = $todayEnd->format('Y-m-d\TH:i:s.v\Z');
            // Supabase often expects ISO8601 with Z or timezone offset
            // For PostgREST, it's often better to use .toISOString() equivalent or ensure UTC if not specifying timezone in query
            // Let's use a simpler date cast if supported by Supabase/PostgreSQL through PostgREST
             $todayDate = $todayStart->format('Y-m-d');


            // 1. Fetch Total Orders Today
            try {
                $queryOrdersToday = sprintf(
                    '/rest/v1/orders?tanggal_pesan=gte.%s&tanggal_pesan=lte.%s',
                    $todayStartFormatted,
                    $todayEndFormatted
                );
                $responseOrdersToday = $this->client->get($queryOrdersToday, [
                    'headers' => ['Prefer' => 'count=exact']
                ], $accessToken);

                if ($responseOrdersToday['error']) {
                    error_log('Supabase getDashboardStatistics (total_orders_today) error: ' . json_encode($responseOrdersToday['error']));
                    // Keep default 0, $overallError might be set if this is critical
                } else {
                    // The count is usually in Content-Range header or a dedicated field if API is structured for it
                    // Supabase/PostgREST returns count in Content-Range header: items 0-0/COUNT
                    $contentRange = $responseOrdersToday['headers']['Content-Range'][0] ?? null;
                    if ($contentRange && preg_match('/\/(\d+)$/', $contentRange, $matches)) {
                        $statistics['total_orders_today'] = (int) $matches[1];
                    } else {
                         // Fallback if header is not as expected, or if the count is in the body (less common for count=exact)
                         // This might happen if the response body directly contains the count or if it's an empty array with count in meta
                         // For count=exact, body is usually empty. If it's an array of items, count them.
                        if(is_array($responseOrdersToday['data'])) {
                             $statistics['total_orders_today'] = count($responseOrdersToday['data']);
                        } else {
                             error_log('Supabase getDashboardStatistics (total_orders_today) count not found in headers or data.');
                        }
                    }
                }
            } catch (\Exception $e) {
                error_log('Exception in getDashboardStatistics (total_orders_today): ' . $e->getMessage());
                // $overallError = "Error fetching total orders today."; // Optionally set overall error
            }

            // 2. Fetch Total Revenue Today
            try {
                $queryRevenueToday = sprintf(
                    '/rest/v1/orders?select=total_harga&tanggal_pesan=gte.%s&tanggal_pesan=lte.%s',
                    $todayStartFormatted,
                    $todayEndFormatted
                );
                $responseRevenueToday = $this->client->get($queryRevenueToday, [], $accessToken);

                if ($responseRevenueToday['error']) {
                    error_log('Supabase getDashboardStatistics (total_revenue_today) error: ' . json_encode($responseRevenueToday['error']));
                } else {
                    $totalRevenue = 0.0;
                    if (!empty($responseRevenueToday['data'])) {
                        foreach ($responseRevenueToday['data'] as $order) {
                            $totalRevenue += (float) ($order['total_harga'] ?? 0);
                        }
                    }
                    $statistics['total_revenue_today'] = $totalRevenue;
                }
            } catch (\Exception $e) {
                error_log('Exception in getDashboardStatistics (total_revenue_today): ' . $e->getMessage());
                // $overallError = "Error fetching total revenue today.";
            }

            // 3. Fetch Pending Deliveries Today
            // Using DATE(tanggal) = CURRENT_DATE equivalent for Supabase.
            // Assuming 'tanggal' in deliverydates is a date or timestamp field.
            // We will filter for status not 'completed' and not 'canceled'.
            try {
                // Supabase date filter: column=eq.YYYY-MM-DD
                $queryPendingDeliveries = sprintf(
                    '/rest/v1/deliverydates?tanggal=eq.%s&status=not.in.(completed,canceled)',
                     $todayDate // Use YYYY-MM-DD format for date column
                );
                $responsePendingDeliveries = $this->client->get($queryPendingDeliveries, [
                    'headers' => ['Prefer' => 'count=exact']
                ], $accessToken);

                if ($responsePendingDeliveries['error']) {
                    error_log('Supabase getDashboardStatistics (pending_deliveries_today) error: ' . json_encode($responsePendingDeliveries['error']));
                } else {
                    $contentRange = $responsePendingDeliveries['headers']['Content-Range'][0] ?? null;
                    if ($contentRange && preg_match('/\/(\d+)$/', $contentRange, $matches)) {
                        $statistics['pending_deliveries_today'] = (int) $matches[1];
                    } else {
                        if(is_array($responsePendingDeliveries['data'])) {
                             $statistics['pending_deliveries_today'] = count($responsePendingDeliveries['data']);
                        } else {
                            error_log('Supabase getDashboardStatistics (pending_deliveries_today) count not found in headers or data.');
                        }
                    }
                }
            } catch (\Exception $e) {
                error_log('Exception in getDashboardStatistics (pending_deliveries_today): ' . $e->getMessage());
                // $overallError = "Error fetching pending deliveries today.";
            }

        } catch (\Exception $e) {
            // Catch broad exceptions, like DateTimeZone issues
            error_log('General Exception in getDashboardStatistics: ' . $e->getMessage());
            $overallError = 'An unexpected error occurred while fetching dashboard statistics.';
            // Ensure statistics are default if a very early error occurs (e.g. DateTimeZone)
             $statistics = [
                'total_orders_today' => 0,
                'total_revenue_today' => 0.0,
                'pending_deliveries_today' => 0,
            ];
        }

        return ['data' => $statistics, 'error' => $overallError];
    }

    /**
     * Mengambil data pengantaran sekaligus memperbarui status berdasarkan tanggal.
     *
     * @param string $date Format YYYY-MM-DD
     * @param array|null $deliveryIds Daftar ID pengiriman yang akan diperbarui (opsional)
     * @param string|null $status Status baru (pending/in-progress/completed/canceled, opsional)
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'total' => int, 'delivery_date' => string, 'timezone' => string, 'error' => string|null]
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
                throw new \InvalidArgumentException('Delivery IDs tidak boleh kosong');
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

            // Tambahkan logging untuk debugging
            error_log("getDeliveriesAndUpdateStatus RPC response: " . json_encode($response));

            // Tangani error dari RPC
            if ($response['error']) {
                $errorMessage = $response['error']['message'] ?? 'Gagal mengambil data pengantaran';
                error_log('Supabase RPC error in getDeliveriesAndUpdateStatus: ' . $errorMessage . ' | Date: ' . $date . ' | Payload: ' . json_encode($payload));
                return [
                    'data' => [],
                    'total' => 0,
                    'delivery_date' => $date,
                    'timezone' => 'Asia/Makassar',
                    'error' => null, // Tidak ada error di frontend untuk kasus kosong
                ];
            }

            $rpcData = $response['data'] ?? [];

            // Jika data kosong, kembalikan array kosong
            if (empty($rpcData)) {
                return [
                    'data' => [],
                    'total' => 0,
                    'delivery_date' => $date,
                    'timezone' => 'Asia/Makassar',
                    'error' => null,
                ];
            }

            // Ambil data utama dari respons RPC
            $data = $rpcData['data'] ?? [];
            $totalDeliveries = (int) ($rpcData['total_deliveries'] ?? 0);
            $deliveryDate = (string) ($rpcData['delivery_date'] ?? $date);
            $timezone = (string) ($rpcData['timezone'] ?? 'Asia/Makassar');

            // Validasi dan format data
            $deliveries = array_filter(array_map(function ($item) {
                // Lewati item dengan delivery_count 0 untuk konsistensi
                if ((int) ($item['delivery_count'] ?? 0) === 0) {
                    return null;
                }
                return [
                    'kurir_id' => $item['courier_id'] === null ? null : (int) ($item['courier_id'] ?? null),
                    'courier_name' => (string) ($item['courier_name'] ?? 'Belum Dipilih'),
                    'jumlah_pengantaran' => (int) ($item['delivery_count'] ?? 0),
                    'jumlah_selesai' => (int) ($item['completed_count'] ?? 0),
                ];
            }, $data), function ($item) {
                return $item !== null;
            });

            return [
                'data' => array_values($deliveries), // Pastikan array terindeks
                'total' => $totalDeliveries,
                'delivery_date' => $deliveryDate,
                'timezone' => $timezone,
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid argument in getDeliveriesAndUpdateStatus: ' . $e->getMessage() . ' | Date: ' . $date);
            return [
                'data' => [],
                'total' => 0,
                'delivery_date' => $date,
                'timezone' => 'Asia/Makassar',
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            error_log('Unexpected error in getDeliveriesAndUpdateStatus: ' . $e->getMessage() . ' | Date: ' . $date . ' | Payload: ' . json_encode($payload));
            return [
                'data' => [],
                'total' => 0,
                'delivery_date' => $date,
                'timezone' => 'Asia/Makassar',
                'error' => null, // Tidak ada error di frontend
            ];
        }
    }

    /**
     * Mengambil detail pengantaran untuk kurir tertentu atau tanpa kurir berdasarkan tanggal.
     *
     * @param string|null $courierId ID kurir atau 'null' untuk item tanpa kurir
     * @param string $date Format YYYY-MM-DD
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     * @throws \InvalidArgumentException Jika parameter tidak valid
     */
    public function getDeliveryDetails(?string $courierId, string $date, ?string $accessToken = null): array
    {
        try {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }

            $headers = [];
            if ($accessToken) {
                $headers = ['Authorization' => "Bearer $accessToken"];
            }

            // Query untuk item dengan kurir tertentu atau tanpa kurir
            $kurirFilter = $courierId === 'null' || $courierId === null ? 'kurir_id=is.null' : "kurir_id=eq.{$courierId}";
            $query = "/rest/v1/deliverydates?select=id,tanggal,kurir_id,ongkir,status,couriers(id,nama),item_tambahan,harga_tambahan,orders(id,notes,customer_id,total_harga,tanggal_pesan,metode_pembayaran,customers(nama,alamat,telepon,telepon_alt,maps)),orderdetails(id,paket(id,nama),jumlah,paket_id,delivery_id,catatan_dapur,catatan_kurir,subtotal_harga)&tanggal=eq.{$date}&{$kurirFilter}&status=neq.canceled";
            
            // Tambahkan logging untuk query
            error_log("getDeliveryDetails query: {$query}");
            
            $response = $this->client->get($query, ['headers' => $headers]);

            // Tambahkan logging untuk respons
            error_log("getDeliveryDetails response: " . json_encode($response));

            if ($response['error']) {
                error_log('Supabase GET error in getDeliveryDetails: ' . ($response['error']['message'] ?? 'Unknown error') . ' | CourierID: ' . ($courierId ?? 'null') . ' | Date: ' . $date);
                return [
                    'data' => [],
                    'error' => null, // Tidak ada error di frontend
                ];
            }

            $deliveryDatesData = $response['data'] ?? [];
            
            // Tambahkan logging untuk data mentah
            error_log("getDeliveryDetails raw data: " . json_encode($deliveryDatesData));

            $groupedOrders = $this->groupByCustomerAndDate($deliveryDatesData);

            // Tambahkan logging untuk data yang dikelompokkan
            error_log("getDeliveryDetails grouped orders: " . json_encode($groupedOrders));

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
            error_log('Unexpected error in getDeliveryDetails: ' . $e->getMessage() . ' | CourierID: ' . ($courierId ?? 'null') . ' | Date: ' . $date);
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
            $namaKurir = $delivery['couriers']['nama'] ?? 'Belum Dipilih';
            $ongkirKurir = $delivery['ongkir'] && isset($delivery['couriers']) ? (int) $delivery['ongkir'] : 0;

            // Tambahkan logging untuk setiap entri
            error_log("groupByCustomerAndDate processing delivery: customerId=$customerId, kurir_id=" . ($delivery['kurir_id'] ?? 'null'));

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
                    'kurir_id' => $delivery['kurir_id'] ?? null, // Tambahkan kurir_id ke groupedOrders
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
                        'kurir_id' => $delivery['kurir_id'] ?? null,
                    ];
                }
            }
        }

        return array_values($groupedOrders);
    }

    /**
     * Mengambil data overview untuk kartu di dashboard.
     * Termasuk total revenue produk dari tanggal tertentu dan data mock lainnya.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @return array Data untuk kartu overview.
     */
    public function getDashboardOverviewData(?string $accessToken = null): array
    {
        // Calculate the first Monday of the current week
        $tz = new \DateTimeZone('Asia/Makassar'); // Assuming same timezone as other methods
        $today = new \DateTime('now', $tz);
        $firstMonday = clone $today;
        $firstMonday->modify('monday this week');
        $firstMondayFormatted = $firstMonday->format('Y-m-d');

        $productRevenue = 0.0;
        $overallError = null;

        try {
            // Call the RPC function get_total_revenue_from_date
            $rpcResponse = $this->client->rpc(
                'get_total_revenue_from_date',
                ['p_start_date' => $firstMondayFormatted],
                $accessToken ? ['headers' => ['Authorization' => "Bearer $accessToken"]] : []
            );

            if ($rpcResponse['error']) {
                error_log('Supabase RPC get_total_revenue_from_date error: ' . json_encode($rpcResponse['error']));
                $overallError = 'Gagal mengambil data revenue produk.';
                // Keep $productRevenue as 0.0
            } else {
                // Assuming the RPC function returns a single numeric value directly
                // Adjust if it returns an object or array, e.g., $rpcResponse['data'][0]['total_revenue']
                $productRevenue = (float) ($rpcResponse['data'] ?? 0.0);
            }
        } catch (\Exception $e) {
            error_log('Exception in getDashboardOverviewData (RPC call): ' . $e->getMessage());
            $overallError = 'Terjadi kesalahan saat mengambil data revenue produk.';
        }

        // Prepare data for the cards
        $overviewData = [
            'product_revenue' => [
                'value' => $productRevenue,
                'label' => 'Revenue Produk (Mingguan)', // Label updated to reflect weekly
                'error' => $overallError // Pass error specific to this card if any
            ],
            'total_orders'    => [
                'value' => 150, // Mock data
                'label' => 'Total Orders (Mingguan)',
                'error' => null
            ],
            'active_customers'=> [
                'value' => 65,  // Mock data
                'label' => 'Pelanggan Aktif (Mingguan)',
                'error' => null
            ],
            'average_order_value' => [
                'value' => 125000, // Mock data
                'label' => 'Rata-rata Order (Mingguan)',
                'error' => null
            ]
        ];

        return $overviewData;
    }
}