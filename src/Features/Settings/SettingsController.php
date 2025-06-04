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
                'settingsMap' => $settingsMap,
                'userEmail' => $userEmail, // Pass userEmail separately as it might be used as a default
                'error' => $settingsResponse['error'] ?? null,
            ])
        );

        return $response;
    }

    public function updateSettings(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        $data = $request->getParsedBody();
        $errors = [];

        try {
            // Handle public_profile_visible separately
            $publicProfileVisibleValue = isset($data['public_profile_visible']) ? 'true' : 'false';
            $response = $this->settingsService->updateSetting('public_profile_visible', $publicProfileVisibleValue, $accessToken);
            if ($response['error']) {
                $errors['public_profile_visible'] = $response['error'];
            }
            // Unset to avoid double processing if it was present in $data
            unset($data['public_profile_visible']);

            foreach ($data as $key => $value) {
                // Ensure value is a string, as Supabase might expect string values for JSONB or text fields
                $stringValue = is_array($value) ? json_encode($value) : (string) $value;
                $response = $this->settingsService->updateSetting($key, $stringValue, $accessToken);
                if ($response['error']) {
                    $errors[$key] = $response['error'];
                }
            }

            if (!empty($errors)) {
                $errorMessages = [];
                foreach ($errors as $key => $message) {
                    $errorMessages[] = "Gagal memperbarui {$key}: {$message}";
                }
                return new JsonResponse([
                    'success' => false,
                    'message' => implode(', ', $errorMessages)
                ], 400);
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