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

    public function showLogin(): void
    {
        if (isset($_SESSION['user_token'])) {
            header('Location: /dashboard');
            exit;
        }
        echo $this->twig->render('login.html.twig', ['title' => 'Login Admin Molagis']);
    }

    public function handleLogin(array $post): void
    {
        try {
            $email = $post['email'] ?? '';
            $password = $post['password'] ?? '';
            
            if (empty($email) || empty($password)) {
                throw new \InvalidArgumentException('Email dan kata sandi wajib diisi');
            }

            $response = $this->supabase->signIn($email, $password);
            
            if (!isset($response['access_token'])) {
                throw new \RuntimeException('Login gagal: Token tidak diterima');
            }

            $_SESSION['user_token'] = $response['access_token'];
            $_SESSION['user_id'] = $response['user']['id'] ?? null;
            $_SESSION['refresh_token'] = $response['refresh_token'] ?? null;
            
            header('Location: /dashboard');
            exit;
        } catch (\Exception $e) {
            echo $this->twig->render('login.html.twig', [
                'title' => 'Login Admin Molagis',
                'error' => $e->getMessage(),
                'email' => $email ?? '',
            ]);
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