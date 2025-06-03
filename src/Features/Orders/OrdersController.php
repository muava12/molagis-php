<?php
declare(strict_types=1);

namespace Molagis\Features\Orders;

use Molagis\Features\Settings\SettingsService;
use Molagis\Shared\SupabaseService;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;
use Laminas\Diactoros\Response\JsonResponse; // Added
use Twig\Environment;
// Note: InvalidArgumentException and RuntimeException are not used by showOrdersPage directly.

class OrdersController
{
    public function __construct(
        private OrdersService $ordersService, // Changed from OrderService
        private SettingsService $settingsService,
        private SupabaseService $supabaseService,
        private Environment $twig
    ) {}

    /**
     * Menampilkan halaman daftar pesanan (riwayat pengiriman pelanggan).
     * @param ServerRequestInterface $request Request object.
     * @return Response Rendered HTML response.
     */
    public function showOrdersPage(ServerRequestInterface $request): Response
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new Response\RedirectResponse('/login');
        }

        $user = $request->getAttribute('user');
        $userId = $user['id'] ?? 'default-seed';

        $businessNameResponse = $this->settingsService->getSettingByKey('business_name', $accessToken);
        $businessName = $businessNameResponse['data'] ?? 'Molagis';

        // Fetch all customers for the dropdown
        // Uses getCustomers from the new OrdersService
        $allCustomers = $this->ordersService->getCustomers($accessToken);

        // Get selected customer_id from query parameters
        $queryParams = $request->getQueryParams();
        $view = $queryParams['view'] ?? 'by_name'; // Default to 'by_name'
        $selectedCustomerId = isset($queryParams['customer_id']) ? (int)$queryParams['customer_id'] : null;

        $selectedCustomerName = ''; // Default to empty
        if ($selectedCustomerId && !empty($allCustomers)) {
            foreach ($allCustomers as $customer) {
                // Ensure type comparison is robust, customer ID from DB might be int or string
                if ((string)$customer['id'] == (string)$selectedCustomerId) {
                    $selectedCustomerName = $customer['nama'];
                    break;
                }
            }
        }

        $customerDeliveries = [];
        $deliveriesError = null;
        $orderByIdResult = [];
        $orderByIdError = null;
        $orderIdQueryValue = $queryParams['order_id_query'] ?? null;

        // Initialize pagination variables with defaults
        $page = 1;
        // $limit = 100; // Default items per page, also used by by_name view // Replaced by new logic below
        $totalPages = 1; // Default total pages

        // Handle "Items Per Page" limit
        $allowedLimits = [10, 50, 100, 1000];
        $defaultLimit = 100; // Current default
        $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : $defaultLimit;
        if (!in_array($limit, $allowedLimits)) {
            $limit = $defaultLimit;
        }

        if ($view === 'by_name' || $view === '') { // Default view or explicitly by_name
            if ($selectedCustomerId) {
                $page = isset($queryParams['page']) ? (int)$queryParams['page'] : 1;
                $offset = ($page - 1) * $limit;

                $deliveriesResponse = $this->ordersService->getDeliveriesByCustomerId($selectedCustomerId, $accessToken, $limit, $offset);
                $customerDeliveries = $deliveriesResponse['data'] ?? [];
                $deliveriesError = $deliveriesResponse['error'] ?? null;

                $totalCount = 0;
                $countResponse = $this->ordersService->getDeliveriesCountByCustomerId($selectedCustomerId, $accessToken);

                if (isset($countResponse['count']) && $countResponse['error'] === null) {
                    $totalCount = $countResponse['count'];
                } else {
                    // Optionally log $countResponse['error'] if it's not null
                    if (isset($countResponse['error'])) {
                        error_log("Error fetching deliveries count for customer $selectedCustomerId: " . $countResponse['error']);
                        // You might want to add this error to $deliveriesError or a new error variable for the template
                    }
                    $totalCount = 0; // Ensure totalCount is 0 if there was an error or count is not set
                }

                if ($limit > 0 && $totalCount > 0) {
                    $totalPages = (int)ceil($totalCount / $limit);
                } else {
                    $totalPages = 1; // Default to 1 page if no items or limit is somehow zero
                }
            }
        } elseif ($view === 'by_order_id') {
            if ($orderIdQueryValue && is_numeric($orderIdQueryValue)) {
                $orderId = (int)$orderIdQueryValue;
                $orderResponse = $this->ordersService->getOrderByExactId($orderId, $accessToken);
                if (isset($orderResponse['data']) && $orderResponse['data'] !== null) {
                    $orderByIdResult = [$orderResponse['data']]; // Wrap single order in array
                } else {
                    $orderByIdError = $orderResponse['error'] ?? 'Order not found or error fetching.';
                }
            } elseif ($orderIdQueryValue !== null && !is_numeric($orderIdQueryValue) && $orderIdQueryValue !== '') {
                 $orderByIdError = 'Order ID must be a number.';
            }
            // If $orderIdQueryValue is null or empty string, no search is performed, $orderByIdResult remains empty.
        }
        // Logic for 'by_date' view can be added here later with an elseif block

        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);

        $finalError = $deliveriesError ?? $orderByIdError ?? $couriersResult['error'] ?? null;

        $twigData = [
            'title' => 'Manajemen Pesanan', // Generic title, can be adjusted by view in Twig if needed
            'all_customers' => $allCustomers,
            'selected_customer_id' => $selectedCustomerId,
            'selected_customer_name' => $selectedCustomerName,
            'deliveries' => $customerDeliveries, // For 'by_name' view
            'orders_by_id_result' => $orderByIdResult, // For 'by_order_id' view
            'order_id_query_value' => $orderIdQueryValue, // For pre-filling search box
            'business_name' => $businessName,
            'couriers' => $couriersResult['data'] ?? [],
            'user_id' => $userId,
            'view' => $view,
            'error' => $finalError,
            'current_page' => $page,
            'items_per_page' => $limit, // This now correctly reflects the potentially user-selected limit
            'total_pages' => $totalPages,
            'current_limit' => $limit, // Pass current limit for dropdown UI
            'allowed_limits' => $allowedLimits // Pass allowed limits for dropdown UI
        ];

        // Detect AJAX request
        $isAjaxRequest = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest');

        $response = new Response();

        if ($isAjaxRequest && ($view === 'by_name' || $view === '') && $selectedCustomerId) {
            // If AJAX request for 'by_name' view with a customer, render only the partial
            $response->getBody()->write(
                $this->twig->render('_orders_table_partial.html.twig', $twigData)
            );
        } else {
            // Otherwise, render the full page
            $response->getBody()->write(
                $this->twig->render('order-list.html.twig', $twigData)
            );
        }

        return $response;
    }

    public function searchOrderByIdApi(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $queryParams = $request->getQueryParams();
        $orderIdQuery = $queryParams['order_id_query'] ?? null;

        if ($orderIdQuery === null || $orderIdQuery === '') {
            return new JsonResponse(['success' => false, 'message' => 'Order ID query is required.'], 400);
        }

        if (!is_numeric($orderIdQuery)) {
            return new JsonResponse(['success' => false, 'message' => 'Order ID must be numeric.'], 400);
        }

        $orderId = (int)$orderIdQuery;
        $serviceResponse = $this->ordersService->getOrderByExactId($orderId, $accessToken);

        if (isset($serviceResponse['data']) && $serviceResponse['data'] !== null) {
            return new JsonResponse(['success' => true, 'order' => $serviceResponse['data']]);
        } elseif (isset($serviceResponse['error']) && $serviceResponse['error'] === 'Order not found.') {
            return new JsonResponse(['success' => false, 'message' => 'Order not found.'], 404); // Using 404 for not found
        } elseif (isset($serviceResponse['error'])) {
            return new JsonResponse(['success' => false, 'message' => $serviceResponse['error']], 500);
        }

        // Should not be reached if service always returns 'data' or 'error'
        return new JsonResponse(['success' => false, 'message' => 'An unexpected error occurred.'], 500);
    }

    public function getDeliveriesByDateApi(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $queryParams = $request->getQueryParams();
        $date = $queryParams['date'] ?? null;

        if (empty($date)) {
            return new JsonResponse(['success' => false, 'message' => 'Date parameter is required.'], 400);
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return new JsonResponse(['success' => false, 'message' => 'Date parameter must be in YYYY-MM-DD format.'], 400);
        }

        $serviceResponse = $this->ordersService->getDeliveriesByDate($date, $accessToken);

        if (isset($serviceResponse['error'])) {
            return new JsonResponse(['success' => false, 'message' => $serviceResponse['error']], 500);
        }

        if (empty($serviceResponse['data'])) {
            return new JsonResponse(['success' => true, 'deliveries' => [], 'message' => 'No deliveries found for this date.']);
        }

        return new JsonResponse(['success' => true, 'deliveries' => $serviceResponse['data']]);
    }

    public function deleteDeliveryDateApi(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $deliveryDateId = isset($args['id']) ? (int)$args['id'] : 0;

        if ($deliveryDateId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Delivery ID provided.'], 400);
        }

        $serviceResponse = $this->ordersService->deleteDeliveryDateById($deliveryDateId, $accessToken);

        if ($serviceResponse['success']) {
            return new JsonResponse(['success' => true, 'message' => 'Delivery date deleted successfully.']);
        } else {
            $statusCode = ($serviceResponse['error'] === 'Delivery date not found.') ? 404 : 500;
            return new JsonResponse(['success' => false, 'message' => $serviceResponse['error'] ?? 'Failed to delete delivery date.'], $statusCode);
        }
    }

    public function batchDeleteDeliveriesApi(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $data = json_decode($request->getBody()->getContents(), true);
        $deliveryDateIds = $data['ids'] ?? null;

        if (empty($deliveryDateIds) || !is_array($deliveryDateIds)) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid or missing delivery IDs.'], 400);
        }

        // Basic sanitation: ensure all IDs are integers
        $sanitizedIds = array_filter(array_map('intval', $deliveryDateIds), fn($id) => $id > 0);

        if (empty($sanitizedIds)) {
            return new JsonResponse(['success' => false, 'message' => 'No valid delivery IDs provided after sanitation.'], 400);
        }

        if (count($sanitizedIds) !== count($deliveryDateIds)) {
           error_log("[BatchDelete] Some IDs were invalid. Original: " . json_encode($deliveryDateIds) . " Sanitized: " . json_encode($sanitizedIds));
           // Decide if to proceed with only valid ones or reject. For now, let's proceed with valid ones but acknowledge.
           // To be stricter, you could return an error here if count($sanitizedIds) !== count($deliveryDateIds)
        }

        $serviceResponse = $this->ordersService->batchDeleteDeliveryDatesByIds($sanitizedIds, $accessToken);

        if ($serviceResponse['success']) {
            return new JsonResponse([
                'success' => true,
                'message' => $serviceResponse['message'] ?? 'Selected deliveries deleted successfully.',
                'deleted_ids' => $serviceResponse['deleted_ids'] ?? $sanitizedIds // Return sanitized IDs if service doesn't specify
            ]);
        } else {
            $statusCode = $serviceResponse['status_code'] ?? 500; // Default to 500 if not specified
            return new JsonResponse([
                'success' => false,
                'message' => $serviceResponse['error'] ?? 'Failed to delete selected deliveries.'
            ], $statusCode);
        }
    }
}
