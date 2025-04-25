<?php
declare(strict_types=1);

$basePath = dirname(__DIR__);
require "{$basePath}/vendor/autoload.php";

use Molagis\Shared\SupabaseClient;
use Molagis\Shared\SupabaseService;
use Molagis\Features\Auth\AuthController;
use Molagis\Features\Auth\AuthServices;
use Molagis\Features\Dashboard\DashboardController;
use Molagis\Features\Dashboard\DashboardService;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Dotenv\Dotenv;
use FastRoute\Dispatcher;
use FastRoute\RouteCollector;

// Start session
session_start();

// Load environment variables
$dotenv = Dotenv::createImmutable($basePath);
$dotenv->safeLoad();

// Initialize Twig
$loader = new FilesystemLoader([
    "{$basePath}/src/Shared/templates",
    "{$basePath}/src/Shared/templates/layouts",
    "{$basePath}/src/Shared/templates/partials",
    "{$basePath}/src/Features/Auth/templates",
    "{$basePath}/src/Features/Dashboard/templates",
]);
$twig = new Environment($loader, [
    'debug' => true,
    'cache' => false,
]);
$twig->addExtension(new \Twig\Extension\DebugExtension());

// Initialize services
$supabaseClient = new SupabaseClient($_ENV['SUPABASE_URL'], $_ENV['SUPABASE_APIKEY']);
$supabaseService = new SupabaseService($supabaseClient);
$authServices = new AuthServices($supabaseService);
$authController = new AuthController($supabaseService, $twig);
$dashboardService = new DashboardService($supabaseClient);
$dashboardController = new DashboardController($dashboardService, $authController, $twig);

// Define routes
$dispatcher = FastRoute\simpleDispatcher(function (RouteCollector $r) use ($authController, $dashboardController) {
    $r->addRoute('GET', '/', [$authController, 'showLogin']);
    $r->addRoute('GET', '/login', [$authController, 'showLogin']);
    $r->addRoute('POST', '/login', [$authController, 'handleLogin']);
    $r->addRoute('GET', '/logout', [$authController, 'logout']);
    $r->addRoute('GET', '/dashboard', [$dashboardController, 'showDashboard']);
    $r->addRoute('GET', '/api/deliveries', [$dashboardController, 'getDeliveries']);
});

// Handle request
$httpMethod = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = rawurldecode(rtrim($uri, '/') ?: '/');

// Serve static files
$staticExtensions = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf'];
$extension = pathinfo($uri, PATHINFO_EXTENSION);
if (in_array($extension, $staticExtensions, true)) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath) && is_file($filePath)) {
        $mimeTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'svg' => 'image/svg+xml',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
        ];
        header('Content-Type: ' . ($mimeTypes[$extension] ?? 'application/octet-stream'));
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        readfile($filePath);
        exit;
    }
}

// Dispatch route
$routeInfo = $dispatcher->dispatch($httpMethod, $uri);

switch ($routeInfo[0]) {
    case Dispatcher::NOT_FOUND:
        http_response_code(404);
        echo $twig->render('404.html.twig', ['title' => 'Halaman Tidak Ditemukan']);
        break;
    case Dispatcher::METHOD_NOT_ALLOWED:
        http_response_code(405);
        echo $twig->render('405.html.twig', ['title' => 'Metode Tidak Diizinkan']);
        break;
    case Dispatcher::FOUND:
        $handler = $routeInfo[1];
        $vars = $routeInfo[2];
        if (is_array($handler)) {
            [$controller, $method] = $handler;
            $params = match($method) {
                'handleLogin' => [$_POST],
                'showDelivery' => [(int)$vars['id']],
                default => []
            };
            $controller->$method(...$params);
        }
        break;
}