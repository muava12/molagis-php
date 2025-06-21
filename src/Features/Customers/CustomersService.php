<?php
declare(strict_types=1);

namespace Molagis\Features\Customers;

use Molagis\Shared\SupabaseClient;

class CustomersService
{
    private SupabaseClient $client;

    public function __construct(SupabaseClient $client)
    {
        $this->client = $client;
    }

    /**
     * Mengambil semua pelanggan dari Supabase.
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getAllCustomers(?string $accessToken = null): array
    {
        return $this->client->get('/rest/v1/customers?select=*,labels(*)&order=nama', [], $accessToken);
    }

    /**
     * Mengambil pelanggan berdasarkan ID dari Supabase.
     * @param string $idFilter Filter ID (misalnya, 'eq.<uuid>')
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getCustomerById(string $idFilter, ?string $accessToken = null): array
    {
        return $this->client->get("/rest/v1/customers?select=*&id=$idFilter", [], $accessToken);
    }

    /**
     * Menambahkan pelanggan baru ke Supabase.
     * @param array $data Data pelanggan
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['error' => string|null]
     */
    public function addCustomer(array $data, ?string $accessToken = null): array
    {
        $customer = [
            'nama' => $data['nama'] ?? null,
            'alamat' => $data['alamat'] ?? null,
            'telepon' => $data['telepon'] ?? null,
            'telepon_alt' => $data['telepon_alt'] ?? null,
            'telepon_pemesan' => $data['telepon_pemesan'] ?? null,
            'maps' => $data['maps'] ?? null,
            'ongkir' => $data['ongkir'] ? (int)$data['ongkir'] : null,
        ];

        if (!$customer['nama']) {
            return ['error' => 'Nama pelanggan diperlukan'];
        }

        return $this->client->post('/rest/v1/customers', $customer, [], $accessToken);
    }

    /**
     * Memperbarui data pelanggan di Supabase.
     * @param string $customerId ID pelanggan
     * @param array $data Data pelanggan
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['error' => string|null]
     */
    public function updateCustomer(string $customerId, array $data, ?string $accessToken = null): array
    {
        $customer = [
            'nama' => $data['nama'] ?? null,
            'alamat' => $data['alamat'] ?? null,
            'telepon' => $data['telepon'] ?? null,
            'telepon_alt' => $data['telepon_alt'] ?? null,
            'telepon_pemesan' => $data['telepon_pemesan'] ?? null,
            'maps' => $data['maps'] ?? null,
            'ongkir' => $data['ongkir'] ? (int)$data['ongkir'] : null,
        ];

        if (!$customer['nama']) {
            return ['error' => 'Nama pelanggan diperlukan'];
        }

        return $this->client->update("/rest/v1/customers?id=eq.{$customerId}", $customer, [], $accessToken);
    }

    /**
     * Menghapus pelanggan dari Supabase.
     * @param string $customerId ID pelanggan
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['error' => string|null]
     */
    public function deleteCustomer(string $customerId, ?string $accessToken = null): array
    {
        return $this->client->delete("/rest/v1/customers?id=eq.{$customerId}", [], $accessToken);
    }

    /**
     * Menambahkan label ke pelanggan.
     * @param array $data ['customer_id' => int, 'label_id' => int]
     * @param string|null $accessToken
     * @return array
     */
    public function addLabelToCustomer(array $data, ?string $accessToken = null): array
    {
        if (empty($data['customer_id']) || empty($data['label_id'])) {
            return ['error' => 'Customer ID dan Label ID diperlukan'];
        }
        return $this->client->post('/rest/v1/customer_labels', $data, [], $accessToken);
    }

    /**
     * Menghapus label dari pelanggan.
     * @param array $data ['customer_id' => int, 'label_id' => int]
     * @param string|null $accessToken
     * @return array
     */
    public function removeLabelFromCustomer(array $data, ?string $accessToken = null): array
    {
        if (empty($data['customer_id']) || empty($data['label_id'])) {
            return ['error' => 'Customer ID dan Label ID diperlukan'];
        }
        $customerId = $data['customer_id'];
        $labelId = $data['label_id'];
        return $this->client->delete("/rest/v1/customer_labels?customer_id=eq.{$customerId}&label_id=eq.{$labelId}", [], $accessToken);
    }

    /**
     * Mengambil semua label dari Supabase.
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getAllLabels(?string $accessToken = null): array
    {
        return $this->client->get('/rest/v1/labels?select=*&order=name', [], $accessToken);
    }
}