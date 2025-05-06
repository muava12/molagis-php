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
use Molagis\Features\Customers\CustomersController;
use Molagis\Features\Customers\CustomersService;
use Molagis\Features\Order\OrderController;
use Molagis\Features\Order\OrderService;
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
    "{$basePath}/src/Features/Customers/templates",
    "{$basePath}/src/Features/Order/templates",
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
$customersService = new CustomersService($supabaseClient);
$customersController = new CustomersController($customersService, $supabaseService, $twig);
$orderService = new OrderService($supabaseClient);
$orderController = new OrderController($orderService, $supabaseService, $twig);

// Create PSR-7 request with explicit body parsing
$request = ServerRequestFactory::fromGlobals();
if (in_array($request->getMethod(), ['POST', 'PUT', 'PATCH'], true)) {
    $contentType = $request->getHeaderLine('Content-Type');
    if (str_contains($contentType, 'application/json')) {
        $rawBody = file_get_contents('php://input');
        $parsedBody = json_decode($rawBody, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $request = $request->withParsedBody($parsedBody);
        } else {
            error_log('Failed to parse JSON body: ' . json_last_error_msg());
        }
    }
}

// Define routes with middleware mapping
$routes = [
    // Public routes
    ['GET', '/', [$authController, 'showLogin'], []],
    ['GET', '/login', [$authController, 'showLogin'], []],
    ['POST', '/login', [$authController, 'handleLogin'], []],
    
    // Protected routes
    ['GET', '/dashboard', [$dashboardController, 'showDashboard'], [$authMiddleware]],
    ['GET', '/api/deliveries', [$dashboardController, 'getDeliveries'], [$authMiddleware]],
    ['POST', '/api/deliveries/update-status', [$dashboardController, 'updateDeliveryStatus'], [$authMiddleware]],
    ['GET', '/api/delivery-details', [$dashboardController, 'getDeliveryDetails'], [$authMiddleware]],
    ['POST', '/api/update-delivery-status', [$dashboardController, 'updateDeliveryStatus'], [$authMiddleware]],
    ['GET', '/logout', [$authController, 'logout'], [$authMiddleware]],
    ['GET', '/customers', [$customersController, 'showCustomers'], [$authMiddleware]],
    ['GET', '/api/customers/all', [$customersController, 'getCustomers'], [$authMiddleware]],
    ['GET', '/api/customers', [$orderController, 'getCustomers'], [$authMiddleware]],
    ['POST', '/api/customers/add', [$customersController, 'addCustomer'], [$authMiddleware]],
    ['POST', '/api/customers/update', [$customersController, 'updateCustomer'], [$authMiddleware]],
    ['POST', '/api/customers/delete', [$customersController, 'deleteCustomer'], [$authMiddleware]],
    ['GET', '/input-order', [$orderController, 'showOrder'], [$authMiddleware]],
    ['POST', '/api/order', [$orderController, 'handleOrder'], [$authMiddleware]], 
    ['GET', '/api/packages', [$orderController, 'getPackages'], [$authMiddleware]], 
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
                    'title' => 'Halaman Tidak Ditemukan',
                    'active_couriers' => []
                ])
            );
            return $response->withStatus(404);
            
        case Dispatcher::METHOD_NOT_ALLOWED:
            $response = new Response();
            $response->getBody()->write(
                $twig->render('404.html.twig', [
                    'title' => 'Metode Tidak Diizinkan',
                    'active_couriers' => []
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
                    'getDeliveryDetails' => [$request],
                    'updateDeliveryStatus' => [$request],
                    'showCustomers' => [$request],
                    'getCustomers' => [$request],
                    'addCustomer' => [$request],
                    'updateCustomer' => [$request],
                    'deleteCustomer' => [$request],
                    'handleOrder' => [$request],
                    'getPackages' => [$request],
                    'showOrder' => [$request],
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
                $response->getBody()->write($result);
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
            'title' => 'Halaman Tidak Ditemukan',
            'active_couriers' => []
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