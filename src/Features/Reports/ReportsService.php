<?php
declare(strict_types=1);

namespace Molagis\Features\Reports;

use Molagis\Shared\SupabaseClient;

/**
 * Service untuk mengelola data reports dan statistik.
 */
class ReportsService
{
    private SupabaseClient $client;

    public function __construct(SupabaseClient $client)
    {
        $this->client = $client;
    }

    /**
     * Mengambil overview statistics untuk dashboard reports.
     * Saat ini menggunakan mock data, nanti akan diintegrasikan dengan RPC functions.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $period Filter periode (weekly, monthly, atau null untuk semua)
     * @param string|null $startDate Tanggal mulai filter
     * @param string|null $endDate Tanggal akhir filter
     * @return array Hasil yang berisi 'data' (statistik) atau 'error'.
     */
    public function getOverviewStatistics(?string $accessToken = null, ?string $period = null, ?string $startDate = null, ?string $endDate = null): array
    {
        try {
            // Mock data untuk sementara
            // Nanti akan diganti dengan RPC call ke database
            $mockData = [
                'total_orders' => 156,
                'total_revenue' => 15750000,
                'active_customers' => 89,
                'average_order_value' => 101000,
                'period_info' => [
                    'type' => $period ?? 'all_time',
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'description' => $this->getPeriodDescription($period, $startDate, $endDate)
                ],
                'financial_overview' => [
                    // Revenue Section
                    'product_revenue' => 8000000,      // Pendapatan Produk (Omset Murni)
                    'delivery_revenue' => 1500000,     // Pendapatan Jasa Kirim (Ongkir)
                    'gross_revenue' => 9500000,        // Total Pendapatan Kotor

                    // COGS Section
                    'product_cost' => 3600000,         // Modal Produk

                    // Gross Profit
                    'gross_profit' => 4400000,         // Laba Kotor (product_revenue - product_cost)
                    'gross_margin' => 55,              // Margin Laba Kotor (%)

                    // Operating Expenses
                    'delivery_cost' => 1350000,        // Beban Jasa Kirim (Biaya Kurir)
                    'other_expenses' => 1500000,       // Pengeluaran Lain (Gaji, Listrik, dll)
                    'total_operating_expenses' => 2850000, // Total Biaya Operasional

                    // Net Profit
                    'net_profit' => 1550000,           // Laba Bersih (gross_profit - total_operating_expenses)
                    'net_margin' => 16.3               // Margin Laba Bersih (%)
                ]
            ];

            return ['data' => $mockData, 'error' => null];
        } catch (\Exception $e) {
            error_log('Error in getOverviewStatistics: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil data statistik overview'];
        }
    }

    /**
     * Mengambil data untuk role-based access.
     * Owner mendapat akses penuh, Admin CS mendapat akses terbatas.
     *
     * @param string $userRole Role pengguna (owner, admin_cs, dll)
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' atau 'error'.
     */
    public function getReportsByRole(string $userRole, ?string $accessToken = null): array
    {
        try {
            $baseData = $this->getOverviewStatistics($accessToken);
            
            if ($baseData['error']) {
                return $baseData;
            }

            $data = $baseData['data'];
            
            // Filter data berdasarkan role
            if ($userRole === 'admin_cs') {
                // Admin CS hanya bisa lihat data terbatas
                $data = [
                    'total_orders' => $data['total_orders'],
                    'active_customers' => $data['active_customers'],
                    'period_info' => $data['period_info'],
                    'access_level' => 'limited'
                ];
            } else {
                // Owner atau role lain mendapat akses penuh
                $data['access_level'] = 'full';
            }

            return ['data' => $data, 'error' => null];
        } catch (\Exception $e) {
            error_log('Error in getReportsByRole: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil data reports berdasarkan role'];
        }
    }

    /**
     * Helper function untuk mendapatkan deskripsi periode.
     */
    private function getPeriodDescription(?string $period, ?string $startDate, ?string $endDate): string
    {
        if ($period === 'weekly') {
            return 'Minggu ini (Senin - Sabtu)';
        } elseif ($period === 'monthly') {
            return 'Bulan ini';
        } elseif ($startDate && $endDate) {
            return "Periode: {$startDate} - {$endDate}";
        } else {
            return 'Semua waktu';
        }
    }

    /**
     * Placeholder untuk future integration dengan RPC functions.
     * Akan digunakan untuk memanggil stored procedures di database.
     */
    private function callReportsRPC(string $functionName, array $params, ?string $accessToken = null): array
    {
        try {
            $response = $this->client->rpc($functionName, $params, [], $accessToken);
            
            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log("Supabase RPC {$functionName} error: " . $errorMessage);
                return ['data' => null, 'error' => $errorMessage];
            }

            return ['data' => $response['data'] ?? [], 'error' => null];
        } catch (\Exception $e) {
            error_log("Error calling RPC {$functionName}: " . $e->getMessage());
            return ['data' => null, 'error' => "Gagal memanggil fungsi {$functionName}"];
        }
    }
}
