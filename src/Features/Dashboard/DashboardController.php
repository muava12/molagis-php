<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Molagis\Features\Auth\AuthController;
use Twig\Environment;
use IntlDateFormatter;

class DashboardController
{
    private DashboardService $dashboardService;
    private AuthController $authController;
    private Environment $twig;

    public function __construct(DashboardService $dashboardService, AuthController $authController, Environment $twig)
    {
        $this->dashboardService = $dashboardService;
        $this->authController = $authController;
        $this->twig = $twig;
    }

    public function showDashboard(): void
    {
        if (!isset($_SESSION['user_token'])) {
            header('Location: /login');
            exit;
        }

        $couriersResult = $this->dashboardService->getActiveCouriers();
        $date = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
        $currentDate = $date->format('Y-m-d');
        $deliveriesResult = $this->dashboardService->getDeliveriesByDate($currentDate);
        $user = $this->authController->getUserData();

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

        echo $this->twig->render('dashboard.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriersResult['data'],
            'deliveries' => $deliveriesResult['data'],
            'total_deliveries' => $deliveriesResult['total'],
            'current_date' => $currentDate,
            'today_date' => $todayDate,
            'error' => $couriersResult['error'] ?: $deliveriesResult['error'],
            'user_id' => $user ? $user['id'] : 'default-seed',
        ]);
    }

    public function getDeliveries(): void
    {
        if (!isset($_SESSION['user_token'])) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        $date = $_GET['date'] ?? date('Y-m-d', strtotime('now'));
        $result = $this->dashboardService->getDeliveriesByDate($date);

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

        header('Content-Type: application/json');
        echo json_encode([
            'deliveries' => $result['data'],
            'total_deliveries' => $result['total'],
            'today_date' => $formattedDate,
            'current_date' => $date,
            'error' => $result['error'],
        ]);
    }
}