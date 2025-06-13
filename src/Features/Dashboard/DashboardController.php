<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Molagis\Shared\SupabaseService;
use Molagis\Features\Settings\SettingsService;
use Molagis\Features\Order\OrderService; // Added OrderService import

/**
 * Controller untuk mengelola halaman dan endpoint dashboard.
 */
class DashboardController
{
    public function __construct(
        private DashboardService $dashboardService,
        private SupabaseService $supabaseService,
        private SettingsService $settingsService,
        private OrderService $orderService, // Added OrderService property
        private Environment $twig,
    ) {}

    /**
     * Menampilkan halaman dashboard dengan data pengantaran yang di-render ke Twig.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return string Template Twig yang dirender
     */
    public function showDashboard(ServerRequestInterface $request): string
    {
        $user = $request->getAttribute('user');
        $accessToken = $_SESSION['user_token'] ?? null;
        $date = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
        $currentDate = $date->format('Y-m-d');

        // Initialize view data array
        $viewData = [
            'title' => 'Dashboard Molagis',
            'user_id' => $user['id'] ?? 'default-seed',
            'error' => null, // Initialize error string
        ];

        // Ambil data pengantaran untuk tanggal saat ini
        $deliveriesResult = $this->dashboardService->getDeliveriesAndUpdateStatus($currentDate, null, null, $accessToken);
        $viewData['deliveries'] = $deliveriesResult['data'] ?? [];
        $viewData['total_deliveries'] = $deliveriesResult['total'] ?? 0;
        $viewData['current_date'] = $deliveriesResult['delivery_date'] ?? $currentDate;
        $viewData['timezone'] = $deliveriesResult['timezone'] ?? 'Asia/Makassar';
        if (!empty($deliveriesResult['error'])) {
            $viewData['error'] = ($viewData['error'] ? $viewData['error'] . " | " : "") . "Kesalahan saat memuat data pengiriman: " . $deliveriesResult['error'];
        }

        // Determine if the initial load date is a Sunday
        // Ensure $viewData['current_date'] and $viewData['timezone'] are set before this.
        // $current_date is the string 'Y-m-d' for the initial view.
        // $viewData['timezone'] should be 'Asia/Makassar' or similar.
        $initialDateForView = $viewData['current_date']; // This is the date string
        $initialTimeZone = $viewData['timezone'] ?? 'Asia/Makassar'; // Default if not set by deliveriesResult

        try {
            $currentDateTime = new \DateTime($initialDateForView, new \DateTimeZone($initialTimeZone));
            $is_sunday_initial_load = ($currentDateTime->format('N') == 7); // 'N' gives ISO-8601 day of week, 7 is Sunday.
        } catch (\Exception $e) {
            // Log error or handle gracefully if date/timezone is invalid
            error_log("Error determining if initial date is Sunday: " . $e->getMessage());
            $is_sunday_initial_load = false; // Default to false on error
        }
        $viewData['is_sunday_initial_load'] = $is_sunday_initial_load;

        // Additionally, if it's a Sunday, we might want to adjust 'total_deliveries' for the badge
        // The badge currently shows {{ total_deliveries }}.
        // If it's Sunday, the JS sets it to 'Libur'. For SSR, we can do this too.
        if ($is_sunday_initial_load) {
            $viewData['total_deliveries_display'] = 'Libur'; // New variable for display
        } else {
            $viewData['total_deliveries_display'] = $viewData['total_deliveries'] ?? 0; // Existing numeric total
        }

        // Ambil daftar kurir aktif
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $viewData['couriers'] = $couriersResult['data'] ?? [];
        $viewData['active_couriers'] = $couriersResult['data'] ?? []; // Alias for compatibility
        if (!empty($couriersResult['error'])) {
            $viewData['error'] = ($viewData['error'] ? $viewData['error'] . " | " : "") . "Kesalahan saat memuat data kurir: " . $couriersResult['error'];
        }

        // Ambil pengaturan
        $defaultCourierResponse = $this->settingsService->getSettingByKey('default_courier', $accessToken);
        $viewData['default_courier'] = $defaultCourierResponse['data'] ?? null;
        if (!empty($defaultCourierResponse['error'])) {
             error_log("Error fetching default_courier setting: " . $defaultCourierResponse['error']);
             // Non-critical, just log
        }

        $defaultShippingCostResponse = $this->settingsService->getSettingByKey('default_shipping_cost', $accessToken);
        $viewData['default_shipping_cost'] = $defaultShippingCostResponse['data'] ?? '5000';
        if (!empty($defaultShippingCostResponse['error'])) {
             error_log("Error fetching default_shipping_cost setting: " . $defaultShippingCostResponse['error']);
             // Non-critical, just log
        }

        $businessNameResponse = $this->settingsService->getSettingByKey('business_name', $accessToken);
        $viewData['business_name'] = $businessNameResponse['data'] ?? 'Molagis';
        if (!empty($businessNameResponse['error'])) {
            error_log("Error fetching business_name setting: " . $businessNameResponse['error']);
            // Non-critical, just log
        }

        // Fetch Recent Orders
        $recentOrdersResult = $this->orderService->getRecentOrders(5, $accessToken);
        $viewData['recent_orders'] = $recentOrdersResult['data'] ?? [];
        $recentOrdersError = $recentOrdersResult['error'] ?? null;
        if ($recentOrdersError) {
            error_log("Error fetching recent orders: " . $recentOrdersError);
            $viewData['error'] = ($viewData['error'] ? $viewData['error'] . " | " : "") . "Gagal memuat data pesanan terakhir.";
        }

        // Fetch Dashboard Statistics
        $dashboardStatisticsResult = $this->dashboardService->getDashboardStatistics($accessToken);
        $viewData['dashboard_statistics'] = $dashboardStatisticsResult['data'] ?? ['total_orders_today' => 0, 'total_revenue_today' => 0, 'pending_deliveries_today' => 0];
        $statisticsError = $dashboardStatisticsResult['error'] ?? null;
        if ($statisticsError) {
            error_log("Error fetching dashboard statistics: " . $statisticsError);
            $viewData['error'] = ($viewData['error'] ? $viewData['error'] . " | " : "") . "Gagal memuat data statistik.";
        }

        // Fetch Dashboard Overview Cards Data
        $overviewCardsDataResult = $this->dashboardService->getDashboardOverviewData($accessToken);
        $viewData['overview_cards_data'] = $overviewCardsDataResult;
        // The getDashboardOverviewData method bundles errors per card item,
        // so a top-level error check might not be needed here unless the method's design changes.

        // Format delivery_date menggunakan IntlDateFormatter
        $formatter = new \IntlDateFormatter(
            'id_ID', // Lokalisasi Indonesia
            \IntlDateFormatter::FULL, // Gaya tanggal lengkap
            \IntlDateFormatter::NONE, // Tidak menyertakan waktu
            'Asia/Makassar', // Zona waktu
            \IntlDateFormatter::GREGORIAN,
            'EEEE, dd MMMM yyyy' // Format: Rabu, 14 Mei 2025
        );

        $deliveryDate = $viewData['current_date']; // Use date from $viewData
        try {
            $formattedDate = $formatter->format(new \DateTime($deliveryDate, new \DateTimeZone('Asia/Makassar')));
        } catch (\Exception $e) {
            error_log('Error formatting date in showDashboard: ' . $e->getMessage());
            // Fallback to current date if $deliveryDate is invalid for some reason
            $formattedDate = $formatter->format(new \DateTime('now', new \DateTimeZone('Asia/Makassar')));
        }
        $viewData['date_subtitle'] = $formattedDate; // Add formatted date to viewData

        // Ensure error is a string and trimmed
        if (is_array($viewData['error'])) { // Should not happen based on logic above, but as safeguard
            $viewData['error'] = implode(" | ", array_filter($viewData['error']));
        }
        $viewData['error'] = trim((string) $viewData['error']);
        if (empty($viewData['error'])) {
            $viewData['error'] = null; // Set to null if empty string after trim
        }

        return $this->twig->render('dashboard.html.twig', $viewData);
    }

    /**
     * Mengambil data pengantaran melalui API untuk interaksi dinamis.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon JSON
     */
    public function getDeliveries(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        $date = $queryParams['date'] ?? date('Y-m-d');

        $result = $this->dashboardService->getDeliveriesAndUpdateStatus($date, null, null, $accessToken);

        return new JsonResponse([
            'deliveries' => $result['data'] ?? [],
            'total_deliveries' => $result['total'] ?? 0,
            'delivery_date' => $result['delivery_date'] ?? $date,
            'timezone' => $result['timezone'] ?? 'Asia/Makassar',
            'error' => $result['error'] ?? null,
        ], $result['error'] ? 500 : 200);
    }

    /**
     * Memperbarui status pengantaran melalui API.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon JSON
     */
    public function updateDeliveryStatus(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        $queryParams = $request->getQueryParams();

        $date = $queryParams['date'] ?? date('Y-m-d');
        $deliveryIds = $data['delivery_ids'] ?? null;
        $status = $data['status'] ?? null;

        if (!$deliveryIds || !$status) {
            return new JsonResponse(['error' => 'Delivery IDs dan status diperlukan'], 400);
        }

        $result = $this->dashboardService->getDeliveriesAndUpdateStatus($date, $deliveryIds, $status, $accessToken);

        return new JsonResponse([
            'deliveries' => $result['data'] ?? [],
            'total_deliveries' => $result['total'] ?? 0,
            'delivery_date' => $result['delivery_date'] ?? $date,
            'timezone' => $result['timezone'] ?? 'Asia/Makassar',
            'error' => $result['error'] ?? null,
        ], $result['error'] ? 500 : 200);
    }

    /**
     * Mengambil detail pengantaran untuk kurir tertentu atau tanpa kurir.
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon JSON
     */
    public function getDeliveryDetails(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        $courierId = $queryParams['courier_id'] ?? 'null';
        $date = $queryParams['date'] ?? date('Y-m-d');

        $deliveryDetails = $this->dashboardService->getDeliveryDetails($courierId, $date, $accessToken);
        $courierName = 'Belum Dipilih';
        if ($courierId !== 'null') {
            $courierResult = $this->supabaseService->fetchById('couriers', $courierId, $accessToken);
            $courierName = $courierResult['data']['nama'] ?? 'Unknown';
        }

        // Tambahkan logging untuk debugging
        error_log("getDeliveryDetails response: courierId=$courierId, date=$date, grouped_orders=" . json_encode($deliveryDetails['data']));

        return new JsonResponse([
            'grouped_orders' => $deliveryDetails['data'] ?? [],
            'courier_name' => $courierName,
            'error' => $deliveryDetails['error'] ?? null,
        ], $deliveryDetails['error'] ? 500 : 200);
    }
}