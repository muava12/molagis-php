<?php
declare(strict_types=1);

namespace Molagis\Features\Settings;

use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;
use Laminas\Diactoros\Response\JsonResponse;
use Molagis\Shared\SupabaseService;
use Twig\Environment;

class SettingsController
{
    private SettingsService $settingsService;
    private SupabaseService $supabaseService;
    private Environment $twig;

    public function __construct(SettingsService $settingsService, SupabaseService $supabaseService, Environment $twig)
    {
        $this->settingsService = $settingsService;
        $this->supabaseService = $supabaseService;
        $this->twig = $twig;
    }

    public function showSettings(ServerRequestInterface $request): Response
    {
        $accessToken = $_SESSION['user_token'] ?? null;

        $settingsResponse = $this->settingsService->getSettings($accessToken);
        $settings = $settingsResponse['data'] ?? [];
        $settingsMap = array_column($settings, 'value', 'key');

        $couriersResponse = $this->settingsService->getActiveCouriers($accessToken);
        $couriers = $couriersResponse['data'] ?? [];

        $user = $this->supabaseService->getUser($accessToken);
        $userEmail = $user['email'] ?? '';

        $response = new Response();
        $response->getBody()->write(
            $this->twig->render('settings.html.twig', [
                'title' => 'Pengaturan',
                'active_couriers' => $couriers,
                'default_courier' => $settingsMap['default_courier'] ?? '',
                'business_name' => $settingsMap['business_name'] ?? '',
                'default_shipping_cost' => $settingsMap['default_shipping_cost'] ?? '5000',
                'notification_email' => $settingsMap['notification_email'] ?? $userEmail,
                'public_profile_visible' => filter_var($settingsMap['public_profile_visible'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
                'error' => $settingsResponse['error'] ?? null,
            ])
        );

        return $response;
    }

    public function updateSettings(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();

        try {
            $updates = [
                'default_courier' => $data['default_courier'] ?? null,
                'business_name' => $data['business_name'] ?? null,
                'default_shipping_cost' => $data['default_shipping_cost'] ?? null,
                'notification_email' => $data['notification_email'] ?? null,
                'public_profile_visible' => isset($data['public_profile_visible']) ? 'true' : 'false',
            ];

            foreach ($updates as $key => $value) {
                if ($value !== null) {
                    $response = $this->settingsService->updateSetting($key, $value, $accessToken);
                    if ($response['error']) {
                        return new JsonResponse([
                            'success' => false,
                            'message' => "Gagal memperbarui {$key}: " . $response['error']
                        ], 400);
                    }
                }
            }

            return new JsonResponse([
                'success' => true,
                'message' => 'Pengaturan berhasil diperbarui'
            ]);
        } catch (\Exception $e) {
            error_log('Error updating settings: ' . $e->getMessage());
            return new JsonResponse([
                'success' => false,
                'message' => 'Gagal memperbarui pengaturan: ' . $e->getMessage()
            ], 500);
        }
    }
}