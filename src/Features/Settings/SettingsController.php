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
        $parsedBody = $request->getParsedBody();
        $errors = [];
        $updatedKeys = [];

        try {
            foreach ($parsedBody as $key => $value) {
                // Ensure value is a string, as Supabase might expect string values for JSONB or text fields
                $stringValue = is_array($value) ? json_encode($value) : (string) $value;
                $response = $this->settingsService->updateSetting($key, $stringValue, $accessToken);
                if ($response['error']) {
                    $errors[$key] = $response['error'];
                } else {
                    $updatedKeys[] = $key;
                }
            }

            // If public_profile_visible was not in the submitted data, it means the checkbox was unchecked.
            if (!in_array('public_profile_visible', $updatedKeys) && !isset($parsedBody['public_profile_visible'])) {
                $response = $this->settingsService->updateSetting('public_profile_visible', 'false', $accessToken);
                if ($response['error']) {
                    $errors['public_profile_visible'] = "Gagal memperbarui visibilitas profil publik: " . $response['error'];
                }
            }

            if (!empty($errors)) {
                $errorMessages = [];
                foreach ($errors as $key => $message) {
                    // Use the message directly if it's already descriptive (like the one from public_profile_visible error)
                    // Otherwise, formulate a generic one.
                    if (strpos($message, "Gagal memperbarui {$key}") === false && $key !== 'public_profile_visible') {
                         $errorMessages[] = "Gagal memperbarui {$key}: {$message}";
                    } else {
                        $errorMessages[] = $message;
                    }
                }
                return new JsonResponse([
                    'success' => false,
                    'message' => implode('; ', $errorMessages)
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