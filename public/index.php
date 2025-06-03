<?php
declare(strict_types=1);

$basePath = dirname(__DIR__);
require "{$basePath}/vendor/autoload.php";

use Molagis\Shared\ConfigSession;
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
use Molagis\Features\Settings\SettingsController;
use Molagis\Features\Settings\SettingsService;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Dotenv\Dotenv;
use FastRoute\Dispatcher;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Laminas\Diactoros\ServerRequestFactory;
use Laminas\Diactoros\Response;
use DI\ContainerBuilder;

// Start session
// session_start();

// Load environment variables
$dotenv = Dotenv::createImmutable($basePath);
$dotenv->safeLoad();

ConfigSession::init();

// Initialize Dependency Injection Container
$containerBuilder = new ContainerBuilder();
$containerBuilder->addDefinitions([
    SupabaseClient::class => fn() => new SupabaseClient($_ENV['SUPABASE_URL'], $_ENV['SUPABASE_APIKEY']),
    SupabaseService::class => fn($c) => new SupabaseService($c->get(SupabaseClient::class)),
    AuthMiddleware::class => fn($c) => new AuthMiddleware($c->get(SupabaseService::class)),
    SettingsService::class => fn($c) => new SettingsService($c->get(SupabaseClient::class)),
    SettingsController::class => fn($c) => new SettingsController(
        $c->get(SettingsService::class),
        $c->get(SupabaseService::class),
        $c->get(Environment::class)
    ),
    DashboardService::class => fn($c) => new DashboardService($c->get(SupabaseClient::class)),
    DashboardController::class => fn($c) => new DashboardController(
        $c->get(DashboardService::class),
        $c->get(SupabaseService::class),
        $c->get(SettingsService::class),
        $c->get(Environment::class)
    ),
    CustomersService::class => fn($c) => new CustomersService($c->get(SupabaseClient::class)),
    CustomersController::class => fn($c) => new CustomersController(
        $c->get(CustomersService::class),
        $c->get(SupabaseService::class),
        $c->get(SettingsService::class), // Added this line
        $c->get(Environment::class)
    ),
    OrderService::class => fn($c) => new OrderService($c->get(SupabaseClient::class)), // For single order input
    OrderController::class => fn($c) => new OrderController( // For single order input
        $c->get(OrderService::class),
        $c->get(SupabaseService::class),
        $c->get(SettingsService::class),
        $c->get(Environment::class)
    ),
    // Definitions for the new Orders feature (plural)
    \Molagis\Features\Orders\OrdersService::class => fn($c) => new \Molagis\Features\Orders\OrdersService($c->get(\Molagis\Shared\SupabaseClient::class)),
    \Molagis\Features\Orders\OrdersController::class => fn($c) => new \Molagis\Features\Orders\OrdersController(
        $c->get(\Molagis\Features\Orders\OrdersService::class),
        $c->get(\Molagis\Features\Settings\SettingsService::class),
        $c->get(\Molagis\Shared\SupabaseService::class),
        $c->get(\Twig\Environment::class)
    ),
    Environment::class => fn() => new Environment(
        new FilesystemLoader([
            "{$basePath}/src/Shared/templates",
            "{$basePath}/src/Shared/templates/layouts",
            "{$basePath}/src/Shared/templates/partials",
            "{$basePath}/src/Features/Auth/templates",
            "{$basePath}/src/Features/Dashboard/templates",
            "{$basePath}/src/Features/Customers/templates",
            "{$basePath}/src/Features/Order/templates", // Stays for input-order
            "{$basePath}/src/Features/Orders/templates", // Added for order list
            "{$basePath}/src/Features/Settings/templates",
        ]),
        [
            'debug' => $_ENV['APP_ENV'] === 'development',
            'cache' => $_ENV['APP_ENV'] === 'production' ? "{$basePath}/cache/twig" : false,
        ]
    ),
]);
$container = $containerBuilder->build();

// Tambahkan Twig Debug Extension
$twig = $container->get(Environment::class);
$twig->addExtension(new \Twig\Extension\DebugExtension());

// Create PSR-7 request with body parsing
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

// Define routes in a separate configuration
$routes = [
    // Public routes
    ['GET', '/', [AuthController::class, 'showLogin'], []],
    ['GET', '/login', [AuthController::class, 'showLogin'], []],
    ['POST', '/login', [AuthController::class, 'handleLogin'], []],
    // Protected routes
    ['GET', '/dashboard', [DashboardController::class, 'showDashboard'], [AuthMiddleware::class]],
    ['GET', '/api/deliveries', [DashboardController::class, 'getDeliveries'], [AuthMiddleware::class]],
    ['POST', '/api/deliveries/update-status', [DashboardController::class, 'updateDeliveryStatus'], [AuthMiddleware::class]],
    ['GET', '/api/delivery-details', [DashboardController::class, 'getDeliveryDetails'], [AuthMiddleware::class]],
    ['POST', '/api/update-delivery-status', [DashboardController::class, 'updateDeliveryStatus'], [AuthMiddleware::class]],
    ['GET', '/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]],
    ['GET', '/customers', [CustomersController::class, 'showCustomers'], [AuthMiddleware::class]],
    ['GET', '/api/customers/all', [CustomersController::class, 'getCustomers'], [AuthMiddleware::class]],
    ['GET', '/api/customers', [OrderController::class, 'getCustomers'], [AuthMiddleware::class]],
    ['POST', '/api/customers/add', [CustomersController::class, 'addCustomer'], [AuthMiddleware::class]],
    ['POST', '/api/customers/update', [CustomersController::class, 'updateCustomer'], [AuthMiddleware::class]],
    ['POST', '/api/customers/delete', [CustomersController::class, 'deleteCustomer'], [AuthMiddleware::class]],
    ['GET', '/input-order', [OrderController::class, 'showOrder'], [AuthMiddleware::class]], // Singular for input form
    ['GET', '/orders', [\Molagis\Features\Orders\OrdersController::class, 'showOrdersPage'], [AuthMiddleware::class]], // Plural for list page
    ['POST', '/api/order', [OrderController::class, 'handleOrder'], [AuthMiddleware::class]], // Singular for submitting new order
    ['GET', '/api/orders/search/id', [\Molagis\Features\Orders\OrdersController::class, 'searchOrderByIdApi'], [\Molagis\Shared\Middleware\AuthMiddleware::class]], // API for Orders (plural)
    ['GET', '/api/packages', [OrderController::class, 'getPackages'], [AuthMiddleware::class]],
    ['GET', '/settings', [SettingsController::class, 'showSettings'], [AuthMiddleware::class]],
    ['POST', '/api/settings/update', [SettingsController::class, 'updateSettings'], [AuthMiddleware::class]],
];

// Create FastRoute dispatcher
$dispatcher = FastRoute\simpleDispatcher(function(FastRoute\RouteCollector $r) use ($routes) {
    foreach ($routes as $route) {
        $r->addRoute($route[0], $route[1], $route);
    }
});

// Dispatch route and handle response
$response = handleDispatch($dispatcher, $request, $container);
sendResponse($response);

// Handle dispatch logic
function handleDispatch(Dispatcher $dispatcher, ServerRequestInterface $request, $container): ResponseInterface {
    $routeInfo = $dispatcher->dispatch($request->getMethod(), $request->getUri()->getPath());

    switch ($routeInfo[0]) {
        case Dispatcher::NOT_FOUND:
            $response = new Response();
            $twig = $container->get(Environment::class);
            $response->getBody()->write(
                $twig->render('404.html.twig', [
                    'title' => 'Halaman Tidak Ditemukan',
                    'active_couriers' => []
                ])
            );
            return $response->withStatus(404);

        case Dispatcher::METHOD_NOT_ALLOWED:
            $response = new Response();
            $twig = $container->get(Environment::class);
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
            [$controllerClass, $method] = $routeData[2];
            $middlewareClasses = $routeData[3] ?? [];

            // Resolve controller from container
            $controller = $container->get($controllerClass);

            // Create the final handler
            $handler = function(ServerRequestInterface $request) use ($controller, $method, $vars, $container) {
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
                    'showOrdersPage' => [$request], 
                    'searchOrderByIdApi' => [$request], // Added case
                    'showSettings' => [$request],
                    'updateSettings' => [$request],
                    default => []
                };

                $result = $controller->$method(...$params);

                if ($result instanceof ResponseInterface) {
                    return $result;
                }

                $response = new Response();
                $response->getBody()->write($result);
                return $response;
            };

            // Build middleware stack
            $middlewareStack = array_reduce(
                array_reverse($middlewareClasses),
                function(callable $next, $middlewareClass) use ($container) {
                    $middleware = $container->get($middlewareClass);
                    return function(ServerRequestInterface $request) use ($next, $middleware) {
                        return $middleware($request, $next);
                    };
                },
                $handler
            );

            return $middlewareStack($request);
    }

    $response = new Response();
    $twig = $container->get(Environment::class);
    $response->getBody()->write(
        $twig->render('404.html.twig', [
            'title' => 'Halaman Tidak Ditemukan',
            'active_couriers' => []
        ])
    );
    return $response->withStatus(404);
}

// Send response
function sendResponse(ResponseInterface $response): void {
    foreach ($response->getHeaders() as $name => $values) {
        foreach ($values as $value) {
            header(sprintf('%s: %s', $name, $value), false);
        }
    }
    http_response_code($response->getStatusCode());
    echo $response->getBody();
}