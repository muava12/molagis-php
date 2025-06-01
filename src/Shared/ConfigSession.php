<?php
declare(strict_types=1);

namespace Molagis\Shared;

class ConfigSession
{
    public static function init(): void
    {
        // Session configuration
        $sessionConfig = [
            'lifetime' => (int) ($_ENV['SESSION_LIFETIME'] ?? 7 * 24 * 60 * 60), // Default 7 hari
            'path' => '/',
            'secure' => true, // Hanya HTTPS
            'httponly' => true, // Cegah akses JavaScript
            'samesite' => 'Strict', // Cegah CSRF
        ];

        // Set session parameters before starting session
        if (session_status() === PHP_SESSION_NONE) {
            error_log('Session is not started, initializing session with config: ' . json_encode($sessionConfig));
            session_set_cookie_params($sessionConfig);
            ini_set('session.gc_maxlifetime', (string) $sessionConfig['lifetime']);
            ini_set('session.cookie_lifetime', (string) $sessionConfig['lifetime']);
            session_start();
        }
    }

    // public static function getSupabaseConfig(): array
    // {
    //     return [
    //         'url' => $_ENV['SUPABASE_URL'] ?? '',
    //         'api_key' => $_ENV['SUPABASE_APIKEY'] ?? '',
    //     ];
    // }

    // public static function getSupabaseJWTSecret(): string
    // {
    //     return $_ENV['SUPABASE_JWT_SECRET'] ?? '';
    // }

    // public static function getEncryptionKey(): string
    // {
    //     return $_ENV['ENCRYPTION_KEY'] ?? 'invalidKey'; // Pastikan kunci unik di .env
    // }

    public static function getSessionLifetime(bool $rememberMe = false): int
    {
        return $rememberMe ? (int) ($_ENV['SESSION_LIFETIME'] ?? 7 * 24 * 60 * 60) : 0;
    }
}