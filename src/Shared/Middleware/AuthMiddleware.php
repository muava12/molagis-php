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
        return isset($_SESSION['refresh_token']);
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
        $newTokens = $this->supabase->refreshToken($_SESSION['refresh_token']);
        
        if ($newTokens && isset($newTokens['access_token'])) {
            $_SESSION['user_token'] = $newTokens['access_token'];
            $_SESSION['refresh_token'] = $newTokens['refresh_token'] ?? $_SESSION['refresh_token'];
            return $next($request);
        }
    
        return $this->handleUnauthorized($request, true);
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
        bool $destroySession = false
    ): ResponseInterface {
        if ($destroySession) {
            session_unset();
            session_destroy();
        }

        if ($request->getHeaderLine('X-Requested-With') === 'XMLHttpRequest') {
            return new JsonResponse([
                'error' => 'unauthorized',
                'message' => 'Sesi telah kadaluarsa'
            ], 401);
        }

        return new RedirectResponse($this->loginPath);
    }
}