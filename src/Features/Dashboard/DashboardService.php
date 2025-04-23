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
     * Mengambil daftar kurir aktif dari Supabase.
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getActiveCouriers(): array
    {
        return $this->client->get('/rest/v1/couriers?select=id,nama&aktif=eq.true');
    }

    /**
     * Mengambil data pengantaran berdasarkan tanggal.
     * @param string $date Format YYYY-MM-DD
     * @return array ['data' => array, 'total' => int, 'error' => string|null]
     */
    public function getDeliveriesByDate(string $date): array
    {
        try {
            // Validasi format tanggal YYYY-MM-DD
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }
            $response = $this->client->get("/rest/v1/deliverydates?select=kurir_id,couriers(nama),status&tanggal=eq.{$date}&status=neq.canceled");
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
}