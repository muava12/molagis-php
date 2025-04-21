<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Molagis\Shared\SupabaseService;
use Molagis\Features\Auth\AuthController;
use Twig\Environment;
use IntlDateFormatter;

class DashboardController
{
    private SupabaseService $supabase;
    private AuthController $authController;
    private Environment $twig;

    public function __construct(SupabaseService $supabase, AuthController $authController, Environment $twig)
    {
        $this->supabase = $supabase;
        $this->authController = $authController;
        $this->twig = $twig;
    }

    public function showDashboard(): void
    {
        if (!isset($_SESSION['user_token'])) {
            header('Location: /login');
            exit;
        }

        $couriersResult = $this->supabase->getActiveCouriers();
        $deliveriesResult = $this->supabase->getTodayDeliveries();
        $user = $this->authController->getUserData();

        // Format tanggal dalam bahasa Indonesia dengan WITA
        $date = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
        $formatter = new IntlDateFormatter(
            'id_ID',
            IntlDateFormatter::FULL,
            IntlDateFormatter::NONE,
            'Asia/Makassar',
            IntlDateFormatter::GREGORIAN,
            "EEEE, dd MMMM yyyy"
        );
        $todayDate = $formatter->format($date);

        echo $this->twig->render('dashboard.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriersResult['data'],
            'deliveries' => $deliveriesResult['data'],
            'total_deliveries' => $deliveriesResult['total'],
            'today_date' => $todayDate,
            'error' => $couriersResult['error'] ?: $deliveriesResult['error'],
            'user_id' => $user ? $user['id'] : 'default-seed',
        ]);
    }
}