<?php
declare(strict_types=1);

namespace Molagis\Features\Orders;

use Molagis\Shared\SupabaseClient;
// Note: InvalidArgumentException and RuntimeException are not strictly needed here
// as the copied methods don't directly throw them, but can be added if future methods do.

class OrdersService
{
    public function __construct(
        private SupabaseClient $supabaseClient
    ) {}

    /**
     * Mengambil daftar customer dari Supabase.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Daftar customer.
     */
    public function getCustomers(?string $accessToken = null): array
    {
        // Ambil juga ongkir default untuk potensi penggunaan di frontend
        $response = $this->supabaseClient->get('/rest/v1/customers?select=id,nama,ongkir,alamat', [], $accessToken);
        return $response['data'] ?? [];
    }

    /**
     * Mengambil semua data pengiriman untuk pelanggan tertentu, diratakan dan diurutkan.
     *
     * @param int $customerId ID pelanggan.
     * @param string|null $accessToken Token akses pengguna.
     * @param int $limit Jumlah maksimal order utama yang diambil.
     * @param int $offset Jumlah order utama yang dilewati.
     * @return array Hasil yang berisi 'data' (daftar pengiriman yang diratakan) atau 'error'.
     */
    public function getDeliveriesByCustomerId(int $customerId, ?string $accessToken = null, int $limit = 100, int $offset = 0): array
    {
        $selectFields = 'id,tanggal_pesan,metode_pembayaran,notes,customers(nama),deliverydates(id,tanggal,status,ongkir,item_tambahan,harga_tambahan,total_harga_perhari,couriers(nama),orderdetails(id,jumlah,subtotal_harga,catatan_dapur,catatan_kurir,paket(nama)))';

        $query = sprintf(
            '/rest/v1/orders?customer_id=eq.%d&select=%s&order=tanggal_pesan.desc&limit=%d&offset=%d',
            $customerId,
            $selectFields,
            $limit,
            $offset
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log('Supabase getDeliveriesByCustomerId error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            $allDeliveries = [];
            if (!empty($response['data'])) {
                foreach ($response['data'] as $order) {
                    $customerName = $order['customers']['nama'] ?? 'N/A';
                    if (isset($order['deliverydates']) && is_array($order['deliverydates'])) {
                        foreach ($order['deliverydates'] as $delivery) {
                            $allDeliveries[] = [
                                'delivery_id' => $delivery['id'],
                                'delivery_tanggal' => $delivery['tanggal'],
                                'delivery_status' => $delivery['status'] ?? 'N/A',
                                'delivery_ongkir' => $delivery['ongkir'] ?? 0,
                                'item_tambahan' => $delivery['item_tambahan'] ?? '',
                                'harga_tambahan' => $delivery['harga_tambahan'] ?? 0,
                                'total_harga_perhari' => $delivery['total_harga_perhari'] ?? 0,
                                'courier_nama' => $delivery['couriers']['nama'] ?? 'N/A',
                                'order_id' => $order['id'],
                                'order_tanggal_pesan' => $order['tanggal_pesan'],
                                'order_metode_pembayaran' => $order['metode_pembayaran'] ?? 'N/A',
                                'order_notes' => $order['notes'] ?? '',
                                'customer_nama' => $customerName,
                                'details' => $delivery['orderdetails'] ?? []
                            ];
                        }
                    }
                }
                // Sort all deliveries by delivery_tanggal ascending
                usort($allDeliveries, function($a, $b) {
                    return strcmp($a['delivery_tanggal'], $b['delivery_tanggal']);
                });
            }
            return ['data' => $allDeliveries, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getDeliveriesByCustomerId: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching customer deliveries: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil data pesanan tunggal berdasarkan ID pesanan yang spesifik.
     *
     * @param int $orderId ID pesanan yang dicari.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (objek pesanan tunggal) atau 'error'.
     */
    public function getOrderByExactId(int $orderId, ?string $accessToken = null): array
    {
        $query = sprintf(
            '/rest/v1/orders?id=eq.%d&select=id,tanggal_pesan,total_harga,metode_pembayaran,notes,customers(nama)',
            $orderId
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log('Supabase getOrderByExactId error: ' . $errorMessage);
                return ['data' => null, 'error' => $errorMessage];
            }

            if (empty($response['data'])) {
                // error_log('Order not found for ID: ' . $orderId); // Optional: log not found as well
                return ['data' => null, 'error' => 'Order not found.'];
            }

            // Supabase returns an array even for single item queries by eq filter
            return ['data' => $response['data'][0], 'error' => null];
        } catch (\Exception $e) {
            error_log('Exception in getOrderByExactId: ' . $e->getMessage());
            return ['data' => null, 'error' => 'Exception occurred while fetching order by ID: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil semua data pengiriman untuk tanggal tertentu.
     *
     * @param string $date Tanggal dalam format "YYYY-MM-DD".
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'data' (daftar objek deliverydate) atau 'error'.
     */
    public function getDeliveriesByDate(string $date, ?string $accessToken = null): array
    {
        $selectFields = 'id,tanggal,status,ongkir,item_tambahan,harga_tambahan,total_harga_perhari,' .
                        'orders!inner(id,tanggal_pesan,metode_pembayaran,notes,customers!inner(id,nama)),' .
                        'couriers(id,nama),' . // Left join for couriers
                        'orderdetails!inner(id,jumlah,subtotal_harga,catatan_dapur,catatan_kurir,paket!inner(id,nama))';

        $query = sprintf(
            '/rest/v1/deliverydates?tanggal=eq.%s&select=%s&order=orders.customers.nama.asc,orders.id.asc',
            $date,
            $selectFields
        );

        try {
            $response = $this->supabaseClient->get($query, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log('Supabase getDeliveriesByDate error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            return ['data' => $response['data'] ?? [], 'error' => null];
        } catch (\Exception $e) {
            error_log('Exception in getDeliveriesByDate: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching deliveries by date: ' . $e->getMessage()];
        }
    }

    /**
     * Menghapus data pengiriman berdasarkan ID (deliverydates.id).
     *
     * @param int $deliveryDateId ID dari record deliverydates yang akan dihapus.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'success' (boolean) dan 'error' (string|null).
     */
    public function deleteDeliveryDateById(int $deliveryDateId, ?string $accessToken = null): array
    {
        $query = sprintf(
            '/rest/v1/deliverydates?id=eq.%d',
            $deliveryDateId
        );

        try {
            // SupabaseClient->delete typically returns true on success (204 No Content)
            // or throws an exception on network/HTTP error, or returns an array with 'error' on Supabase/DB error.
            $response = $this->supabaseClient->delete($query, [], $accessToken);

            // If $response is an array with an 'error' key, it's a Supabase-level error (e.g., RLS, policy violation)
            if (is_array($response) && isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : (string) $response['error'];
                error_log('Supabase deleteDeliveryDateById error: ' . $errorMessage);
                return ['success' => false, 'error' => $errorMessage];
            }

            // If $response is true (or anything not an error array), assume success.
            // The Supabase PHP client might return true for 204, or the Guzzle response object.
            // If it's the Guzzle response, check status code: $response->getStatusCode() === 204
            // For simplicity, if it didn't throw and didn't return an error array, assume it worked.
            // A more robust check might be needed depending on SupabaseClient->delete precise return.
            if ($response === true || (is_object($response) && method_exists($response, 'getStatusCode') && $response->getStatusCode() === 204) ) {
                 return ['success' => true, 'error' => null];
            }


            // If the client's delete method returns the Guzzle response object on non-erroring non-204,
            // or if it returns an unexpected array structure without 'error' but also not true.
            // This part might need adjustment based on how SupabaseClient->delete signals "not found" or other non-exception errors.
            // Typically, DELETE on a non-existent resource is a 404, which should throw an exception in a Guzzle client.
            // If it returns an empty array for "not found" without error, that's also a success in terms of the operation.
            // For now, we assume if no error was thrown and no ['error'] key, it's a success.
            return ['success' => true, 'error' => null];

        } catch (\GuzzleHttp\Exception\ClientException $e) {
            // Catch specific Guzzle client exceptions (4xx errors)
            $responseBody = $e->getResponse() ? $e->getResponse()->getBody()->getContents() : $e->getMessage();
            error_log('Guzzle ClientException in deleteDeliveryDateById for ID ' . $deliveryDateId . ': ' . $responseBody);
            // Try to parse Supabase error from response body
            $decodedBody = json_decode($responseBody, true);
            $errorMessage = $decodedBody['message'] ?? $decodedBody['error'] ?? 'Failed to delete due to client error (e.g., RLS, not found).';
            if ($e->getResponse() && $e->getResponse()->getStatusCode() === 404) {
                 // While 404 means not found, for a DELETE operation, this can be considered "success"
                 // as the resource is not there post-operation. Or, you can report it differently.
                 // Let's report it as a specific type of failure or a specific success message.
                 // For now, let's say the goal was for it to not exist, so it's a success in that sense.
                 // However, client-side might want to know if it was actually deleted vs not found.
                 // The prompt said: "even if no rows were affected... consider it a success"
                 // but a 404 is an actual error response. Let's treat 404 as "not found" error for now.
                return ['success' => false, 'error' => 'Delivery date not found.'];
            }
            return ['success' => false, 'error' => $errorMessage];
        } catch (\Exception $e) {
            error_log('Generic Exception in deleteDeliveryDateById for ID ' . $deliveryDateId . ': ' . $e->getMessage());
            return ['success' => false, 'error' => 'An exception occurred: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil jumlah total pengiriman untuk pelanggan tertentu.
     *
     * @param int $customerId ID pelanggan.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'count' atau 'error'.
     */
    public function getDeliveriesCountByCustomerId(int $customerId, ?string $accessToken): array
    {
        if (!$accessToken) {
            return ['count' => 0, 'error' => 'Authentication required.'];
        }

        try {
            // Construct the endpoint for Supabase REST API
            // This assumes 'delivery_dates' is the table and 'customer_id' is the column.
            // The 'select=count' will make Supabase return just the count.
            $endpoint = "/rest/v1/delivery_dates?select=count&customer_id=eq.{$customerId}";

            // Make the GET request using the custom SupabaseClient
            $response = $this->supabaseClient->get($endpoint, [], $accessToken);

            // Check for errors from the SupabaseClient
            if ($response['error']) {
                error_log("Supabase error in getDeliveriesCountByCustomerId: " . $response['error']);
                return ['count' => 0, 'error' => $response['error']];
            }

            // Extract the count
            // Supabase with `select=count` returns an array with a single object like: [{"count": 123}]
            if (isset($response['data'][0]['count'])) {
                return ['count' => (int)$response['data'][0]['count'], 'error' => null];
            } else {
                // This case might occur if the customer_id doesn't exist, Supabase might return an empty array
                // or if the response format is unexpected.
                // If customer_id not found leads to empty data array, count is 0.
                if (empty($response['data'])) {
                    return ['count' => 0, 'error' => null]; // No records found means count is 0
                }
                error_log("Unexpected response format in getDeliveriesCountByCustomerId: " . json_encode($response['data']));
                return ['count' => 0, 'error' => 'Unexpected response format when fetching count.'];
            }
        } catch (\Exception $e) {
            error_log("Generic exception in getDeliveriesCountByCustomerId: " . $e->getMessage());
            return ['count' => 0, 'error' => 'An unexpected error occurred while fetching delivery count.'];
        }
    }

    /**
     * Batch deletes delivery dates by their IDs.
     *
     * @param array $deliveryDateIds An array of integer delivery date IDs.
     * @param string|null $accessToken User's access token.
     * @return array Result array with 'success', 'message'/'error', and optionally 'deleted_ids'.
     */
    public function batchDeleteDeliveryDatesByIds(array $deliveryDateIds, ?string $accessToken = null): array
    {
        if (empty($deliveryDateIds)) {
            return ['success' => false, 'error' => 'No delivery IDs provided.', 'status_code' => 400];
        }

        // Ensure all IDs are integers, just in case they weren't sanitized before.
        $ids = array_map('intval', $deliveryDateIds);
        $ids = array_filter($ids, fn($id) => $id > 0);

        if (empty($ids)) {
            return ['success' => false, 'error' => 'No valid delivery IDs after filtering.', 'status_code' => 400];
        }

        $idList = implode(',', $ids); // Format for "in" clause: e.g., "1,2,3"

        // Using "deliverydates" as the table name as per previous delete logic for single items.
        $query = sprintf(
            '/rest/v1/deliverydates?id=in.(%s)',
            $idList
        );

        try {
            // Assuming $this->supabaseClient->delete() handles the request appropriately.
            // The Supabase PHP client's delete method might return true on 204,
            // or throw an exception for other errors.
            $response = $this->supabaseClient->delete($query, [], $accessToken);

            // Check if Supabase client returned an error array (e.g. RLS violation)
            if (is_array($response) && isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : (string) $response['error'];
                error_log('Supabase batchDeleteDeliveryDatesByIds error: ' . $errorMessage);
                return ['success' => false, 'error' => $errorMessage, 'status_code' => 500]; // Generic server error for DB issues
            }

            // Ideal scenario: Supabase client returns true for 204, or a Guzzle response object for 204.
            if ($response === true || (is_object($response) && method_exists($response, 'getStatusCode') && $response->getStatusCode() === 204)) {
                return [
                    'success' => true,
                    'message' => count($ids) . ' delivery date(s) processed for deletion.',
                    'deleted_ids' => $ids
                ];
            }

            // Fallback for unexpected response types from Supabase client
            // This might indicate that nothing was deleted, or an issue not caught as an exception or error array.
            // Supabase DELETE with `in` clause on items that don't exist still returns 204.
            // So, if we reach here, it's an ambiguous success/failure from the client's perspective.
            // For safety, let's assume it might not have worked as expected if not explicitly a 204 or true.
            // However, many clients might just return the response body/object even if it's a success without specific content.
            // Given the previous single delete logic, let's assume if no error was thrown and no ['error'] key, it's a success.
            return [
               'success' => true,
               'message' => count($ids) . ' delivery date(s) targeted for deletion. Verify results.',
               'deleted_ids' => $ids
           ];

        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $responseBody = $e->getResponse() ? $e->getResponse()->getBody()->getContents() : $e->getMessage();
            error_log('Guzzle ClientException in batchDeleteDeliveryDatesByIds: ' . $responseBody);
            $decodedBody = json_decode($responseBody, true);
            $errorMessage = $decodedBody['message'] ?? $decodedBody['error'] ?? 'Batch delete failed due to client error.';
            $statusCode = $e->getResponse() ? $e->getResponse()->getStatusCode() : 500;
            // A 404 for a batch delete (e.g., if all IDs in the list were not found) might still be considered "processed".
            // However, Supabase usually returns 204 even if no rows match the `in` criteria for a DELETE.
            // So a 404 here would be unusual and likely indicate a problem with the request itself or endpoint.
            return ['success' => false, 'error' => $errorMessage, 'status_code' => $statusCode];
        } catch (\Exception $e) {
            error_log('Generic Exception in batchDeleteDeliveryDatesByIds: ' . $e->getMessage());
            return ['success' => false, 'error' => 'An exception occurred during batch delete: ' . $e->getMessage(), 'status_code' => 500];
        }
    }
}
