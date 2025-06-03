<?php
declare(strict_types=1);

namespace Molagis\Features\Orders;

use Molagis\Features\Settings\SettingsService;
use Molagis\Shared\SupabaseService;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;
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
        $selectedCustomerId = isset($queryParams['customer_id']) ? (int)$queryParams['customer_id'] : null;

        $customerDeliveries = [];
        $deliveriesError = null;
        if ($selectedCustomerId) {
            // Uses getDeliveriesByCustomerId from the new OrdersService
            $deliveriesResponse = $this->ordersService->getDeliveriesByCustomerId($selectedCustomerId, $accessToken);
            $customerDeliveries = $deliveriesResponse['data'] ?? [];
            $deliveriesError = $deliveriesResponse['error'] ?? null;
        }

        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        
        $response = new Response();
        $response->getBody()->write(
            $this->twig->render('order-list.html.twig', [ // This template will be moved later
                'title' => 'Riwayat Pengiriman Pelanggan',
                'all_customers' => $allCustomers,
                'selected_customer_id' => $selectedCustomerId,
                'deliveries' => $customerDeliveries,
                'business_name' => $businessName,
                'couriers' => $couriersResult['data'] ?? [],
                'user_id' => $userId,
                'error' => $deliveriesError ?? $couriersResult['error'] ?? null
            ])
        );

        return $response;
    }
}
