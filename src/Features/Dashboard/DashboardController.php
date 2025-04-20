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
            header('Location: /index.php?action=login');
            exit;
        }

        $couriers = $this->supabase->getActiveCouriers();
        $user = $this->authController->getUserData();

        echo $this->twig->render('index.html.twig', [
            'title' => 'Dashboard Molagis',
            'couriers' => $couriers,
            'user_id' => $user ? $user['id'] : 'default-seed',
        ]);
    }
}