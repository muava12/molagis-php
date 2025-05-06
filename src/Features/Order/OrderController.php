<?php

declare(strict_types=1);

namespace Molagis\Features\Order;

use Molagis\Shared\SupabaseService;
use Molagis\Features\Settings\SettingsService;
use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response; // Pastikan Response diimpor
use Twig\Environment;
use InvalidArgumentException; // Impor exception
use RuntimeException;       // Impor exception

class OrderController
{
    public function __construct(
        private OrderService $orderService,
        private SupabaseService $supabaseService, // SupabaseService untuk getActiveCouriers
        private Environment $twig
    ) {}

    /**
     * Menampilkan halaman form input pesanan.
     * @param ServerRequestInterface $request Request object.
     * @return string Rendered HTML.
     */
    public function showOrder(ServerRequestInterface $request): string
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            header('Location: /login');
            exit;
        }
        // Ambil pengaturan default_courier
        $settingService = new SettingsService($this->supabaseClient); // Pastikan supabaseClient tersedia
        $defaultCourierResponse = $settingService->getSettingByKey('default_courier', $accessToken);
        $defaultCourier = $defaultCourierResponse['data'] ?? null;

        // Ambil data yang diperlukan untuk form (kurir aktif, paket)
        $couriersResult = $this->supabaseService->getActiveCouriers($accessToken);
        $packages = $this->orderService->getPackages($accessToken); // Ambil paket dari OrderService

        // Render halaman order dengan data yang diperlukan
        return $this->twig->render('order.html.twig', [
            'title' => 'Input Pesanan Catering Harian',
            'active_couriers' => $couriersResult['data'] ?? [], // Kirim kurir aktif ke template
            'packages' => $packages, // Kirim paket ke template
            'couriers' => $couriersResult['data'] ?? [], // Kirim kurir aktif ke header
        ]);
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
        $data = $request->getParsedBody(); // Ambil data JSON yang sudah diparsing (oleh index.php)

        // Periksa apakah data berhasil diparsing
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

            // Panggil service untuk menyimpan order, teruskan data dari frontend
            $orderId = $this->orderService->saveOrder($data, $accessToken);

            // Kirim respons sukses jika berhasil
            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Pesanan berhasil disimpan.',
                'order_id' => $orderId, // Kembalikan order_id
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200); // Status 200 OK

        } catch (InvalidArgumentException $e) {
            // Tangkap error validasi dari service
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Input tidak valid: ' . $e->getMessage(),
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400); // Status 400 Bad Request

        } catch (RuntimeException $e) {
            // Tangkap error runtime (misal: error RPC) dari service
            error_log('Order save error: ' . $e->getMessage()); // Log error server
            $response->getBody()->write(json_encode([
                'success' => false,
                // Berikan pesan yang lebih umum ke client
                'message' => 'Terjadi kesalahan saat menyimpan pesanan. Silakan coba lagi nanti.',
                // 'debug_message' => $e->getMessage() // Opsional: hanya untuk development
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500); // Status 500 Internal Server Error

        } catch (\Throwable $e) {
            // Tangkap error tak terduga lainnya
            error_log('Unexpected error in handleOrder: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem yang tidak terduga.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /**
     * Endpoint API untuk mengambil daftar paket (jika diperlukan oleh frontend secara dinamis).
     * @param ServerRequestInterface $request Request object.
     * @return Response Response JSON.
     */
    public function getPackages(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $accessToken = $_SESSION['user_token'] ?? null;
        // Perlu autentikasi? Jika ya:
        // if (!$accessToken) { /* return 401 */ }

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
     * Endpoint API untuk mengambil daftar customer (jika diperlukan oleh frontend secara dinamis, misal untuk Awesomplete).
     * @param ServerRequestInterface $request Request object.
     * @return Response Response JSON.
     */
    public function getCustomers(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $accessToken = $_SESSION['user_token'] ?? null;
        // Perlu autentikasi? Jika ya:
        if (!$accessToken) {
            $response->getBody()->write(json_encode(['error' => 'Autentikasi diperlukan.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        try {
            $customers = $this->orderService->getCustomers($accessToken);
            $response->getBody()->write(json_encode($customers)); // Kirim data customer (termasuk ID dan nama)
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            error_log('Error getting customers: ' . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Gagal mengambil data pelanggan.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }
}
