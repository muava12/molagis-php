<?php
declare(strict_types=1);

namespace Molagis\Features\Auth;

use Molagis\Shared\SupabaseService;

class AuthServices
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function signIn(string $email, string $password): ?array
    {
        return $this->supabase->signIn($email, $password);
    }
}