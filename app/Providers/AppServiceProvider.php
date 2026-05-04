<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');

            // Vercel read-only filesystem fix:
            // Ensure the views directory exists in /tmp
            $viewPath = '/tmp/storage/framework/views';
            if (!is_dir($viewPath)) {
                mkdir($viewPath, 0755, true);
            }
            config(['view.compiled' => $viewPath]);
        }
        
        Vite::prefetch(concurrency: 3);
    }
}
