<?php
declare(strict_types=1);

namespace Molagis\Features\Auth;

use Molagis\Shared\SupabaseService;
use Twig\Environment;

class AuthController
{
    public function __construct(
        private SupabaseService $supabase,
        private Environment $twig
    ) {}

    public function showLogin(): string
    {
        if (isset($_SESSION['user_token'])) {
            header('Location: /dashboard');
            exit;
        }
        try {
            return $this->twig->render('login.html.twig', ['title' => 'Login Admin Molagis']);
        } catch (\Twig\Error\Error $e) {
            error_log('Twig error in showLogin: ' . $e->getMessage());
            return 'Error rendering login page: ' . htmlspecialchars($e->getMessage());
        }
    }

    public function handleLogin(array $post): string
    {
        try {
            $email = $post['email'] ?? '';
            $password = $post['password'] ?? '';
            $remember = isset($post['remember']) && $post['remember'] === 'on';

            if (empty($email) || empty($password)) {
                throw new \InvalidArgumentException('Email dan kata sandi wajib diisi');
            }

            $response = $this->supabase->signIn($email, $password);

            if (!isset($response['access_token'])) {
                throw new \RuntimeException('Login gagal: Token tidak diterima');
            }

            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }

            $_SESSION['user_token'] = $response['access_token'];
            $_SESSION['user_id'] = $response['user']['id'] ?? null;

            if ($remember) {
                // Simpan refresh token di cookie terenkripsi untuk 60 hari
                $encryptedRefreshToken = $this->encrypt($response['refresh_token'] ?? '');
                setcookie('refresh_token', $encryptedRefreshToken, [
                    'expires' => time() + (60 * 24 * 60 * 60), // 60 hari
                    'path' => '/',
                    'secure' => true, // Hanya HTTPS
                    'httponly' => true, // Cegah akses JavaScript
                    'samesite' => 'Strict' // Cegah CSRF
                ]);

                // Atur sesi untuk bertahan 7 hari
                $sessionLifetime = 7 * 24 * 60 * 60; // 7 hari
                session_set_cookie_params([
                    'lifetime' => $sessionLifetime,
                    'path' => '/',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                ini_set('session.gc_maxlifetime', (string)$sessionLifetime);
                session_regenerate_id(true);
            } else {
                // Simpan refresh token di sesi untuk masa berlaku sementara
                $_SESSION['refresh_token'] = $response['refresh_token'] ?? null;
                session_set_cookie_params([
                    'lifetime' => 0, // Berakhir saat browser ditutup
                    'path' => '/',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                ini_set('session.cookie_lifetime', '0');
            }

            header('Location: /dashboard');
            exit;
        } catch (\Exception $e) {
            try {
                return $this->twig->render('login.html.twig', [
                    'title' => 'Login Admin Molagis',
                    'error' => $e->getMessage(),
                    'email' => $email ?? '',
                ]);
            } catch (\Twig\Error\Error $e) {
                error_log('Twig error in handleLogin: ' . $e->getMessage());
                return 'Error rendering login page: ' . htmlspecialchars($e->getMessage());
            }
        }
    }

    public function logout(): void
    {
        try {
            if (isset($_SESSION['user_token'])) {
                $this->supabase->signOut($_SESSION['user_token']);
            }
        } catch (\Exception) {
            // Ignore logout errors
        } finally {
            // Hapus sesi dan cookie refresh token
            session_unset();
            session_destroy();
            setcookie('refresh_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Strict'
            ]);
            header('Location: /login');
            exit;
        }
    }

    public function getUserData(): ?array
    {
        if (!isset($_SESSION['user_token'])) {
            return null;
        }

        $user = $this->supabase->getUser($_SESSION['user_token']);
        return $user ? ['id' => $user['id']] : null;
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