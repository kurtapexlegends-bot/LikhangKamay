<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\HandleInertiaRequests;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust Railway's proxy headers so Laravel generates HTTPS URLs correctly.
        $middleware->trustProxies(at: '*');
        
        // 1. REGISTER INERTIA MIDDLEWARE & OTHERS
        $middleware->web(append: [
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\XssSanitization::class,
            HandleInertiaRequests::class,
            \App\Http\Middleware\CheckMaintenanceMode::class, // <--- Added
            \App\Http\Middleware\UpdateLastSeen::class,
            \App\Http\Middleware\TrackStaffActivity::class,
        ]);

        // 2. MIDDLEWARE ALIASES
        $middleware->alias([
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'artisan' => \App\Http\Middleware\EnsureArtisan::class,
            'seller.workspace' => \App\Http\Middleware\EnsureSellerWorkspaceAccess::class,
            'seller.module' => \App\Http\Middleware\EnsureSellerModuleAccess::class,
            'seller.compliance' => \App\Http\Middleware\EnsureSellerCompliance::class,
            'staff.security' => \App\Http\Middleware\EnsureStaffSecurityGate::class,
            'staff.attendance' => \App\Http\Middleware\EnsureStaffAttendanceActive::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            '/webhooks/*',
        ]);
        
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($request->header('X-Inertia')) {
                if ($response->getStatusCode() === 401 || ($response->getStatusCode() === 302 && str_contains($response->headers->get('Location', ''), '/login'))) {
                    return Inertia::location(route('login'));
                }
                if ($response->getStatusCode() === 419) {
                    return Inertia::location(route('login'));
                }
            }
            return $response;
        });



        $exceptions->report(function (Throwable $e) {
            error_log("DETAILED_CRASH_INFO: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
            if ($e->getPrevious()) {
                error_log("PREVIOUS_CRASH_INFO: " . $e->getPrevious()->getMessage());
            }
        });
        \Sentry\Laravel\Integration::handles($exceptions);
    })->create();
