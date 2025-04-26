<?php
declare(strict_types=1);

namespace Molagis\Shared;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;

class SupabaseClient
{
    private Client $client;
    private string $baseUrl;
    private string $apiKey;

    public function __construct(string $baseUrl, string $apiKey)
    {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
        $this->client = new Client([
            'base_uri' => $baseUrl,
            'headers' => [
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Melakukan GET request ke endpoint Supabase.
     * @param string $endpoint Endpoint API (misalnya, '/rest/v1/couriers')
     * @param array $options Opsi tambahan untuk Guzzle (misalnya, headers)
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function get(string $endpoint, array $options = [], ?string $accessToken = null): array
    {
        try {
            // Tambahkan header Authorization jika accessToken tersedia
            if ($accessToken) {
                $options['headers'] = array_merge(
                    $options['headers'] ?? [],
                    ['Authorization' => "Bearer $accessToken"]
                );
            }
            $response = $this->client->get($endpoint, $options);
            return [
                'data' => json_decode((string) $response->getBody(), true),
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase request error: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Gagal mengambil data: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Melakukan POST request ke endpoint Supabase.
     * @param string $endpoint Endpoint API (misalnya, '/auth/v1/token')
     * @param array $data Data JSON untuk body
     * @param array $options Opsi tambahan untuk Guzzle
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array|null, 'error' => string|null]
     */
    public function post(string $endpoint, array $data, array $options = [], ?string $accessToken = null): array
    {
        try {
            // Tambahkan header Authorization jika accessToken tersedia
            if ($accessToken) {
                $options['headers'] = array_merge(
                    $options['headers'] ?? [],
                    ['Authorization' => "Bearer $accessToken"]
                );
            }
            $response = $this->client->post($endpoint, array_merge([
                'json' => $data,
            ], $options));
            return [
                'data' => json_decode((string) $response->getBody(), true),
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase request error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Gagal memproses permintaan: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Melakukan PATCH request ke endpoint Supabase untuk memperbarui data.
     * @param string $endpoint Endpoint API (misalnya, '/rest/v1/couriers?id=eq.1')
     * @param array $data Data JSON untuk body
     * @param array $options Opsi tambahan untuk Guzzle
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array|null, 'error' => string|null]
     */
    public function update(string $endpoint, array $data, array $options = [], ?string $accessToken = null): array
    {
        try {
            // Tambahkan header Authorization jika accessToken tersedia
            if ($accessToken) {
                $options['headers'] = array_merge(
                    $options['headers'] ?? [],
                    ['Authorization' => "Bearer $accessToken"]
                );
            }
            $response = $this->client->patch($endpoint, array_merge([
                'json' => $data,
            ], $options));
            return [
                'data' => json_decode((string) $response->getBody(), true),
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase update error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Gagal memperbarui data: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Melakukan DELETE request ke endpoint Supabase untuk menghapus data.
     * @param string $endpoint Endpoint API (misalnya, '/rest/v1/couriers?id=eq.1')
     * @param array $options Opsi tambahan untuk Guzzle
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array|null, 'error' => string|null]
     */
    public function delete(string $endpoint, array $options = [], ?string $accessToken = null): array
    {
        try {
            // Tambahkan header Authorization jika accessToken tersedia
            if ($accessToken) {
                $options['headers'] = array_merge(
                    $options['headers'] ?? [],
                    ['Authorization' => "Bearer $accessToken"]
                );
            }
            $response = $this->client->delete($endpoint, $options);
            return [
                'data' => json_decode((string) $response->getBody(), true),
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase delete error: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => 'Gagal menghapus data: ' . $e->getMessage(),
            ];
        }
    }
}