<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PlatformAuditCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'platform:audit';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run a comprehensive system integrity audit for LikhangKamay platform.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->header("LikhangKamay | SYSTEM INTEGRITY AUDIT");

        $routesOk = $this->auditRoutes();
        $storageOk = $this->auditStorage();
        $envOk = $this->auditEnvironment();

        if (!$routesOk || !$storageOk || !$envOk) {
            $this->newLine();
            $this->error("✖ Platform integrity audit FAILED. One or more checks failed above.");
            return Command::FAILURE;
        }

        $this->newLine();
        $this->info("✔ Audit completed successfully. All integrity checks passed.");
        return Command::SUCCESS;
    }

    protected function header(string $title): void
    {
        $len = strlen($title) + 4;
        $this->line(str_repeat('=', $len));
        $this->line("| $title |");
        $this->line(str_repeat('=', $len));
    }

    protected function auditRoutes(): bool
    {
        $this->warn("\n[1/3] Auditing Route Controllers...");
        
        $routes = \Illuminate\Support\Facades\Route::getRoutes();
        $missing = [];
        $total = 0;

        foreach ($routes as $route) {
            $action = $route->getAction('controller');
            
            if (!$action || !is_string($action)) continue;

            $total++;
            
            if (str_contains($action, '@')) {
                [$controllerClass, $method] = explode('@', $action);
            } else {
                $controllerClass = $action;
                $method = '__invoke';
            }
            
            if (!class_exists($controllerClass)) {
                $missing[] = "Controller missing: $controllerClass (Route: " . $route->uri() . ")";
                continue;
            }

            if (!method_exists($controllerClass, $method)) {
                $missing[] = "Method missing: $method in $controllerClass (Route: " . $route->uri() . ")";
            }
        }

        if (empty($missing)) {
            $this->info("✔ All $total route controllers and methods are valid.");
            return true;
        }

        foreach ($missing as $error) {
            $this->error("✖ $error");
        }
        return false;
    }

    protected function auditStorage(): bool
    {
        $this->warn("\n[2/3] Auditing Storage Configuration...");
        
        // In production / S3 default driver, verify cloud storage configuration
        if (config('filesystems.default') === 's3') {
            $this->info("✔ Cloud storage ('s3' / Cloudflare R2) is configured as default filesystem driver.");
            return true;
        }

        $link = public_path('storage');
        
        if (!file_exists($link)) {
            $this->error("✖ Public storage link is MISSING.");
            $this->comment("  Try running: php artisan storage:link");
            return false;
        }

        $this->info("✔ Public storage directory/link verified at: $link");
        return true;
    }

    protected function auditEnvironment(): bool
    {
        $this->warn("\n[3/3] Auditing Critical Environment Variables...");

        $critical = [
            'LALAMOVE_API_KEY' => config('services.lalamove.api_key'),
            'LALAMOVE_SECRET_KEY' => config('services.lalamove.secret_key') ?: config('services.lalamove.api_secret'),
            'PAYMONGO_SECRET_KEY' => config('services.paymongo.secret_key'),
            'PAYMONGO_PUBLIC_KEY' => config('services.paymongo.public_key'),
            'RESEND_API_KEY' => config('services.resend.key'),
        ];

        // Production-mandated monitoring & real-time telemetry
        if (app()->environment('production')) {
            $critical['SUPABASE_URL'] = config('services.supabase.url');
            $critical['SUPABASE_ANON_KEY'] = config('services.supabase.anon_key');
            $critical['SENTRY_DSN'] = config('sentry.dsn');
        }

        $missing = [];

        foreach ($critical as $key => $val) {
            if (empty($val)) {
                $missing[] = $key;
            }
        }

        if (empty($missing)) {
            $this->info("✔ All critical environment variables are defined.");
            return true;
        }

        foreach ($missing as $key) {
            $this->error("✖ Environment variable '$key' is UNDEFINED or EMPTY.");
        }
        return false;
    }
}
