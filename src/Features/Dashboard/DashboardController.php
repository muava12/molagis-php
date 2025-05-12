<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Molagis\Shared\SupabaseService;
use Molagis\Features\Settings\SettingsService;

/**
 * Controller untuk mengelola halaman dan endpoint dashboard.
 */
class DashboardController
{
    public function __construct(
        private DashboardService $dashboardService,
        private SupabaseService $supabaseService,
        private SettingsService $settingsService,
        private Environment $twig,
    ) {}

    /**
     * Menampilkan halaman dashboard.
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
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $deliveriesResult = $this->dashboardService->getDeliveriesAndUpdateStatus($currentDate, null, null, $accessToken);

        // Ambil pengaturan default_courier dan default_shipping_cost
        $defaultCourierResponse = $this->settingsService->getSettingByKey('default_courier', $accessToken);
        $defaultCourier = $defaultCourierResponse['data'] ?? null;

        $defaultShippingCostResponse = $this->settingsService->getSettingByKey('default_shipping_cost', $accessToken);
        $defaultShippingCost = $defaultShippingCostResponse['data'] ?? '5000'; // Fallback ke 5000 jika tidak ada

        return $this->twig->render('dashboard.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriersResult['data'] ?? [],
            'deliveries' => $deliveriesResult['data'] ?? [],
            'total_deliveries' => $deliveriesResult['total'] ?? 0,
            // 'current_date' => $currentDate,
            'error' => $couriersResult['error'] ?? $deliveriesResult['error'] ?? null,
            'user_id' => $user['id'] ?? 'default-seed',
            'active_couriers' => $couriersResult['data'] ?? [],
            'default_courier' => $defaultCourier,
            'default_shipping_cost' => $defaultShippingCost,
        ]);
    }

    /**
     * Mengambil data pengantaran melalui API.
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
            'current_date' => $date,
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
            return new JsonResponse(['error' => 'Delivery IDs and status are required'], 400);
        }

        $result = $this->dashboardService->getDeliveriesAndUpdateStatus($date, $deliveryIds, $status, $accessToken);

        return new JsonResponse([
            'deliveries' => $result['data'] ?? [],
            'total_deliveries' => $result['total'] ?? 0,
            'current_date' => $date,
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
            'current_date' => $date,
            'error' => $deliveryDetails['error'] ?? null,
        ], $deliveryDetails['error'] ? 500 : 200);
    }
}