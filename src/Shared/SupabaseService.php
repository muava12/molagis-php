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
                'error' => 'Koneksi internet bermasalah, silakan cek koneksi Anda',
            ];
        } catch (RequestException $e) {
            error_log('Supabase couriers fetch error: ' . $e->getMessage());
            return [
                'data' => [],
                'error' => 'Gagal mengambil data kurir: ' . $e->getMessage(),
            ];
        }
    }

    public function signOut(string $accessToken): void
    {
        try {
            $this->client->post('/auth/v1/logout', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
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