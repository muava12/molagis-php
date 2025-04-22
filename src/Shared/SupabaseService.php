<?php
declare(strict_types=1);

namespace Molagis\Shared;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;

class SupabaseService
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

    public function signIn(string $email, string $password): ?array
    {
        try {
            $response = $this->client->post('/auth/v1/token?grant_type=password', [
                'json' => [
                    'email' => $email,
                    'password' => $password,
                ],
            ]);
            return json_decode((string) $response->getBody(), true);
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            throw new \RuntimeException('Koneksi internet bermasalah, silakan cek koneksi Anda');
        } catch (RequestException $e) {
            error_log('Supabase auth error: ' . $e->getMessage());
            if ($e->getCode() === 400) {
                throw new \InvalidArgumentException('Email atau kata sandi salah');
            }
            throw new \RuntimeException('Gagal autentikasi: ' . $e->getMessage());
        }
    }

    public function getUser(string $accessToken): ?array
    {
        try {
            $response = $this->client->get('/auth/v1/user', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                ],
            ]);
            $body = (string) $response->getBody();
            return json_decode($body, true);
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return null;
        } catch (RequestException $e) {
            error_log('Supabase user fetch error: ' . $e->getMessage());
            return null;
        }
    }

    public function getActiveCouriers(): array
    {
        try {
            $response = $this->client->get('/rest/v1/couriers?select=id,nama&aktif=eq.true');
            return [
                'data' => json_decode((string) $response->getBody(), true),
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Gagal mengambil data kurir, koneksi internet bermasalah',
            ];
        } catch (RequestException $e) {
            error_log('Supabase couriers fetch error: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Gagal mengambil data kurir: ' . $e->getMessage(),
            ];
        }
    }

    public function getDeliveriesByDate(string $date): array
    {
        try {
            // Validasi format tanggal YYYY-MM-DD
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new \InvalidArgumentException('Format tanggal tidak valid');
            }
            $response = $this->client->get("/rest/v1/deliverydates?select=kurir_id,couriers(nama),status&tanggal=eq.{$date}&status=neq.canceled");
            $data = json_decode((string) $response->getBody(), true);

            // Kelompokkan per kurir dan hitung jumlah pengantaran serta selesai
            $deliveries = [];
            $courierMap = [];
            foreach ($data as $delivery) {
                $kurirId = $delivery['kurir_id'] ?? null;
                if ($kurirId && isset($delivery['couriers']['nama'])) {
                    if (!isset($courierMap[$kurirId])) {
                        $courierMap[$kurirId] = [
                            'kurir_id' => $kurirId,
                            'courier_name' => $delivery['couriers']['nama'],
                            'jumlah_pengantaran' => 0,
                            'jumlah_selesai' => 0,
                        ];
                    }
                    $courierMap[$kurirId]['jumlah_pengantaran']++;
                    if ($delivery['status'] === 'completed') {
                        $courierMap[$kurirId]['jumlah_selesai']++;
                    }
                }
            }
            $deliveries = array_values($courierMap);
            $total = array_sum(array_column($deliveries, 'jumlah_pengantaran'));

            return [
                'data' => $deliveries,
                'total' => $total,
                'error' => null,
            ];
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            return [
                'data' => [],
                'total' => 0,
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase deliveries fetch error: ' . $e->getMessage());
            return [
                'data' => [],
                'total' => 0,
                'error' => 'Gagal mengambil data pengantaran: ' . $e->getMessage(),
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid date format: ' . $e->getMessage());
            return [
                'data' => [],
                'total' => 0,
                'error' => 'Format tanggal tidak valid',
            ];
        }
    }

    public function signOut(string $accessToken): void
    {
        try {
            $this->client->post('/auth/v1/logout', [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}",
                ],
            ]);
        } catch (ConnectException $e) {
            error_log('Supabase connection error: ' . $e->getMessage());
            throw new \RuntimeException('Koneksi internet bermasalah, silakan cek koneksi Anda');
        } catch (RequestException $e) {
            error_log('Supabase logout error: ' . $e->getMessage());
            throw new \RuntimeException('Gagal logout: ' . $e->getMessage());
        }
    }
}