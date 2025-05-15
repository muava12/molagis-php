<?php
declare(strict_types=1);

namespace Molagis\Shared\Middleware;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Laminas\Diactoros\Response\RedirectResponse;
use Molagis\Shared\SupabaseService;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware
{
    public function __construct(
        private SupabaseService $supabase,
        private string $loginPath = '/login'
    ) {}

    public function __invoke(
        ServerRequestInterface $request,
        callable $next
    ): ResponseInterface {
        // 1. Periksa apakah ada access_token di sesi
        if (!isset($_SESSION['user_token'])) {
            // Coba refresh menggunakan cookie jika ada
            return $this->handleTokenRefresh($request, $next);
        }

        $accessToken = $_SESSION['user_token'];

        // 2. Verifikasi token kadaluarsa secara lokal
        if ($this->isTokenExpired($accessToken)) {
            return $this->handleTokenRefresh($request, $next);
        }

        // 3. Verifikasi token dengan Supabase
        $user = $this->supabase->getUser($accessToken);
        if (!$user) {
            return $this->handleTokenRefresh($request, $next);
        }

        // 4. Lampirkan data pengguna ke permintaan
        return $next($request->withAttribute('user', $user));
    }

    private function handleTokenRefresh(
        ServerRequestInterface $request,
        callable $next
    ): ResponseInterface {
        if (!$this->hasRefreshToken()) {
            return $this->handleUnauthorized($request);
        }
        error_log('Refresh token found, attempting to refresh session.');
        return $this->processTokenRefresh($request, $next);
    }

    private function hasRefreshToken(): bool
    {
        return isset($_COOKIE['refresh_token']) || isset($_SESSION['refresh_token']);
    }

    private function processTokenRefresh(
        ServerRequestInterface $request,
        callable $next
    ): ResponseInterface {
        try {
            // Ambil refresh token dari cookie atau sesi
            $refreshToken = $this->getRefreshToken();
            $newTokens = $this->supabase->refreshToken($refreshToken);

            if (!$newTokens || !isset($newTokens['access_token'])) {
                throw new \RuntimeException('Gagal memperbarui token: Respon tidak valid dari Supabase');
            }

            // Pastikan sesi dimulai jika belum aktif
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }

            // Simpan token akses baru di sesi
            $_SESSION['user_token'] = $newTokens['access_token'];

            // Perbarui refresh token
            $newRefreshToken = $newTokens['refresh_token'] ?? $refreshToken;
            if (isset($_COOKIE['refresh_token'])) {
                // Jika refresh token berasal dari cookie, perbarui cookie
                $encryptedRefreshToken = $this->encrypt($newRefreshToken);
                setcookie('refresh_token', $encryptedRefreshToken, [
                    'expires' => time() + (60 * 24 * 60 * 60), // 60 hari
                    'path' => '/',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
            } else {
                // Jika refresh token berasal dari sesi, perbarui sesi
                $_SESSION['refresh_token'] = $newRefreshToken;
            }

            // Ambil data pengguna dengan token baru
            $user = $this->supabase->getUser($newTokens['access_token']);
            if (!$user) {
                throw new \RuntimeException('Gagal mengambil data pengguna setelah refresh token');
            }

            // Regenerasi ID sesi untuk keamanan
            session_regenerate_id(true);

            // Lanjutkan dengan permintaan
            return $next($request->withAttribute('user', $user));
        } catch (\Exception $e) {
            $this->logRefreshError($e);
            $message = strpos($e->getMessage(), 'Invalid refresh token') !== false
                ? 'Refresh token telah kedaluwarsa'
                : 'Gagal memperbarui sesi';
            return $this->handleUnauthorized($request, true, $message);
        }
    }

    private function isTokenExpired(string $token): bool
    {
        try {
            $decoded = JWT::decode($token, new Key($_ENV['SUPABASE_JWT_SECRET'], 'HS256'));
            $exp = $decoded->exp ?? 0;
            return time() >= $exp;
        } catch (\Exception $e) {
            error_log('Error decoding JWT: ' . $e->getMessage());
            return true; // Asumsikan kadaluarsa jika tidak bisa dekode
        }
    }

    private function logRefreshError(\Exception $e): void
    {
        error_log(sprintf(
            'Refresh token failed: %s in %s:%d',
            $e->getMessage(),
            $e->getFile(),
            $e->getLine()
        ));
    }

    private function handleUnauthorized(
        ServerRequestInterface $request,
        bool $destroySession = false,
        string $message = 'Sesi telah kadaluarsa'
    ): ResponseInterface {
        if ($destroySession) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_unset();
                session_destroy();
            }
            // Hapus cookie refresh token jika ada
            setcookie('refresh_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Strict'
            ]);
        }

        if ($request->getHeaderLine('X-Requested-With') === 'XMLHttpRequest') {
            return new JsonResponse([
                'error' => 'unauthorized',
                'message' => $message
            ], 401);
        }

        return new RedirectResponse($this->loginPath);
    }

    private function getRefreshToken(): string
    {
        if (isset($_COOKIE['refresh_token'])) {
            return $this->decrypt($_COOKIE['refresh_token']);
        }
        if (isset($_SESSION['refresh_token'])) {
            return $_SESSION['refresh_token'];
        }
        throw new \RuntimeException('Refresh token tidak ditemukan');
    }

    private function encrypt(string $data): string
    {
        $key = $_ENV['ENCRYPTION_KEY'] ?? 'aBKUnE8J7jCfUFv7zwfdXQuePyWDSUMh'; // Ganti dengan kunci aman dari env
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
        if ($encrypted === false) {
            throw new \RuntimeException('Gagal mengenkripsi refresh token');
        }
        return base64_encode($encrypted . '::' . $iv);
    }

    private function decrypt(string $encrypted): string
    {
        $key = $_ENV['ENCRYPTION_KEY'] ?? 'aBKUnE8J7jCfUFv7zwfdXQuePyWDSUMh'; // Ganti dengan kunci aman dari env
        $decoded = base64_decode($encrypted);
        if ($decoded === false) {
            throw new \RuntimeException('Gagal mendekripsi refresh token: Data tidak valid');
        }
        list($encryptedData, $iv) = explode('::', $decoded, 2);
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-cbc', $key, 0, $iv);
        if ($decrypted === false) {
            throw new \RuntimeException('Gagal mendekripsi refresh token: Kunci atau data tidak valid');
        }
        return $decrypted;
    }
}