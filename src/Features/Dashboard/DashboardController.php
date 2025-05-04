<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use IntlDateFormatter;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Molagis\Shared\SupabaseService;

class DashboardController
{
    public function __construct(
        private DashboardService $dashboardService,
        private SupabaseService $supabaseService,
        private Environment $twig
    ) {}

    public function showDashboard(ServerRequestInterface $request): string
    {
        $user = $request->getAttribute('user');
        $accessToken = $_SESSION['user_token'] ?? null;
        $date = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
        $currentDate = $date->format('Y-m-d');
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $deliveriesResult = $this->dashboardService->getDeliveriesByDate($currentDate, $accessToken);

        // Format tanggal dalam bahasa Indonesia dengan WITA
        $formatter = new IntlDateFormatter(
            'id_ID',
            IntlDateFormatter::FULL,
            IntlDateFormatter::NONE,
            'Asia/Makassar',
            IntlDateFormatter::GREGORIAN,
            'EEEE, dd MMMM yyyy'
        );
        $todayDate = $formatter->format($date);

        return $this->twig->render('dashboard.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriersResult['data'] ?? [],
            'deliveries' => $deliveriesResult['data'] ?? [],
            'total_deliveries' => $deliveriesResult['total'] ?? 0,
            'current_date' => $currentDate,
            'today_date' => $todayDate,
            'error' => $couriersResult['error'] ?? $deliveriesResult['error'] ?? null,
            'user_id' => $user['id'] ?? 'default-seed',
            'active_couriers' => $couriersResult['data'] ?? [],
        ]);
    }

    public function getDeliveries(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $date = $request->getQueryParams()['date'] ?? date('Y-m-d');
        $result = $this->dashboardService->getDeliveriesByDate($date, $accessToken);

        // Format tanggal untuk subtitle
        $dateObj = new \DateTime($date, new \DateTimeZone('Asia/Makassar'));
        $formatter = new IntlDateFormatter(
            'id_ID',
            IntlDateFormatter::FULL,
            IntlDateFormatter::NONE,
            'Asia/Makassar',
            IntlDateFormatter::GREGORIAN,
            'EEEE, dd MMMM yyyy'
        );
        $formattedDate = $formatter->format($dateObj);

        return new JsonResponse([
            'deliveries' => $result['data'] ?? [],
            'total_deliveries' => $result['total'] ?? 0,
            'today_date' => $formattedDate,
            'current_date' => $date,
            'error' => $result['error'] ?? null,
        ]);
    }

    public function getDeliveryDetails(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        $courierId = $queryParams['courier_id'] ?? null;
        $date = $queryParams['date'] ?? date('Y-m-d');

        if (!$courierId) {
            return new JsonResponse(['error' => 'Courier ID is required'], 400);
        }

        $deliveryDetails = $this->dashboardService->getDeliveryDetails($courierId, $date, $accessToken);
        $courierResult = $this->supabaseService->fetchById('couriers', $courierId, $accessToken);

        // Format tanggal
        $dateObj = new \DateTime($date, new \DateTimeZone('Asia/Makassar'));
        $formatter = new IntlDateFormatter(
            'id_ID',
            IntlDateFormatter::FULL,
            IntlDateFormatter::NONE,
            'Asia/Makassar',
            IntlDateFormatter::GREGORIAN,
            'EEEE, dd MMMM yyyy'
        );
        $formattedDate = $formatter->format($dateObj);

        return new JsonResponse([
            'grouped_orders' => $deliveryDetails['data'] ?? [],
            'courier_name' => $courierResult['data']['nama'] ?? 'Unknown',
            'date' => $formattedDate,
            'error' => $deliveryDetails['error'] ?? $courierResult['error'] ?? null,
        ], $deliveryDetails['error'] ? 500 : 200);
    }

    public function updateDeliveryStatus(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        $deliveryIds = $data['delivery_ids'] ?? [];
        $status = $data['status'] ?? null;

        if (empty($deliveryIds) || !$status) {
            return new JsonResponse(['error' => 'Delivery IDs and status are required'], 400);
        }

        $result = $this->dashboardService->updateDeliveryStatus($deliveryIds, $status, $accessToken);

        if ($result['error']) {
            return new JsonResponse(['error' => $result['error']], 500);
        }

        return new JsonResponse(['success' => true]);
    }
}