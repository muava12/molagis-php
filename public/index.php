<?php
declare(strict_types=1);

$basePath = dirname(__DIR__);
require "{$basePath}/vendor/autoload.php";

use Molagis\Shared\SupabaseClient;
use Molagis\Shared\SupabaseService;
use Molagis\Shared\Middleware\AuthMiddleware;
use Molagis\Features\Auth\AuthController;
use Molagis\Features\Dashboard\DashboardController;
use Molagis\Features\Dashboard\DashboardService;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Dotenv\Dotenv;
use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Laminas\Diactoros\ServerRequestFactory;
use Laminas\Diactoros\Response;

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
    'debug' => $_ENV['APP_ENV'] === 'development',
    'cache' => $_ENV['APP_ENV'] === 'production' ? "{$basePath}/cache/twig" : false,
]);
$twig->addExtension(new \Twig\Extension\DebugExtension());

// Initialize services
$supabaseClient = new SupabaseClient($_ENV['SUPABASE_URL'], $_ENV['SUPABASE_APIKEY']);
$supabaseService = new SupabaseService($supabaseClient);
$authMiddleware = new AuthMiddleware($supabaseService);
$authController = new AuthController($supabaseService, $twig);
$dashboardService = new DashboardService($supabaseClient);
$dashboardController = new DashboardController($dashboardService, $supabaseService, $twig);

// Create PSR-7 request
$request = ServerRequestFactory::fromGlobals();

// Define routes with middleware mapping
$routes = [
    // Public routes
    ['GET', '/', [$authController, 'showLogin'], []],
    ['GET', '/login', [$authController, 'showLogin'], []],
    ['POST', '/login', [$authController, 'handleLogin'], []],
    
    // Protected routes
    ['GET', '/dashboard', [$dashboardController, 'showDashboard'], []],
    ['GET', '/api/deliveries', [$dashboardController, 'getDeliveries'], [$authMiddleware]],
    ['GET', '/logout', [$authController, 'logout'], [$authMiddleware]],
    // ['GET', '/customers', [$customersController, 'showCustomers'], [$authMiddleware]],
    // ['GET', '/couriers', [$dashboardController, 'showCouriers'], [$authMiddleware]],
    // ['GET', '/deliveries', [$dashboardController, 'showDeliveries'], [$authMiddleware]],
    // ['GET', '/orders', [$dashboardController, 'showOrders'], [$authMiddleware]],
    // ['GET', '/products', [$dashboardController, 'showProducts'], [$authMiddleware]],
    // ['GET', '/settings', [$dashboardController, 'showSettings'], [$authMiddleware]],
];

// Create FastRoute dispatcher
$dispatcher = FastRoute\simpleDispatcher(function(RouteCollector $r) use ($routes) {
    foreach ($routes as $route) {
        $r->addRoute($route[0], $route[1], $route);
    }
});

// Handle static files
$staticExtensions = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf'];
$extension = pathinfo($request->getUri()->getPath(), PATHINFO_EXTENSION);
if (in_array($extension, $staticExtensions, true)) {
    $filePath = __DIR__ . $request->getUri()->getPath();
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
        
        $response = new Response();
        $response->getBody()->write(file_get_contents($filePath));
        return $response
            ->withHeader('Content-Type', $mimeTypes[$extension] ?? 'application/octet-stream')
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache')
            ->withHeader('Expires', '0');
    }
}

// Dispatch route and handle response
$response = handleDispatch($dispatcher, $request, $twig, $supabaseService);
sendResponse($response);

// Functions to handle the dispatch and response
function handleDispatch(Dispatcher $dispatcher, ServerRequestInterface $request, Environment $twig, SupabaseService $supabaseService): ResponseInterface {
    $routeInfo = $dispatcher->dispatch(
        $request->getMethod(), 
        $request->getUri()->getPath()
    );

    switch ($routeInfo[0]) {
        case Dispatcher::NOT_FOUND:
            $response = new Response();
            $response->getBody()->write(
                $twig->render('404.html.twig', [
                    'title' => 'Halaman Gak Ketemu, Bro!',
                    'message' => 'Hidup ini bagaikan puisi, penuh dengan bait-bait indah yang menghanyutkan.'
                ])
            );
            return $response->withStatus(404);
            
        case Dispatcher::METHOD_NOT_ALLOWED:
            $response = new Response();
            $response->getBody()->write(
                $twig->render('404.html.twig', [
                    'title' => 'Metode Tidak Diizinkan',
                    'message'=> 'Metode yang Anda gunakan tidak diizinkan untuk halaman ini.'
                ])
            );
            return $response->withStatus(405);
            
        case Dispatcher::FOUND:
            $routeData = $routeInfo[1];
            $vars = $routeInfo[2];
            [$controller, $method] = $routeData[2];
            $middlewares = $routeData[3] ?? [];

            // Create the final handler
            $handler = function(ServerRequestInterface $request) use ($controller, $method, $vars, $supabaseService) {
                $params = match($method) {
                    'handleLogin' => [$request->getParsedBody()],
                    'showDashboard' => [$request],
                    'getDeliveries' => [$request],
                    // 'showCustomers' => [$request],
                    // 'showCouriers' => [$request],
                    // 'showDeliveries' => [$request],
                    // 'showOrders' => [$request],
                    // 'showProducts' => [$request],
                    // 'showSettings' => [$request],
                    default => []
                };
                
                $result = $controller->$method(...$params);
                
                if ($result instanceof ResponseInterface) {
                    return $result;
                }

                // Tambahkan data kurir aktif untuk semua halaman (kecuali API)
                $accessToken = $_SESSION['user_token'] ?? null;
                $couriersResult = $supabaseService->getActiveCouriers($accessToken);
                
                $response = new Response();
                $response->getBody()->write(
                    $result
                );
                return $response;
            };

            // Build middleware stack
            $middlewareStack = array_reduce(
                array_reverse($middlewares),
                function(callable $next, callable $middleware) {
                    return function(ServerRequestInterface $request) use ($next, $middleware) {
                        return $middleware($request, $next);
                    };
                },
                $handler
            );

            return $middlewareStack($request);
    }

    $response = new Response();
    $response->getBody()->write(
        $twig->render('404.html.twig', [
            'title' => 'Halaman Tidak Ditemukan'
        ])
    );
    return $response->withStatus(404);
}

function sendResponse(ResponseInterface $response): void {
    // Send headers
    foreach ($response->getHeaders() as $name => $values) {
        foreach ($values as $value) {
            header(sprintf('%s: %s', $name, $value), false);
        }
    }

    // Send status code
    http_response_code($response->getStatusCode());

    // Send body
    echo $response->getBody();
}