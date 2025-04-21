<?php
declare(strict_types=1);

namespace Molagis\Features\Auth;

use Molagis\Shared\SupabaseService;
use Twig\Environment;

class AuthController
{
    private SupabaseService $supabase;
    private Environment $twig;

    public function __construct(SupabaseService $supabase, Environment $twig)
    {
        $this->supabase = $supabase;
        $this->twig = $twig;
    }

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
            $authService = new AuthServices($this->supabase);
            $response = $authService->signIn($email, $password);
            if ($response && isset($response['access_token'])) {
                $_SESSION['user_token'] = $response['access_token'];
                $_SESSION['user_id'] = $response['user']['id'];
                header('Location: /dashboard');
                exit;
            }
            throw new \InvalidArgumentException('Login gagal');
        } catch (\Exception $e) {
            echo $this->twig->render('login.html.twig', [
                'title' => 'Login Admin Molagis',
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function logout(): void
    {
        try {
            if (isset($_SESSION['user_token'])) {
                $this->supabase->signOut($_SESSION['user_token']);
            }
            session_unset();
            session_destroy();
            header('Location: /login');
            exit;
        } catch (\Exception $e) {
            echo $this->twig->render('login.html.twig', [
                'title' => 'Login Admin Molagis',
                'error' => 'Gagal logout: ' . $e->getMessage(),
            ]);
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