<?php
declare(strict_types=1);

namespace Molagis\Features\Dashboard;

use Molagis\Shared\SupabaseService;
use Molagis\Features\Auth\AuthController;
use Twig\Environment;

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

        echo $this->twig->render('dashboard.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriersResult['data'],
            'deliveries' => $deliveriesResult['data'],
            'total_deliveries' => $deliveriesResult['total'],
            'error' => $couriersResult['error'] ?: $deliveriesResult['error'],
            'user_id' => $user ? $user['id'] : 'default-seed',
        ]);
    }
}