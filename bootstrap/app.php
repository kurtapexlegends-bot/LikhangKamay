<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\HandleInertiaRequests;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // 1. REGISTER INERTIA MIDDLEWARE & OTHERS
        $middleware->web(append: [
            HandleInertiaRequests::class,
            \App\Http\Middleware\UpdateLastSeen::class, // <--- Added
        ]);

        // 2. MIDDLEWARE ALIASES
        $middleware->alias([
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'artisan' => \App\Http\Middleware\EnsureArtisan::class,
        ]);
        
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
