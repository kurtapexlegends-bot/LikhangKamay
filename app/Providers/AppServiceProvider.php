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
        $this->app->singleton('system.settings', function ($app) {
            return new \App\Services\SystemSettingsService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
                return true;
            }
        });

        \Illuminate\Support\Facades\Gate::define('admin-action', [\App\Policies\AdminPolicy::class, 'adminAction']);

        \Illuminate\Support\Facades\Gate::policy(\App\Models\Payroll::class, \App\Policies\PayrollPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\StockRequest::class, \App\Policies\StockRequestPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Product::class, \App\Policies\ProductPolicy::class);

        // Dynamically override SMTP config and app name from database settings
        try {
            $settings = app('system.settings');
            
            $platformName = $settings->get('platform_name');
            if ($platformName) {
                config(['app.name' => $platformName]);
            }

            $mailHost = $settings->get('mail_host');
            if ($mailHost) {
                config([
                    'mail.mailers.smtp.host' => $mailHost,
                    'mail.mailers.smtp.port' => $settings->get('mail_port', '2525'),
                    'mail.mailers.smtp.encryption' => $settings->get('mail_encryption', 'tls'),
                    'mail.mailers.smtp.username' => $settings->get('mail_username'),
                    'mail.mailers.smtp.password' => $settings->get('mail_password'),
                    'mail.from.address' => $settings->get('mail_from_address', 'noreply@likhangkamay.app'),
                    'mail.from.name' => $settings->get('mail_from_name', 'LikhangKamay'),
                ]);
            }
        } catch (\Throwable $e) {
            // Silence if database is not ready or migrated yet
        }

        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');

            // Vercel read-only filesystem fix
            $viewPath = '/tmp/storage/framework/views';
            if (!is_dir($viewPath)) {
                mkdir($viewPath, 0755, true);
            }
            config(['view.compiled' => $viewPath]);
        }
        
        Vite::prefetch(concurrency: 3);

        \App\Models\Review::observe(\App\Observers\ReviewObserver::class);
        \App\Models\ReviewDispute::observe(\App\Observers\ReviewDisputeObserver::class);

        // --- PASSWORD COMPLEXITY DEFAULTS ---
        \Illuminate\Validation\Rules\Password::defaults(function () {
            if (app()->runningUnitTests()) {
                return \Illuminate\Validation\Rules\Password::min(8);
            }
            $rule = \Illuminate\Validation\Rules\Password::min(12);
            return app()->isProduction()
                ? $rule->letters()->mixedCase()->numbers()->symbols()->uncompromised()
                : $rule;
        });

        // --- RATE LIMITERS ---
        
        // 1. Marketplace Search (Prevent scraping/DOS)
        \Illuminate\Support\Facades\RateLimiter::for('marketplace.search', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(30)->by($request->ip());
        });

        // 2. CSV & Bulk Operations (Resource Intensive)
        \Illuminate\Support\Facades\RateLimiter::for('bulk.ops', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        // 3. System Diagnostics & Analytics
        \Illuminate\Support\Facades\RateLimiter::for('admin.heavy', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        // 4. User Login (Prevent brute force)
        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip());
        });
    }
}
