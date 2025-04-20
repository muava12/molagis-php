<?php
declare(strict_types=1); // Type ketat

$basePath = dirname(__DIR__);
require "{$basePath}/vendor/autoload.php";

use Molagis\Shared\SupabaseService;
use Molagis\Features\Auth\AuthController;
use Molagis\Features\Dashboard\DashboardController;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Dotenv\Dotenv;

session_start();
$dotenv = Dotenv::createImmutable($basePath);
$dotenv->load();

$loader = new FilesystemLoader([
    "{$basePath}/src/Shared/templates/layouts",
    "{$basePath}/src/Shared/templates/partials",
    "{$basePath}/src/Features/Auth/templates",
    "{$basePath}/src/Features/Dashboard/templates",
]);
$twig = new Environment($loader, [
    'debug' => true,
    'cache' => false, // Nonaktifkan cache saat development
]);
$twig->addExtension(new \Twig\Extension\DebugExtension());

$supabase = new SupabaseService(
    $_ENV['SUPABASE_URL'],
    $_ENV['SUPABASE_APIKEY']
);
$authController = new AuthController($supabase, $twig);

$action = $_GET['action'] ?? 'login';

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $authController->showLogin();
} elseif ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $authController->handleLogin($_POST);
} elseif ($action === 'logout') {
    $authController->logout();
} elseif ($action === 'dashboard') {
    $dashboardController = new DashboardController($supabase, $authController, $twig);
    $dashboardController->showDashboard();
}
?>