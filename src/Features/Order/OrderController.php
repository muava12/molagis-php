<?php

declare(strict_types=1);

namespace Molagis\Features\Order;

use Molagis\Shared\SupabaseService;
use Molagis\Features\Settings\SettingsService;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;
use Twig\Environment;
use InvalidArgumentException;
use RuntimeException;

class OrderController
{
    public function __construct(
        private OrderService $orderService,
        private SupabaseService $supabaseService,
        private SettingsService $settingsService, // Tambahkan SettingsService
        private Environment $twig
    ) {}

    /**
     * Menampilkan halaman form input pesanan.
     * @param ServerRequestInterface $request Request object.
     * @return Response Rendered HTML response.
     */
    public function showOrder(ServerRequestInterface $request): Response
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new Response\RedirectResponse('/login');
        }

        // Ambil pengaturan default_courier dan default_shipping_cost
        $defaultCourierResponse = $this->settingsService->getSettingByKey('default_courier', $accessToken);
        $defaultCourier = $defaultCourierResponse['data'] ?? null;

        $defaultShippingCostResponse = $this->settingsService->getSettingByKey('default_shipping_cost', $accessToken);
        $defaultShippingCost = $defaultShippingCostResponse['data'] ?? '5000'; // Fallback ke 5000 jika tidak ada

        // Ambil data yang diperlukan untuk form (kurir aktif, paket)
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $packages = $this->orderService->getPackages($accessToken);

        // Render halaman order dengan data yang diperlukan
        $response = new Response();
        $response->getBody()->write(
            $this->twig->render('order.html.twig', [
                'title' => 'Input Pesanan Catering Harian',
                'active_couriers' => $couriersResult['data'] ?? [],
                'packages' => $packages,
                'couriers' => $couriersResult['data'] ?? [],
                'default_courier' => $defaultCourier, // Kirim default_courier ke template
                'default_shipping_cost' => $defaultShippingCost, // Kirim default_shipping_cost ke template
                'error' => $couriersResult['error'] ?? null,
            ])
        );

        return $response;
    }

    /**
     * Menangani request POST untuk menyimpan pesanan baru.
     * Menerima data JSON dari frontend.
     * @param ServerRequestInterface $request Request object dengan parsed body JSON.
     * @return Response Response JSON (success/error).
     */
    public function handleOrder(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $data = $request->getParsedBody();

        if ($data === null || !is_array($data)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Format data request tidak valid (JSON diharapkan).',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $accessToken = $_SESSION['user_token'] ?? null;
            if (!$accessToken) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'message' => 'Autentikasi diperlukan, silakan login kembali.',
                ]));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
            }

            $orderId = $this->orderService->saveOrder($data, $accessToken);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Pesanan berhasil disimpan.',
                'order_id' => $orderId,
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (InvalidArgumentException $e) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Input tidak valid: ' . $e->getMessage(),
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);

        } catch (RuntimeException $e) {
            error_log('Order save error: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan pesanan. Silakan coba lagi nanti.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);

        } catch (\Throwable $e) {
            error_log('Unexpected error in handleOrder: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem yang tidak terduga.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /**
     * Endpoint API untuk mengambil daftar paket.
     * @param ServerRequestInterface $request Request object.
     * @return Response Response JSON.
     */
    public function getPackages(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $accessToken = $_SESSION['user_token'] ?? null;

        try {
            $packages = $this->orderService->getPackages($accessToken);
            $response->getBody()->write(json_encode($packages));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            error_log('Error getting packages: ' . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Gagal mengambil data paket.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /**
     * Endpoint API untuk mengambil daftar customer.
     * @param ServerRequestInterface $request Request object.
     * @return Response Response JSON.
     */
    public function getCustomers(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            $response->getBody()->write(json_encode(['error' => 'Autentikasi diperlukan.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        try {
            $customers = $this->orderService->getCustomers($accessToken);
            $response->getBody()->write(json_encode($customers));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            error_log('Error getting customers: ' . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Gagal mengambil data pelanggan.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }
}