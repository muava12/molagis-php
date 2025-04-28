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
            $_SESSION['refresh_token'] = $response['refresh_token'] ?? null;

            if ($remember) {
                $sessionLifetime = 7 * 24 * 60 * 60;
                ini_set('session.gc_maxlifetime', (string)$sessionLifetime);
                ini_set('session.cookie_lifetime', (string)$sessionLifetime);
                session_set_cookie_params($sessionLifetime);
                session_regenerate_id(true);
            } else {
                ini_set('session.cookie_lifetime', '0');
                session_set_cookie_params(0);
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
            session_unset();
            session_destroy();
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
}