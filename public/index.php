<?php
declare(strict_types=1);

$basePath = dirname(__DIR__);
require "{$basePath}/vendor/autoload.php";

use Molagis\Shared\SupabaseService;
use Molagis\Features\Auth\AuthController;
use Molagis\Features\Dashboard\DashboardController;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Dotenv\Dotenv;
use FastRoute\Dispatcher;
use FastRoute\RouteCollector;

session_start();
$dotenv = Dotenv::createImmutable($basePath);
$dotenv->load();

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

$supabase = new SupabaseService(
    $_ENV['SUPABASE_URL'],
    $_ENV['SUPABASE_APIKEY']
);
$authController = new AuthController($supabase, $twig);
$dashboardController = new DashboardController($supabase, $authController, $twig);

// Definisikan rute dengan FastRoute
$dispatcher = FastRoute\simpleDispatcher(function (RouteCollector $r) use ($authController, $dashboardController) {
    $r->addRoute('GET', '/', [$authController, 'showLogin']);
    $r->addRoute('GET', '/login', [$authController, 'showLogin']);
    $r->addRoute('POST', '/login', [$authController, 'handleLogin']);
    $r->addRoute('GET', '/logout', [$authController, 'logout']);
    $r->addRoute('GET', '/dashboard', [$dashboardController, 'showDashboard']);
    $r->addRoute('GET', '/api/deliveries', [$dashboardController, 'getDeliveries']);
    // $r->addRoute('GET', '/delivery/{id:\d+}', [$dashboardController, 'showDelivery']);
});

// Ambil method dan path dari request
$httpMethod = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');
$uri = $uri === '' ? '/' : $uri;
$uri = rawurldecode($uri);


// Tangani file statis dengan header no-cache
$staticExtensions = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'ico'];
$extension = pathinfo($uri, PATHINFO_EXTENSION);
if (in_array($extension, $staticExtensions)) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath)) {
        $mimeTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
        ];
        header('Content-Type: ' . ($mimeTypes[$extension] ?? 'application/octet-stream'));
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        readfile($filePath);
        exit;
    }
}

// Dispatch rute
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
            if ($method === 'handleLogin') {
                $controller->$method($_POST);
            } elseif ($method === 'showDelivery') {
                $controller->$method((int)$vars['id']);
            } else {
                $controller->$method();
            }
        }
        break;
}