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
                // Sort all deliveries by delivery_tanggal descending
                usort($allDeliveries, function($a, $b) {
                    return strcmp($b['delivery_tanggal'], $a['delivery_tanggal']);
                });
            }
            return ['data' => $allDeliveries, 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getDeliveriesByCustomerId: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching customer deliveries: ' . $e->getMessage()];
        }
    }

    /**
     * Mengambil jumlah total pesanan (orders) untuk pelanggan tertentu.
     *
     * @param int $customerId ID pelanggan.
     * @param string|null $accessToken Token akses pengguna.
     * @return array Hasil yang berisi 'count' atau 'error'.
     */
    public function getOrdersCountByCustomerId(int $customerId, ?string $accessToken): array
    {
        if (!$accessToken) {
            // Consistent with getDeliveriesCountByCustomerId, but consider if this check is always needed
            // If service methods are always called after auth, this might be redundant.
            // For now, keeping it for consistency.
            return ['count' => 0, 'error' => 'Authentication required.'];
        }

        try {
            // Construct the endpoint for Supabase REST API to count orders for a specific customer.
            // We need to use `Prefer: count=exact` header for Supabase to return only the count.
            $endpoint = sprintf('/rest/v1/orders?customer_id=eq.%d', $customerId);

            // Options for SupabaseClient: specify that we want only the count.
            // The exact way to do this depends on the SupabaseClient implementation.
            // Assuming it supports passing headers or specific options for count.
            // A common way is to use the 'Prefer' header.
            $options = [
                'headers' => [
                    'Prefer' => 'count=exact'
                ]
            ];

            // Make the GET request using the SupabaseClient.
            // The response, when 'Prefer: count=exact' is used, might not be in ['data'].
            // It's often in the 'Content-Range' header or a specific part of the response body.
            // Let's assume the client is set up to parse this or Supabase returns it in a specific way.
            // If the client's GET method doesn't directly support getting count from headers,
            // we might need to fetch a minimal set of data and count it, or use a specific count method if available.

            // Alternative: If 'Prefer: count=exact' directly returns count in 'data' or a 'count' field by the client:
            // $response = $this->supabaseClient->get($endpoint . '&select=id', [], $accessToken); // Select minimal field
            // if ($response['error']) { ... }
            // return ['count' => count($response['data']), 'error' => null];
            // This alternative is less efficient as it fetches data.

            // Let's try to rely on a Supabase feature for direct count.
            // The Supabase PHP client might have a specific way to handle counts.
            // The `get` method of the generic SupabaseClient used here might return the full response object
            // when headers are passed, allowing us to inspect `Content-Range`.

            // Simpler approach if `Prefer: count=exact` is not easily usable with current client `get` for count extraction:
            // Fetch only IDs and count them. This is less efficient but simpler to implement with a generic GET.
            $queryForCount = sprintf('/rest/v1/orders?customer_id=eq.%d&select=id', $customerId);
            $response = $this->supabaseClient->get($queryForCount, [], $accessToken);

            if (isset($response['error'])) {
                $errorMessage = is_array($response['error']) ? json_encode($response['error']) : $response['error'];
                error_log("Supabase error in getOrdersCountByCustomerId for customer $customerId: " . $errorMessage);
                return ['count' => 0, 'error' => $errorMessage];
            }

            if (isset($response['data']) && is_array($response['data'])) {
                return ['count' => count($response['data']), 'error' => null];
            } else {
                error_log("Unexpected response data structure in getOrdersCountByCustomerId for customer $customerId: " . json_encode($response));
                return ['count' => 0, 'error' => 'Unexpected data structure when fetching orders count.'];
            }

        } catch (\Exception $e) {
            error_log("Generic exception in getOrdersCountByCustomerId for customer $customerId: " . $e->getMessage());
            return ['count' => 0, 'error' => 'An unexpected error occurred while fetching orders count.'];
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
            $endpoint = "/rest/v1/deliverydates?select=*,orders!inner(customer_id)&orders.customer_id=eq.{$customerId}";

            // Make the GET request using the custom SupabaseClient
            $response = $this->supabaseClient->get($endpoint, [], $accessToken);

            // Check for errors from the SupabaseClient
            if ($response['error']) {
                error_log("Supabase error in getDeliveriesCountByCustomerId: " . $response['error']);
                return ['count' => 0, 'error' => $response['error']];
            }

            // The response['data'] will be an array of deliverydate records.
            // The count of these records is the number of deliveries for the customer.
            if (isset($response['data']) && is_array($response['data'])) {
                return ['count' => count($response['data']), 'error' => null];
            } else {
                // This case should ideally not be reached if SupabaseClient normalizes errors.
                // If $response['data'] is not an array or not set, but no error was flagged.
                error_log("Unexpected response data structure in getDeliveriesCountByCustomerId: " . json_encode($response));
                return ['count' => 0, 'error' => 'Unexpected data structure when fetching count.'];
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

    /**
     * Fetches all necessary data for editing a specific delivery date.
     *
     * @param int $deliveryId The ID of the deliverydates record.
     * @param string|null $accessToken User's access token.
     * @return array Result array with 'success', 'data' or 'error', and 'status_code'.
     */
    public function getDeliveryDataForEdit(int $deliveryId, ?string $accessToken = null): array
    {
        try {
            // 1. Fetch the main deliverydates record
            $deliveryFields = [
                'id', 'order_id', 'tanggal', 'kurir_id', 'ongkir',
                'item_tambahan', 'harga_tambahan', 'harga_modal_tambahan',
                'total_harga_perhari', 'total_modal_perhari', 'status',
                'kitchen_note', 'courier_note' // Added new note fields
            ];
            $deliveryDateQuery = sprintf(
                '/rest/v1/deliverydates?id=eq.%d&select=%s,orders(customer_id,notes)',
                $deliveryId,
                implode(',', $deliveryFields)
            );
            $deliveryDateResponse = $this->supabaseClient->get($deliveryDateQuery, [], $accessToken);

            if (isset($deliveryDateResponse['error']) || empty($deliveryDateResponse['data'])) {
                $errorMsg = isset($deliveryDateResponse['error']) ? (is_array($deliveryDateResponse['error']) ? json_encode($deliveryDateResponse['error']) : $deliveryDateResponse['error']) : 'Delivery date not found.';
                error_log('Supabase error fetching deliverydate for edit: ' . $errorMsg);
                return ['success' => false, 'error' => $errorMsg, 'status_code' => isset($deliveryDateResponse['error']) ? 500 : 404];
            }
            $deliveryData = $deliveryDateResponse['data'][0];

            // 2. Fetch associated orderdetails with paket information
            $orderDetailsQuery = sprintf(
                '/rest/v1/orderdetails?delivery_id=eq.%d&select=*,paket(id,nama,harga_jual,harga_modal)',
                $deliveryId
            );
            $orderDetailsResponse = $this->supabaseClient->get($orderDetailsQuery, [], $accessToken);

            if (isset($orderDetailsResponse['error'])) {
                $errorMsg = is_array($orderDetailsResponse['error']) ? json_encode($orderDetailsResponse['error']) : $orderDetailsResponse['error'];
                error_log('Supabase error fetching orderdetails for edit: ' . $errorMsg);
                return ['success' => false, 'error' => $errorMsg, 'status_code' => 500];
            }
            $deliveryData['details'] = $orderDetailsResponse['data'] ?? [];

            // 3. Fetch list of all active couriers
            $couriersResponse = $this->supabaseClient->get('/rest/v1/couriers?aktif=eq.true&select=id,nama', [], $accessToken);
            if (isset($couriersResponse['error'])) {
                // Log error but don't necessarily fail the whole request if couriers are optional for display
                error_log('Supabase error fetching couriers for edit: ' . json_encode($couriersResponse['error']));
                $deliveryData['available_couriers'] = [];
            } else {
                $deliveryData['available_couriers'] = $couriersResponse['data'] ?? [];
            }

            // 4. Fetch list of all pakets
            $paketsResponse = $this->supabaseClient->get('/rest/v1/paket?select=id,nama,harga_jual,harga_modal,urutan&order=urutan.asc,nama.asc', [], $accessToken);
            if (isset($paketsResponse['error'])) {
                $errorMsg = is_array($paketsResponse['error']) ? json_encode($paketsResponse['error']) : $paketsResponse['error'];
                error_log('Supabase error fetching pakets for edit: ' . $errorMsg);
                return ['success' => false, 'error' => 'Failed to fetch package list: ' . $errorMsg, 'status_code' => 500];
            }
            $deliveryData['available_pakets'] = $paketsResponse['data'] ?? [];

            return ['success' => true, 'data' => $deliveryData];

        } catch (\Exception $e) {
            error_log('Generic Exception in getDeliveryDataForEdit for ID ' . $deliveryId . ': ' . $e->getMessage());
            return ['success' => false, 'error' => 'An exception occurred: ' . $e->getMessage(), 'status_code' => 500];
        }
    }

    /**
     * Updates delivery details, associated orderdetails, and potentially the parent order's total.
     *
     * @param int $deliveryId The ID of the deliverydates record to update.
     * @param array $data The form data from the edit modal. Expected keys:
     *                    'tanggal', 'kurir_id', 'ongkir', 'item_tambahan', 'harga_tambahan', 'harga_modal_tambahan',
     *                    'package_items' => [ [ 'order_detail_id' (optional), 'paket_id', 'jumlah', 'catatan_dapur', 'catatan_kurir' ], ... ]
     * @param string|null $accessToken User's access token.
     * @return array Result array with 'success', 'message' or 'error', and 'status_code'.
     */
    public function updateDeliveryAndOrderDetails(int $deliveryId, array $data, ?string $accessToken = null): array
    {
    try {
        // 0. Fetch the order_id for the given deliveryId.
        // This is needed for the final step of updating the parent order's total_harga.
        // It's better to fetch it before the main RPC call in case the RPC modifies or deletes the delivery record in an unexpected way.
        $orderIdQuery = sprintf('/rest/v1/deliverydates?id=eq.%d&select=order_id', $deliveryId);
        $orderIdResponse = $this->supabaseClient->get($orderIdQuery, [], $accessToken);

        if (isset($orderIdResponse['error']) || empty($orderIdResponse['data'])) {
            $errorMsg = 'Failed to fetch order_id for the given delivery_id before update. Error: ' . json_encode($orderIdResponse['error'] ?? 'Delivery record not found or no order_id.');
            error_log($errorMsg);
            return ['success' => false, 'error' => 'Internal error: Could not verify parent order.', 'status_code' => 404]; // Or 500
        }
        $orderId = $orderIdResponse['data'][0]['order_id'];

        // 1. Prepare the 'request' JSONB payload for the RPC
        $rpcRequestPayload = [
            'tanggal' => $data['tanggal'] ?? null, // RPC casts to DATE
            'kurir_id' => !empty($data['kurir_id']) ? (int)$data['kurir_id'] : null, // RPC casts to BIGINT
            'ongkir' => isset($data['ongkir']) ? (float)$data['ongkir'] : 0, // RPC casts to INTEGER or NUMERIC
            'item_tambahan' => $data['item_tambahan'] ?? null,
            'harga_tambahan' => isset($data['harga_tambahan']) ? (float)$data['harga_tambahan'] : 0, // RPC casts to NUMERIC
            'harga_modal_tambahan' => isset($data['harga_modal_tambahan']) ? (float)$data['harga_modal_tambahan'] : 0, // RPC casts to NUMERIC
            'daily_kitchen_note' => $data['daily_kitchen_note'] ?? null,
            'daily_courier_note' => $data['daily_courier_note'] ?? null,
            'package_items' => [], // Initialize to empty array
        ];

        // Populate package_items, ensuring correct structure
        $submittedPackageItems = $data['package_items'] ?? [];
        foreach ($submittedPackageItems as $item) {
            // Basic validation for essential package item fields
            if (empty($item['paket_id']) || !isset($item['jumlah']) || ((int)$item['jumlah'] <= 0)) {
                // Optionally, throw an exception or collect errors if strict validation is needed here
                // For now, consistent with previous logic, we might just log and skip,
                // but RPC might be stricter. It's better if frontend ensures this.
                error_log("Skipping invalid package item in RPC payload prep: " . json_encode($item));
                continue;
            }
            $rpcRequestPayload['package_items'][] = [
                // order_detail_id is BIGINT in RPC, ensure it's null if not provided or empty
                'order_detail_id' => !empty($item['order_detail_id']) ? (int)$item['order_detail_id'] : null,
                'paket_id' => (int)$item['paket_id'], // RPC casts to BIGINT
                'jumlah' => (int)$item['jumlah'],     // RPC casts to INTEGER
                'catatan_dapur' => $item['catatan_dapur'] ?? null,
                'catatan_kurir' => $item['catatan_kurir'] ?? null,
            ];
        }

        // 2. Call the 'update_daily_order' RPC function directly
        $rpcParams = [
            'p_delivery_id' => $deliveryId,
            'request' => $rpcRequestPayload
        ];
        $rpcResult = $this->supabaseClient->rpc(
            'update_daily_order',
            $rpcParams,
            [], // options
            $accessToken
        );

        // 3. Handle Result from RPC call
        if (!empty($rpcResult['error'])) {
            $errorMessage = 'Supabase RPC update_daily_order failed.';
            $supError = $rpcResult['error'];
            $statusCode = (isset($rpcResult['status']) && is_int($rpcResult['status']) && $rpcResult['status'] >= 400) ? $rpcResult['status'] : 500;

            if (is_array($supError) && isset($supError['message'])) {
                $errorMessage .= ' Details: ' . $supError['message'];
            } elseif (is_string($supError)) {
                $errorMessage .= ' Details: ' . $supError;
            }
            error_log('Supabase RPC update_daily_order error for delivery_id ' . $deliveryId . ': ' . json_encode($supError));
            // Directly return the structured error. The controller will handle this.
            return ['success' => false, 'error' => $errorMessage, 'status_code' => $statusCode];
        }
        
        // If RPC is successful (no error), proceed. $rpcResult['data'] might be null for VOID functions.
        // The success message for the overall operation.
        $overallSuccessMessage = 'Order updated successfully via service.'; // Default message from old updateDailyOrderRpc

        // 4. Update the parent orders.total_harga (if RPC was successful)
        // This logic remains similar to before, relying on triggers having updated deliverydates.total_harga_perhari
        if ($orderId) {
            $allDeliveriesForOrderQuery = sprintf(
                '/rest/v1/deliverydates?order_id=eq.%d&select=total_harga_perhari',
                $orderId
            );
            $allDeliveriesResponse = $this->supabaseClient->get($allDeliveriesForOrderQuery, [], $accessToken);

            if (isset($allDeliveriesResponse['error'])) {
                // Log this error but don't fail the entire operation if the main RPC succeeded.
                // The order total might become out of sync. This might need a more robust solution later.
                error_log("Failed to fetch all delivery dates for order ID {$orderId} to update order total after RPC: " . json_encode($allDeliveriesResponse['error']));
            } else {
                $newOrderTotalHarga = 0;
                foreach ($allDeliveriesResponse['data'] as $d) {
                    $newOrderTotalHarga += ($d['total_harga_perhari'] ?? 0);
                }
                $updateOrderQuery = '/rest/v1/orders?id=eq.' . $orderId;
                // Corrected to use update() method, and pass empty array for options
                $orderUpdateResponse = $this->supabaseClient->update($updateOrderQuery, ['total_harga' => $newOrderTotalHarga], [], $accessToken);
                if (isset($orderUpdateResponse['error'])) {
                    error_log("Failed to update total_harga for order ID {$orderId} after RPC: " . json_encode($orderUpdateResponse['error']));
                    // Don't throw an exception here to ensure the main success message is returned.
                }
            }
        } else {
            error_log("No order_id found for delivery_id {$deliveryId}, cannot update parent order total.");
        }
        
        return ['success' => true, 'message' => $overallSuccessMessage];

    } catch (\Exception $e) {
        // This catch block now handles errors from pre-RPC (order_id fetch), direct RPC call, or post-RPC logic (order total update)
        error_log("Exception in updateDeliveryAndOrderDetails for delivery ID {$deliveryId}: " . $e->getMessage() . " - Trace: " . $e->getTraceAsString());
        return ['success' => false, 'error' => 'Service error: ' . $e->getMessage(), 'status_code' => 500];
    }
    }
    // The updateDailyOrderRpc method was here and is now removed.

    public function getGroupedDeliveriesByCustomerId(int $customerId, ?string $accessToken = null, int $limit = 100, int $offset = 0): array
    {
        // Fetch orders with their delivery dates.
        // Request delivery dates to be ordered by tanggal.desc directly in the query.
        $selectFields = 'id,tanggal_pesan,total_harga,metode_pembayaran,notes,customers(nama),deliverydates!inner(id,tanggal,status,ongkir,item_tambahan,harga_tambahan,total_harga_perhari,couriers(nama),orderdetails(id,jumlah,subtotal_harga,catatan_dapur,catatan_kurir,paket(nama)),order=tanggal.desc)';

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
                error_log('Supabase getGroupedDeliveriesByCustomerId error: ' . $errorMessage);
                return ['data' => [], 'error' => $errorMessage];
            }

            return ['data' => $response['data'] ?? [], 'error' => null];

        } catch (\Exception $e) {
            error_log('Exception in getGroupedDeliveriesByCustomerId: ' . $e->getMessage());
            return ['data' => [], 'error' => 'Exception occurred while fetching grouped customer deliveries: ' . $e->getMessage()];
        }
    }
}
