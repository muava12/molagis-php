<?php
declare(strict_types=1);

namespace Molagis\Features\Settings;

use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;
use Laminas\Diactoros\Response\JsonResponse;
use Molagis\Shared\SupabaseService;
use Molagis\Features\Paket\PaketService; // Added
use Twig\Environment;

class SettingsController
{
    private SettingsService $settingsService;
    private SupabaseService $supabaseService;
    private Environment $twig;
    private PaketService $paketService; // Added

    public function __construct(
        SettingsService $settingsService,
        SupabaseService $supabaseService,
        Environment $twig,
        PaketService $paketService // Added
    ) {
        $this->settingsService = $settingsService;
        $this->supabaseService = $supabaseService;
        $this->twig = $twig;
        $this->paketService = $paketService; // Added
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

        $paketsResponse = $this->paketService->getPakets($accessToken); // Added
        $pakets = $paketsResponse['data'] ?? []; // Added

        $response = new Response();
        $response->getBody()->write(
            $this->twig->render('settings.html.twig', [
                'title' => 'Pengaturan',
                'active_couriers' => $couriers,
                'settingsMap' => $settingsMap,
                'userEmail' => $userEmail, // Pass userEmail separately as it might be used as a default
                'error' => $settingsResponse['error'] ?? null,
                'pakets' => $pakets, // Added
                'paket_error' => $paketsResponse['error'] ?? null, // Added
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

    // --- BEGIN PAKET CRUD METHODS ---

    public function listPakets(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        $response = $this->paketService->getPakets($accessToken);
        if ($response['error']) {
            return new JsonResponse(['success' => false, 'message' => $response['error']], 500);
        }
        return new JsonResponse(['success' => true, 'data' => $response['data'] ?? []]);
    }

    public function getPaket(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        $paketId = isset($args['id']) ? (int)$args['id'] : 0;
        if ($paketId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Paket ID'], 400);
        }
        $response = $this->paketService->getPaketById($paketId, $accessToken);

        if ($response['error'] || empty($response['data'])) {
            return new JsonResponse(['success' => false, 'message' => $response['error'] ?? 'Paket tidak ditemukan'], 404);
        }
        return new JsonResponse(['success' => true, 'data' => $response['data']]);
    }

    public function addPaket(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $data = $request->getParsedBody();
        if (empty($data)) {
            return new JsonResponse(['success' => false, 'message' => 'No data provided'], 400);
        }

        $response = $this->paketService->createPaket($data, $accessToken);

        if ($response['error']) {
            return new JsonResponse(['success' => false, 'message' => $response['error']], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Paket berhasil ditambahkan',
            'data' => $response['data']
        ], 201);
    }

    public function updatePaket(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $paketId = isset($args['id']) ? (int)$args['id'] : 0;
        if ($paketId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Paket ID'], 400);
        }

        $data = $request->getParsedBody();
        if (empty($data)) {
            return new JsonResponse(['success' => false, 'message' => 'No data provided for update'], 400);
        }

        $response = $this->paketService->updatePaket($paketId, $data, $accessToken);

        if ($response['error']) {
            // If PaketService returns a specific "not found" error, could use 404
            return new JsonResponse(['success' => false, 'message' => $response['error']], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Paket berhasil diperbarui',
            'data' => $response['data']
        ]); // Default 200 OK
    }

    public function deletePaket(ServerRequestInterface $request, array $args): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $paketId = isset($args['id']) ? (int)$args['id'] : 0;
        if ($paketId <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Invalid Paket ID'], 400);
        }

        $response = $this->paketService->deletePaket($paketId, $accessToken);

        // Supabase delete usually returns empty data on success, or an error.
        // If it returns an error (e.g., RLS violation, or item not found if specific conditions met by policies)
        if ($response['error']) {
             // Check if the error indicates "not found" - this might depend on Supabase/PostgREST error structure
            if (is_array($response['error']) && isset($response['error']['code']) && $response['error']['code'] === 'PGRST204') { // PostgREST code for no rows found on delete
                return new JsonResponse(['success' => false, 'message' => 'Paket tidak ditemukan atau sudah dihapus.'], 404);
            }
            return new JsonResponse(['success' => false, 'message' => $response['error']], 400);
        }

        // If data is not empty, it implies success (Supabase typically returns the deleted record(s) or an empty array)
        // Or, if no error and data is empty, it's also success for delete.
        if (empty($response['error'])) {
             return new JsonResponse(['success' => true, 'message' => 'Paket berhasil dihapus']);
        }

        // Fallback error if logic above is not exhaustive for Supabase client responses
        return new JsonResponse(['success' => false, 'message' => 'Gagal menghapus paket, respons tidak dikenali.'], 500);
    }

    public function updatePaketOrder(ServerRequestInterface $request): JsonResponse
    {
        $accessToken = $_SESSION['user_token'] ?? null;
        if (!$accessToken) {
            return new JsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $orderData = $request->getParsedBody();

        // Basic validation for $orderData structure
        if (!is_array($orderData) || empty($orderData)) {
            return new JsonResponse(['success' => false, 'message' => 'Data urutan tidak valid.'], 400);
        }
        foreach ($orderData as $item) {
            if (!isset($item['id']) || !isset($item['urutan']) || !is_int($item['id']) || !is_int($item['urutan'])) {
                return new JsonResponse(['success' => false, 'message' => 'Format data urutan tidak sesuai. Setiap item harus memiliki "id" (integer) dan "urutan" (integer).'], 400);
            }
        }

        $response = $this->paketService->updatePaketOrder($orderData, $accessToken);

        if ($response['error']) {
            return new JsonResponse(['success' => false, 'message' => $response['error']], 400);
        }

        return new JsonResponse([
            'success' => true,
            'message' => 'Urutan paket berhasil diperbarui'
        ]);
    }
    // --- END PAKET CRUD METHODS ---
}