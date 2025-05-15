<?php
declare(strict_types=1);

namespace Molagis\Features\Auth;

use Molagis\Shared\SupabaseService;
use Molagis\Shared\ConfigSession;
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

            $_SESSION['user_token'] = $response['access_token'];
            $_SESSION['user_id'] = $response['user']['id'] ?? null;

            if ($remember) {
                // Simpan refresh token di cookie terenkripsi untuk 60 hari
                $encryptedRefreshToken = $this->encrypt($response['refresh_token'] ?? '');
                setcookie('refresh_token', $encryptedRefreshToken, [
                    'expires' => time() + (60 * 24 * 60 * 60), // 60 hari
                    'path' => '/',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                session_regenerate_id(true);
            } else {
                // Simpan refresh token di sesi untuk masa berlaku sementara
                $_SESSION['refresh_token'] = $response['refresh_token'] ?? null;
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
        $maxRetries = 3;
        $retryDelay = 1; // Detik
        $success = false;

        try {
            if (isset($_SESSION['user_token'])) {
                // Coba logout ke Supabase dengan retry
                for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                    try {
                        $this->supabase->signOut($_SESSION['user_token']);
                        $success = true;
                        break;
                    } catch (\Exception $e) {
                        error_log("Logout attempt $attempt failed: " . $e->getMessage());
                        if ($attempt < $maxRetries) {
                            sleep($retryDelay);
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            error_log('Final logout error: ' . $e->getMessage());
        } finally {
            // Hapus sesi dan cookie lokal terlepas dari keberhasilan Supabase
            session_unset();
            session_destroy();

            setcookie('refresh_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Strict'
            ]);

            // Jika logout ke Supabase gagal, tandai sesi sebagai tidak valid
            if (!$success) {
                error_log('Failed to logout from Supabase after retries. Local session destroyed.');
                // Opsional: Tambahkan logika untuk memberi tahu admin atau user
            }

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

    private function encrypt(string $data): string
    {
        $key = $_ENV['ENCRYPTION_KEY']; // Ganti dengan kunci aman dari env
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
        if ($encrypted === false) {
            throw new \RuntimeException('Gagal mengenkripsi refresh token');
        }
        return base64_encode($encrypted . '::' . $iv);
    }

    private function decrypt(string $encrypted): string
    {
        $key = $_ENV['ENCRYPTION_KEY'];
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