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

    /**
     * Mengambil daftar kur灣 aktif dari Supabase untuk dropdown di semua halaman.
     * @param string|null $accessToken Token akses pengguna untuk autentikasi RLS
     * @return array ['data' => array, 'error' => string|null]
     */
    public function getActiveCouriers(?string $accessToken = null): array
    {
        return $this->supabaseClient->get('/rest/v1/couriers?select=id,nama&aktif=eq.true', [], $accessToken);
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