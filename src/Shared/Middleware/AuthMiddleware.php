<?php
declare(strict_types=1);

namespace Molagis\Shared\Middleware;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Laminas\Diactoros\Response\RedirectResponse;
use Molagis\Shared\SupabaseService;

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
        // 1. Check session token
        if (!isset($_SESSION['user_token'])) {
            return $this->handleUnauthorized($request);
        }

        // 2. Verify token
        $user = $this->supabase->getUser($_SESSION['user_token']);
        if (!$user) {
            return $this->handleTokenRefresh($request, $next);
        }

        // 3. Attach user data to request
        return $next($request->withAttribute('user', $user));
    }

    private function handleTokenRefresh(
        ServerRequestInterface $request,
        callable $next
    ): ResponseInterface {
        if (!$this->hasRefreshToken()) {
            return $this->handleUnauthorized($request);
        }
    
        return $this->attemptTokenRefresh($request, $next);
    }
    
    private function hasRefreshToken(): bool
    {
        return isset($_COOKIE['refresh_token']) || isset($_SESSION['refresh_token']);
    }
    
    private function attemptTokenRefresh(
        ServerRequestInterface $request,
        callable $next
    ): ResponseInterface {
        $lock = $this->createLockFile();
        
        if (!$this->acquireLock($lock)) {
            return $this->handleUnauthorized($request, true);
        }
    
        try {
            return $this->processTokenRefresh($request, $next);
        } catch (\Exception $e) {
            $this->logRefreshError($e);
            return $this->handleUnauthorized($request, true);
        } finally {
            $this->releaseLock($lock);
        }
    }
    
    private function createLockFile()
    {
        $lockPath = sys_get_temp_dir() . '/supabase_refresh.lock';
        return fopen($lockPath, 'w+');
    }
    
    private function acquireLock($lock): bool
    {
        return flock($lock, LOCK_EX);
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

            return $next($request);
        } catch (\Exception $e) {
            $this->logRefreshError($e);
            $message = strpos($e->getMessage(), 'Invalid refresh token') !== false
                ? 'Refresh token telah kedaluwarsa'
                : 'Gagal memperbarui sesi';
            return $this->handleUnauthorized($request, true, $message);
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
    
    private function releaseLock($lock): void
    {
        flock($lock, LOCK_UN);
        fclose($lock);
    }

    private function handleUnauthorized(
        ServerRequestInterface $request,
        bool $destroySession = false,
        string $message = 'Sesi telah kadaluarsa'
    ): ResponseInterface {
        if ($destroySession) {
            session_unset();
            session_destroy();
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

    /**
     * Ambil refresh token dari cookie atau sesi dan dekripsi jika perlu.
     * @return string Refresh token yang telah didekripsi.
     * @throws \RuntimeException Jika refresh token tidak valid atau gagal didekripsi.
     */
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

    /**
     * Enkripsi data menggunakan AES-256-CBC.
     * @param string $data Data yang akan dienkripsi.
     * @return string Data terenkripsi dalam format base64.
     */
    private function encrypt(string $data): string
    {
        $key = $_ENV['ENCRYPTION_KEY'] ?? 'aBKUnE8J7jCfUFv7zwfdXQuePyWDSUMh'; // Ganti dengan kunci aman dari env
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
        return base64_encode($encrypted . '::' . $iv);
    }

    /**
     * Dekripsi data yang dienkripsi dengan AES-256-CBC.
     * @param string $encrypted Data terenkripsi dalam format base64.
     * @return string Data yang telah didekripsi.
     * @throws \RuntimeException Jika dekripsi gagal.
     */
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