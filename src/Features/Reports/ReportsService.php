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
     * Mengambil data financial overview dari RPC function.
     *
     * @param string|null $startDate Tanggal mulai filter (YYYY-MM-DD)
     * @param string|null $endDate Tanggal akhir filter (YYYY-MM-DD)
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (financial overview) atau 'error'.
     */
    public function getFinancialOverview(?string $startDate = null, ?string $endDate = null, ?string $accessToken = null): array
    {
        try {
            // Call RPC function untuk mendapatkan data financial overview
            $result = $this->callReportsRPC('get_financial_overview', [
                'p_start_date' => $startDate,
                'p_end_date' => $endDate
            ], $accessToken);

            if ($result['error']) {
                error_log('Error from get_financial_overview RPC: ' . $result['error']);
                return ['data' => null, 'error' => $result['error']];
            }

            // RPC mengembalikan array dengan format: [{"get_financial_overview": {...}}]
            $rpcData = $result['data'];

            // Validasi bahwa response adalah array dan memiliki elemen pertama
            if (!is_array($rpcData) || empty($rpcData) || !isset($rpcData[0]['get_financial_overview'])) {
                error_log('Invalid RPC response structure: ' . json_encode($rpcData));
                return ['data' => null, 'error' => 'Format response RPC tidak valid'];
            }

            // Extract data dari struktur RPC yang baru
            $financialResponse = $rpcData[0]['get_financial_overview'];

            // Validasi struktur response dari RPC
            if (!isset($financialResponse['success']) || !$financialResponse['success']) {
                $errorMsg = $financialResponse['error']['message'] ?? 'Unknown RPC error';
                error_log('RPC get_financial_overview returned error: ' . $errorMsg);
                return ['data' => null, 'error' => 'Gagal mengambil data keuangan: ' . $errorMsg];
            }

            // Extract data dari RPC response
            $financialData = $financialResponse['data'] ?? [];

            // Add period description yang user-friendly
            if (isset($financialData['period_info'])) {
                $startDate = $financialData['period_info']['start_date'] ?? null;
                $endDate = $financialData['period_info']['end_date'] ?? null;
                $financialData['period_info']['description'] = $this->generatePeriodDescription($startDate, $endDate);
            }

            // Transform data structure untuk kompatibilitas dengan template yang ada
            if (isset($financialData['financial_overview'])) {
                $overview = $financialData['financial_overview'];

                // Map struktur baru ke format yang diharapkan template
                $transformedOverview = [
                    // Revenue mapping
                    'product_revenue' => $overview['revenue']['daily_catering'] ?? 0,
                    'delivery_revenue' => $overview['revenue']['delivery'] ?? 0,
                    'gross_revenue' => $overview['revenue']['total'] ?? 0,
                    'total_revenue' => $overview['revenue']['total'] ?? 0,

                    // Cost mapping
                    'product_cost' => $overview['cost_of_goods_sold']['daily_catering'] ?? 0,
                    'delivery_cost' => $overview['operating_expenses']['delivery'] ?? 0,
                    'other_expenses' => $overview['operating_expenses']['other'] ?? 0,
                    'total_operating_expenses' => $overview['operating_expenses']['total'] ?? 0,

                    // Profit calculations - Updated to use new gross_profit structure
                    'gross_profit' => $overview['gross_profit']['daily_catering'] ?? 0,
                    'net_product_profit' => $overview['net_profit_analysis']['daily_catering_profit'] ?? 0,
                    'net_delivery_profit' => $overview['net_profit_analysis']['delivery_profit'] ?? 0,
                    'event_catering_profit' => $overview['net_profit_analysis']['event_catering_profit'] ?? 0,
                    'net_profit' => $overview['net_profit_analysis']['total_net_profit'] ?? 0,

                    // Margin calculations - Updated to use gross_profit from RPC
                    'gross_margin' => $this->calculateGrossMargin(
                        $overview['gross_profit']['daily_catering'] ?? 0,
                        $overview['revenue']['daily_catering'] ?? 0
                    ),
                    'net_margin' => $overview['net_profit_analysis']['net_profit_margin_percent'] ?? 0,
                ];

                // Replace the financial_overview with transformed data
                $financialData['financial_overview'] = $transformedOverview;
            }

            return ['data' => $financialData, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getFinancialOverview: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Gagal mengambil data financial overview'];
        }
    }

    /**
     * Mengambil detail pesanan per customer untuk periode tertentu.
     *
     * @param string|null $startDate Tanggal mulai (YYYY-MM-DD)
     * @param string|null $endDate Tanggal akhir (YYYY-MM-DD)
     * @param string|null $accessToken Token akses pengguna
     * @return array Hasil yang berisi 'data' (detail pesanan) atau 'error'.
     */
    public function getCustomerOrderDetailsReport(?string $startDate, ?string $endDate, ?string $accessToken): array
    {
        try {
            $result = $this->callReportsRPC('get_customer_sales_report', [
                'p_start_date' => $startDate,
                'p_end_date' => $endDate,
            ], $accessToken);

            if (!empty($result['error'])) {
                $errorMessage = 'Gagal mengambil data laporan detail pesanan customer dari RPC: ' . $result['error'];
                error_log('Error from get_customer_sales_report RPC: ' . $result['error']);
                return ['data' => [], 'error' => $errorMessage];
            }

            if (!isset($result['data']) || !is_array($result['data'])) {
                $errorMessage = 'Format data tidak valid atau data kosong dari RPC get_customer_sales_report.';
                // Log error jika data tidak ada atau bukan array, meskipun tidak ada error eksplisit dari RPC
                error_log($errorMessage . ' Response: ' . json_encode($result['data']));
                return ['data' => [], 'error' => $errorMessage];
            }

            // Jika data kosong (array kosong), kembalikan array kosong, bukan error.
            // Ini sesuai dengan ekspektasi bahwa RPC mengembalikan array customer sales objects.
            // Jika tidak ada penjualan, array kosong adalah respons yang valid.
            if (empty($result['data'])) {
                return ['data' => [], 'error' => null];
            }

            return ['data' => $result['data'], 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getCustomerOrderDetailsReport: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Gagal mengambil detail pesanan customer: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil overview statistics untuk dashboard reports.
     * Menggunakan data dari financial overview dan menambahkan statistik lainnya.
     *
     * @param string|null $accessToken Token akses pengguna.
     * @param string|null $period Filter periode (weekly, monthly, atau null untuk semua)
     * @param string|null $startDate Tanggal mulai filter
     * @param string|null $endDate Tanggal akhir filter
     * @return array Hasil yang berisi 'data' (statistik) atau 'error'.
     */
    public function getOverviewStatistics(?string $accessToken = null, ?string $startDate = null, ?string $endDate = null): array
    {
        try {
            // Get financial data dari RPC
            $financialResult = $this->getFinancialOverview($startDate, $endDate, $accessToken);

            if ($financialResult['error']) {
                return $financialResult;
            }

            $financialData = $financialResult['data'];

            // TODO: Tambahkan RPC calls untuk statistik lainnya
            // Untuk sementara gunakan mock data untuk non-financial metrics
            $additionalStats = [
                'total_orders' => 156,
                'active_customers' => 89,
                'average_order_value' => 101000,
            ];

            // Combine financial data dengan additional stats
            $combinedData = array_merge($additionalStats, $financialData);

            return ['data' => $combinedData, 'error' => null];

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
     * @param string|null $startDate Tanggal mulai filter
     * @param string|null $endDate Tanggal akhir filter
     * @return array Hasil yang berisi 'data' atau 'error'.
     */
    public function getReportsByRole(string $userRole, ?string $accessToken = null, ?string $startDate = null, ?string $endDate = null): array
    {
        try {
            // Get financial data dari RPC
            $financialResult = $this->getFinancialOverview($startDate, $endDate, $accessToken);

            if ($financialResult['error']) {
                return $financialResult;
            }

            $data = $financialResult['data'];

            // Filter data berdasarkan role
            if ($userRole === 'admin_cs') {
                // Admin CS hanya bisa lihat data revenue, sembunyikan data cost dan profit
                if (isset($data['financial_overview'])) {
                    $data['financial_overview']['product_cost'] = null;
                    $data['financial_overview']['gross_profit'] = null;
                    $data['financial_overview']['gross_margin'] = null;
                    $data['financial_overview']['delivery_cost'] = null;
                    $data['financial_overview']['other_expenses'] = null;
                    $data['financial_overview']['total_operating_expenses'] = null;
                    $data['financial_overview']['net_product_profit'] = null;
                    $data['financial_overview']['net_delivery_profit'] = null;
                    $data['financial_overview']['event_catering_profit'] = null;
                    $data['financial_overview']['net_profit'] = null;
                    $data['financial_overview']['net_margin'] = null;
                }
                $data['access_level'] = 'limited';
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
     * Helper function untuk menghitung gross margin percentage.
     */
    private function calculateGrossMargin(float $grossProfit, float $revenue): float
    {
        if ($revenue <= 0) {
            return 0.0;
        }
        return round(($grossProfit / $revenue) * 100, 2);
    }

    /**
     * Helper function untuk mendapatkan deskripsi periode yang user-friendly.
     */
    private function generatePeriodDescription(?string $startDate, ?string $endDate): string
    {
        if (!$startDate || !$endDate) {
            return 'Semua waktu';
        }

        try {
            // Create DateTime objects with explicit timezone to avoid timezone issues
            $timezone = new \DateTimeZone('Asia/Jakarta'); // or use server timezone
            $start = new \DateTime($startDate, $timezone);
            $end = new \DateTime($endDate, $timezone);

            // Format bulan Indonesia
            $monthNames = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
                5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
                9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
            ];

            // Jika periode adalah satu bulan penuh
            if ($start->format('d') === '01' && $end->format('d') === $end->format('t')) {
                $monthNum = (int)$start->format('n');
                $year = $start->format('Y');
                return $monthNames[$monthNum] . ' ' . $year;
            }

            // Jika periode adalah satu minggu (6 hari, Senin-Sabtu)
            $daysDiff = $start->diff($end)->days;
            if ($daysDiff === 5) { // 6 hari (0-5)
                $startDay = $start->format('j');
                $endDay = $end->format('j');
                $monthNum = (int)$start->format('n');
                $year = $start->format('Y');
                return "Minggu {$startDay}-{$endDay} " . $monthNames[$monthNum] . ' ' . $year;
            }

            // Format default untuk periode custom
            $startFormatted = $start->format('j') . ' ' . $monthNames[(int)$start->format('n')] . ' ' . $start->format('Y');
            $endFormatted = $end->format('j') . ' ' . $monthNames[(int)$end->format('n')] . ' ' . $end->format('Y');

            if ($start->format('Y-m') === $end->format('Y-m')) {
                // Sama bulan dan tahun
                return $start->format('j') . '-' . $end->format('j') . ' ' . $monthNames[(int)$start->format('n')] . ' ' . $start->format('Y');
            } else {
                // Beda bulan atau tahun
                return $startFormatted . ' - ' . $endFormatted;
            }

        } catch (\Exception $e) {
            error_log('Error generating period description: ' . $e->getMessage());
            return "Periode: {$startDate} - {$endDate}";
        }
    }

    /**
     * Helper function untuk mendapatkan deskripsi periode (legacy method).
     * @deprecated Use generatePeriodDescription instead
     */
    private function getPeriodDescription(?string $period, ?string $startDate, ?string $endDate): string
    {
        if ($period === 'weekly') {
            return 'Minggu ini (Senin - Sabtu)';
        } elseif ($period === 'monthly') {
            return 'Bulan ini';
        } elseif ($startDate && $endDate) {
            return $this->generatePeriodDescription($startDate, $endDate);
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
