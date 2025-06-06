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
        $grouping = $queryParams['grouping'] ?? 'none'; // Default to 'none'
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

        // Initialize variables related to 'by_name' view data and errors
        $customerDeliveries = [];
        $groupedCustomerDeliveries = [];
        $deliveriesError = null;
        // $orderByIdResult and $orderByIdError are for a different view
        $orderByIdResult = [];
        $orderByIdError = null;
        $orderIdQueryValue = $queryParams['order_id_query'] ?? null;


        // Initialize pagination variables with defaults
        $page = 1;
        $totalPages = 1; // Default total pages

        // Handle "Items Per Page" limit
        $allowedLimits = [10, 50, 100, 1000];
        $defaultLimit = 100; // Current default
        $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : $defaultLimit;
        if (!in_array($limit, $allowedLimits)) {
            $limit = $defaultLimit;
        }

        if ($view === 'by_name' || $view === '') { // Logic for 'by_name' view
            if ($selectedCustomerId) {
                $page = isset($queryParams['page']) ? (int)$queryParams['page'] : 1;
                $offset = ($page - 1) * $limit;
                $currentViewError = null; // Specific error for this data fetching operation

                if ($grouping === 'order_id') {
                    $deliveriesResponse = $this->ordersService->getGroupedDeliveriesByCustomerId($selectedCustomerId, $accessToken, $limit, $offset);
                    $groupedCustomerDeliveries = $deliveriesResponse['data'] ?? [];
                    $currentViewError = $deliveriesResponse['error'] ?? null;
                    // This assumes OrdersService has getOrdersCountByCustomerId.
                    // If not, this will cause an error. The subtask stated not to modify OrdersService.
                    $countResponse = $this->ordersService->getOrdersCountByCustomerId($selectedCustomerId, $accessToken);
                } else { // 'none' or any other value
                    $deliveriesResponse = $this->ordersService->getDeliveriesByCustomerId($selectedCustomerId, $accessToken, $limit, $offset);
                    $customerDeliveries = $deliveriesResponse['data'] ?? [];
                    $currentViewError = $deliveriesResponse['error'] ?? null;
                    $countResponse = $this->ordersService->getDeliveriesCountByCustomerId($selectedCustomerId, $accessToken);
                }

                $totalCount = 0;
                if (isset($countResponse['count']) && $countResponse['error'] === null) {
                    $totalCount = $countResponse['count'];
                } else {
                    $countFetchError = $countResponse['error'] ?? 'Error fetching count';
                    error_log("Error fetching count for customer $selectedCustomerId, grouping '$grouping': " . $countFetchError);
                    $currentViewError = ($currentViewError ? $currentViewError . '; ' : '') . 'Count retrieval error: ' . $countFetchError;
                    $totalCount = 0;
                }

                if ($limit > 0 && $totalCount > 0) {
                    $totalPages = (int)ceil($totalCount / $limit);
                } else {
                    $totalPages = 1;
                }
                $deliveriesError = $currentViewError; // Assign to the broader $deliveriesError
            } else {
                // No customer selected for 'by_name' view, $page/$totalPages retain defaults
                // $deliveriesError remains as it was (e.g., null or from other views)
            }
        } elseif ($view === 'by_order_id') {
            // ... existing logic for by_order_id ...
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
        }
        // Logic for 'by_date' view can be added here later with an elseif block
        $deliveries_for_today = [];
        $default_date = '';
        $byDateError = null;

        if ($view === 'by_date') {
            $dateTimeWita = new \DateTime('now', new \DateTimeZone('Asia/Makassar'));
            $default_date = $dateTimeWita->format('Y-m-d');
            $deliveriesResponse = $this->ordersService->getDeliveriesByDate($default_date, $accessToken);

            if (isset($deliveriesResponse['error'])) {
                $byDateError = 'Error fetching deliveries for today: ' . $deliveriesResponse['error'];
                error_log($byDateError . (isset($deliveriesResponse['status_code']) ? ' Status: ' . $deliveriesResponse['status_code'] : ''));
                // $deliveries_for_today remains empty
            } else {
                $deliveries_for_today = $deliveriesResponse['data'] ?? [];
            }
        }

        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);

        $finalError = $deliveriesError ?? $orderByIdError ?? $byDateError ?? $couriersResult['error'] ?? null;

        $twigData = [
            'title' => 'Manajemen Pesanan',
            'all_customers' => $allCustomers,
            'deliveries_for_today' => $deliveries_for_today,
            'default_date' => $default_date,
            'selected_customer_id' => $selectedCustomerId,
            'selected_customer_name' => $selectedCustomerName,
            'deliveries' => $customerDeliveries,
            'grouped_deliveries' => $groupedCustomerDeliveries,
            'current_grouping' => $grouping,
            'orders_by_id_result' => $orderByIdResult,
            'order_id_query_value' => $orderIdQueryValue,
            'business_name' => $businessName,
            'couriers' => $couriersResult['data'] ?? [],
            'user_id' => $userId,
            'view' => $view,
            'error' => $finalError,
            'current_page' => $page,
            'items_per_page' => $limit,
            'total_pages' => $totalPages,
            'current_limit' => $limit,
            'allowed_limits' => $allowedLimits
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

    public function getDeliveryDetailsForEdit(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $deliveryId = isset($args['id']) ? (int)$args['id'] : 0;
        if ($deliveryId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Delivery ID provided.'], 400);
        }

        // Use a method in OrdersService to fetch all required data
        $serviceResponse = $this->ordersService->getDeliveryDataForEdit($deliveryId, $accessToken);

        if (!$serviceResponse['success']) {
            $statusCode = $serviceResponse['status_code'] ?? 500;
            return new JsonResponse([
                'success' => false,
                'message' => $serviceResponse['error'] ?? 'Failed to fetch delivery details.'
            ], $statusCode);
        }

        return new JsonResponse(['success' => true, 'data' => $serviceResponse['data']]);
    }

    public function updateDeliveryDetailsApi(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $deliveryId = isset($args['id']) ? (int)$args['id'] : 0;
        if ($deliveryId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Delivery ID for update.'], 400);
        }

        $rawBody = $request->getBody()->getContents();
        $formData = json_decode($rawBody, true);

        if (json_last_error() !== JSON_ERROR_NONE && !empty($rawBody)) {
            error_log("JSON decode error in updateDeliveryDetailsApi for delivery ID {$deliveryId}: " . json_last_error_msg() . ". Raw body: " . $rawBody);
            return new JsonResponse(['success' => false, 'message' => 'Invalid JSON data submitted.'], 400);
        }

        if (empty($formData) && empty($rawBody)) { // Check if body was actually empty
            return new JsonResponse(['success' => false, 'message' => 'No data submitted.'], 400);
        }

        if (empty($formData) && !empty($rawBody)) { // Non-empty body but formData is empty (e.g. not an object or json_decode failed silently for some reason)
             error_log("Received non-empty, non-JSON body or JSON that decoded to empty in updateDeliveryDetailsApi for delivery ID {$deliveryId}. Body: " . $rawBody);
             return new JsonResponse(['success' => false, 'message' => 'Submitted data is not in the expected format.'], 400);
        }


        // Basic validation (more detailed validation can be added in the service)
        if (!isset($formData['tanggal']) || !isset($formData['package_items']) || !is_array($formData['package_items'])) {
           return new JsonResponse(['success' => false, 'message' => 'Missing required fields (tanggal, package_items).'], 400);
        }

        try {
            // Pass deliveryId and formData to the service
            $serviceResponse = $this->ordersService->updateDeliveryAndOrderDetails($deliveryId, $formData, $accessToken);

            // It's good practice to check if the service returned the expected array structure
            if (!is_array($serviceResponse) || !isset($serviceResponse['success'])) {
                error_log("OrdersService::updateDeliveryAndOrderDetails returned unexpected format for delivery ID {$deliveryId}. Response: " . print_r($serviceResponse, true));
                return new JsonResponse([
                    'success' => false,
                    'message' => 'An unexpected internal error occurred while processing the update (Service Error Format).'
                ], 500);
            }

            if ($serviceResponse['success']) {
                return new JsonResponse(['success' => true, 'message' => $serviceResponse['message'] ?? 'Delivery details updated successfully.']);
            } else {
                $statusCode = $serviceResponse['status_code'] ?? 500;
                return new JsonResponse([
                    'success' => false,
                    'message' => $serviceResponse['error'] ?? 'Failed to update delivery details.'
                ], $statusCode);
            }
        } catch (\Throwable $t) { // Catch any throwable, including Errors and Exceptions
            // Log the detailed error for server-side analysis
            error_log("Critical error in OrdersController::updateDeliveryDetailsApi for delivery ID {$deliveryId}: " . $t->getMessage() . " - File: " . $t->getFile() . " - Line: " . $t->getLine() . " - Trace: " . $t->getTraceAsString());

            // Return a generic error message to the client
            return new JsonResponse([
                'success' => false,
                'message' => 'An critical server error occurred. Please try again later or contact support if the issue persists.'
                // Optionally, include a unique error ID here that can be cross-referenced with logs
            ], 500); // Internal Server Error
        }
    }

    // Renamed from handleUpdateDailyOrderViaPhp
    public function updateDailyOrder(ServerRequestInterface $request, array $args): Response
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new Response\JsonResponse([
                'success' => false, 
                'message' => 'Autentikasi diperlukan. Silakan login kembali.'
            ], 401);
        }

        $deliveryIdStr = $args['id'] ?? null; // Corrected to 'id' to match route placeholder {id:\d+}
        if (!$deliveryIdStr || !is_numeric($deliveryIdStr)) {
            return new Response\JsonResponse(['success' => false, 'message' => 'Delivery ID tidak valid atau hilang.'], 400);
        }
        $deliveryId = (int)$deliveryIdStr;

        $requestData = $request->getParsedBody();
        if (empty($requestData)) {
            $rawBody = (string) $request->getBody();
            if (!empty($rawBody) && $requestData === null) { // Check if body was non-empty but parsing failed
                error_log("[updateDailyOrder] Failed to parse JSON body for delivery ID: " . $deliveryId . ". Raw body: " . substr($rawBody, 0, 500));
                return new Response\JsonResponse(['success' => false, 'message' => 'Request body tidak valid JSON.'], 400);
            }
            return new Response\JsonResponse(['success' => false, 'message' => 'Request data tidak boleh kosong.'], 400);
        }

        try {
            // Call the service method that handles the broader update logic including RPC and parent order total update
            $serviceResult = $this->ordersService->updateDeliveryAndOrderDetails($deliveryId, $requestData, $accessToken);

            if ($serviceResult['success']) {
                return new Response\JsonResponse([
                    'success' => true,
                    'message' => $serviceResult['message'] ?? 'Pesanan berhasil diperbarui.'
                ]); // HTTP 200 OK implicitly
            } else {
                // Log controller-level context. The service method should have already logged specifics.
                error_log('OrdersService::updateDeliveryAndOrderDetails failed for delivery_id ' . $deliveryId . '. Service error: ' . ($serviceResult['error'] ?? 'Unknown service error'));
                return new Response\JsonResponse([
                    'success' => false,
                    'message' => $serviceResult['error'] ?? 'Terjadi kesalahan saat memproses permintaan.'
                ], $serviceResult['status_code'] ?? 500);
            }

        } catch (\Throwable $e) { 
            // This catch block is for unexpected errors in the controller logic itself,
            // or if the service method throws an exception not caught internally (though it should catch Throwables).
            error_log('Exception in OrdersController::updateDailyOrder for delivery_id ' . $deliveryId . ': ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return new Response\JsonResponse([
                'success' => false, 
                'message' => 'Kesalahan internal server: ' . $e->getMessage() 
            ], 500);
        }
    }
}
