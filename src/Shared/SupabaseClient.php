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
                'Authorization' => 'Bearer ' . $apiKey,
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Melakukan GET request ke endpoint Supabase.
     * @param string $endpoint Endpoint API (misalnya, '/rest/v1/couriers')
     * @param array $options Opsi tambahan untuk Guzzle (misalnya, headers)
     * @return array ['data' => array, 'error' => string|null]
     */
    public function get(string $endpoint, array $options = []): array
    {
        try {
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
     * @return array ['data' => array|null, 'error' => string|null]
     */
    public function post(string $endpoint, array $data, array $options = []): array
    {
        try {
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
}