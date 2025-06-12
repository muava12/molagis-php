<?php

declare(strict_types=1);

namespace Molagis\Shared;

class SupabaseService
{
    private SupabaseClient $supabaseClient;

    public function __construct(SupabaseClient $supabaseClient)
    {
        $this->supabaseClient = $supabaseClient;
    }

    public function signIn(string $email, string $password): array
    {
        $response = $this->supabaseClient->post('/auth/v1/token?grant_type=password', [
            'email' => $email,
            'password' => $password,
        ]);

        if ($response['error']) {
            if (str_contains($response['error'], '400')) {
                throw new \InvalidArgumentException('Email atau kata sandi salah');
            }
            throw new \RuntimeException('Gagal autentikasi: ' . $response['error']);
        }

        return $response['data'] ?? [];
    }

    public function getUser(string $accessToken): ?array
    {
        $response = $this->supabaseClient->get('/auth/v1/user', [
            'headers' => [
                'Authorization' => "Bearer $accessToken",
            ],
        ]);

        return $response['error'] ? null : $response['data'];
    }

    public function getUserWithConnectionCheck(string $accessToken): array
    {
        $response = $this->supabaseClient->get('/auth/v1/user', [
            'headers' => [
                'Authorization' => "Bearer $accessToken",
            ],
        ]);

        // Check if error is due to connection issues
        $connectionError = $response['error'] && 
            (str_contains($response['error'], 'Koneksi internet bermasalah') ||
             str_contains($response['error'], 'connection') ||
             str_contains($response['error'], 'timeout'));

        return [
            'user' => $response['error'] ? null : $response['data'],
            'connection_error' => $connectionError,
            'error' => $response['error']
        ];
    }

    /**
     * Mengambil daftar kur灣 aktif dari Supabase untuk dropdown di semua halaman.
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getActiveCouriers(?string $accessToken = null): array
    {
        return $this->supabaseClient->get('/rest/v1/couriers?select=id,nama,color&aktif=eq.true', [], $accessToken);
    }

    /**
     * Mengambil data berdasarkan ID dari tabel tertentu.
     * @param string $table Nama tabel di Supabase
     * @param string $id ID data yang akan diambil
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array|null, 'error' => string|null]
     */
    public function fetchById(string $table, string $id, ?string $accessToken = null): array
    {
        try {
            // Validasi input
            if (empty($table) || empty($id)) {
                throw new \InvalidArgumentException('Table name and ID are required');
            }

            // Buat query untuk mengambil data berdasarkan ID
            $response = $this->supabaseClient->get(
                "/rest/v1/{$table}?id=eq.{$id}&select=*",
                [],
                $accessToken
            );

            if ($response['error']) {
                return [
                    'data' => null,
                    'error' => $response['error'],
                ];
            }

            // Ambil data pertama (karena query berdasarkan ID seharusnya unik)
            $data = $response['data'][0] ?? null;

            return [
                'data' => $data,
                'error' => null,
            ];
        } catch (\InvalidArgumentException $e) {
            error_log('Invalid argument in fetchById: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            error_log('Error fetching data by ID: ' . $e->getMessage());
            return [
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function signOut(string $accessToken): void
    {
        $response = $this->supabaseClient->post('/auth/v1/logout', [], [
            'headers' => [
                'Authorization' => "Bearer $accessToken",
            ],
        ]);

        if ($response['error']) {
            throw new \RuntimeException('Gagal logout: ' . $response['error']);
        }
    }

    public function refreshToken(string $refreshToken): ?array
    {
        $response = $this->supabaseClient->post('/auth/v1/token?grant_type=refresh_token', [
            'refresh_token' => $refreshToken,
        ]);

        return $response['error'] ? null : $response['data'];
    }
}
