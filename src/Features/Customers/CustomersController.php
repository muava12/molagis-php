<?php
declare(strict_types=1);

namespace Molagis\Features\Customers;

use Psr\Http\Message\ServerRequestInterface;
use Twig\Environment;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Molagis\Shared\SupabaseService;
use Molagis\Features\Settings\SettingsService; // Added

class CustomersController
{
    public function __construct(
        private CustomersService $customersService,
        private SupabaseService $supabaseService,
        private SettingsService $settingsService, // Added
        private Environment $twig
    ) {}

    public function showCustomers(ServerRequestInterface $request): string
    {
        $user = $request->getAttribute('user');
        $accessToken = $_SESSION['user_token'] ?? null;
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);

        $businessNameResponse = $this->settingsService->getSettingByKey('business_name', $accessToken);
        $businessName = $businessNameResponse['data'] ?? 'Molagis'; // Or your preferred default

        return $this->twig->render('customers.html.twig', [
            'title' => 'Customers Bro',
            'user_id' => $user['id'] ?? 'default-seed',
            'couriers' => $couriersResult['data'] ?? [],
            'business_name' => $businessName, // Added
            'error' => $couriersResult['error'] ?? null,
        ]);
    }

    public function getCustomers(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $queryParams = $request->getQueryParams();
        
        if (isset($queryParams['id'])) {
            // Tangani permintaan untuk satu pelanggan berdasarkan ID
            $idFilter = $queryParams['id']; // Misalnya: id=eq.<uuid>
            $result = $this->customersService->getCustomerById($idFilter, $accessToken);
        } else {
            // Ambil semua pelanggan
            $result = $this->customersService->getAllCustomers($accessToken);
        }

        return new JsonResponse([
            'customers' => $result['data'] ?? [],
            'error' => $result['error'] ?? null,
        ]);
    }

    public function addCustomer(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        error_log('addCustomer data: ' . print_r($data, true)); // Tambahkan logging
        $result = $this->customersService->addCustomer($data, $accessToken);

        return new JsonResponse([
            'success' => !$result['error'],
            'error' => $result['error'] ?? null,
        ], $result['error'] ? 400 : 200);
    }

    public function updateCustomer(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        error_log('updateCustomer data: ' . print_r($data, true)); // Tambahkan logging

        // Periksa apakah data ada dan mengandung id
        if (!$data || !is_array($data)) {
            error_log('updateCustomer: Invalid or empty request body');
            return new JsonResponse(['error' => 'Data permintaan tidak valid'], 400);
        }

        $customerId = $data['id'] ?? null;
        if (!$customerId || !is_string($customerId)) {
            error_log('updateCustomer: Invalid customer ID: ' . var_export($customerId, true));
            return new JsonResponse(['error' => 'ID pelanggan tidak valid'], 400);
        }

        $result = $this->customersService->updateCustomer($customerId, $data, $accessToken);

        return new JsonResponse([
            'success' => !$result['error'],
            'error' => $result['error'] ?? null,
        ], $result['error'] ? 400 : 200);
    }

    public function deleteCustomer(ServerRequestInterface $request): ResponseInterface
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        error_log('deleteCustomer data: ' . print_r($data, true)); // Tambahkan logging
        $customerId = $data['id'] ?? null;
        if (!$customerId) {
            return new JsonResponse(['error' => 'ID pelanggan tidak valid'], 400);
        }
        $result = $this->customersService->deleteCustomer($customerId, $accessToken);

        return new JsonResponse([
            'success' => !$result['error'],
            'error' => $result['error'] ?? null,
        ], $result['error'] ? 400 : 200);
    }
}