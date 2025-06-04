<?php
declare(strict_types=1);

namespace Molagis\Features\Paket;

use Molagis\Shared\SupabaseClient; // Assuming this is the correct namespace for your SupabaseClient
use Exception; // For throwing exceptions on validation errors

class PaketService
{
    private SupabaseClient $supabaseClient;
    private string $tableName = 'paket'; // Define table name for convenience

    public function __construct(SupabaseClient $supabaseClient)
    {
        $this->supabaseClient = $supabaseClient;
    }

    /**
     * Fetches all packages, ordered by 'urutan' if not null, then by 'id'.
     */
    public function getPakets(?string $accessToken = null): array
    {
        // Prioritize 'urutan', then 'id' for consistent ordering
        return $this->supabaseClient->get(
            "/rest/v1/{$this->tableName}?select=*&order=urutan.asc.nullslast,id.asc",
            [],
            $accessToken
        );
    }

    /**
     * Fetches a single package by its ID.
     */
    public function getPaketById(int $id, ?string $accessToken = null): array
    {
        $response = $this->supabaseClient->get(
            "/rest/v1/{$this->tableName}?id=eq.{$id}&select=*",
            [],
            $accessToken
        );
        // Return the first item if data exists, or an empty array/error structure
        if (!empty($response['data'])) {
            return ['data' => $response['data'][0], 'error' => null];
        }
        return ['data' => null, 'error' => $response['error'] ?? 'Paket not found'];
    }

    /**
     * Creates a new package.
     * Validates required fields.
     */
    public function createPaket(array $data, ?string $accessToken = null): array
    {
        // Basic validation
        if (empty($data['nama']) || !isset($data['harga_modal']) || !isset($data['harga_jual'])) {
            // It's better to return an error structure than throw an exception here
            // to be consistent with SupabaseClient responses.
            return ['data' => null, 'error' => 'Nama, Harga Modal, and Harga Jual are required.'];
        }

        // Prepare data for Supabase (ensure correct types if necessary)
        $insertData = [
            'nama' => $data['nama'],
            'deskripsi' => $data['deskripsi'] ?? null,
            'harga_modal' => (float) $data['harga_modal'],
            'harga_jual' => (float) $data['harga_jual'],
            'urutan' => isset($data['urutan']) ? (int) $data['urutan'] : null,
        ];

        return $this->supabaseClient->post(
            "/rest/v1/{$this->tableName}",
            $insertData,
            [],
            $accessToken
        );
    }

    /**
     * Updates an existing package.
     */
    public function updatePaket(int $id, array $data, ?string $accessToken = null): array
    {
        // Basic validation - ensure at least one field is being updated
        if (empty($data)) {
             return ['data' => null, 'error' => 'No data provided for update.'];
        }

        // Prepare data, only include fields that are meant to be updated
        $updateData = [];
        if (isset($data['nama'])) $updateData['nama'] = $data['nama'];
        if (array_key_exists('deskripsi', $data)) $updateData['deskripsi'] = $data['deskripsi']; // Allow setting deskripsi to null
        if (isset($data['harga_modal'])) $updateData['harga_modal'] = (float) $data['harga_modal'];
        if (isset($data['harga_jual'])) $updateData['harga_jual'] = (float) $data['harga_jual'];
        if (array_key_exists('urutan', $data)) $updateData['urutan'] = isset($data['urutan']) ? (int) $data['urutan'] : null; // Allow setting urutan to null or int

        if (empty($updateData)) {
            return ['data' => null, 'error' => 'No valid fields provided for update.'];
        }

        return $this->supabaseClient->update(
            "/rest/v1/{$this->tableName}?id=eq.{$id}",
            $updateData,
            [],
            $accessToken
        );
    }

    /**
     * Deletes a package by its ID.
     */
    public function deletePaket(int $id, ?string $accessToken = null): array
    {
        return $this->supabaseClient->delete(
            "/rest/v1/{$this->tableName}?id=eq.{$id}",
            [],
            $accessToken
        );
    }

    /**
     * Updates the order of multiple packages.
     * $orderData should be an array of arrays, e.g., [['id' => 1, 'urutan' => 0], ['id' => 2, 'urutan' => 1]]
     * This is a more complex operation and might require multiple calls or a bulk update if supported.
     * For simplicity, we can iterate and update one by one, or the user can implement a stored procedure.
     * For now, let's assume individual updates or that this will be handled by repeated calls to updatePaket.
     * A basic implementation might look like this:
     */
    public function updatePaketOrder(array $orderData, ?string $accessToken = null): array
    {
        $results = [];
        $errors = [];

        foreach ($orderData as $item) {
            if (!isset($item['id']) || !isset($item['urutan'])) {
                $errors[] = "Invalid data for item: " . json_encode($item) . ". 'id' and 'urutan' are required.";
                continue;
            }
            $result = $this->updatePaket((int)$item['id'], ['urutan' => (int)$item['urutan']], $accessToken);
            if ($result['error']) {
                $errors[] = "Error updating paket ID {$item['id']}: {$result['error']}";
            }
            $results[] = $result; // Store individual results if needed
        }

        if (!empty($errors)) {
            return ['data' => null, 'error' => implode('; ', $errors)];
        }
        return ['data' => $results, 'error' => null]; // Or a more consolidated success message
    }
}
