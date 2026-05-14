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
    protected $description = 'Run a comprehensive system integrity audit for Likhang Kamay platform.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->header("LIKHANG KAMAY | SYSTEM INTEGRITY AUDIT");

        $this->auditRoutes();
        $this->auditStorage();
        $this->auditEnvironment();

        $this->info("\nAudit completed. Check findings above.");
    }

    protected function header(string $title)
    {
        $len = strlen($title) + 4;
        $this->line(str_repeat('=', $len));
        $this->line("| $title |");
        $this->line(str_repeat('=', $len));
    }

    protected function auditRoutes()
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
                // Handle cases like 'App\Http\Controllers\HomeController' (invokable)
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
        } else {
            foreach ($missing as $error) {
                $this->error("✖ $error");
            }
        }
    }

    protected function auditStorage()
    {
        $this->warn("\n[2/3] Auditing Public Storage Symlink...");
        
        $link = public_path('storage');
        
        if (!file_exists($link)) {
            $this->error("✖ Public storage link is MISSING.");
            $this->comment("  Try running: php artisan storage:link");
            return;
        }

        if (!is_link($link)) {
            $this->error("✖ 'public/storage' exists but is NOT a symbolic link.");
            return;
        }

        $target = readlink($link);
        if (!file_exists($target)) {
            $this->error("✖ Storage symlink is BROKEN. Target does not exist: $target");
        } else {
            $this->info("✔ Storage symlink is valid and points to: $target");
        }
    }

    protected function auditEnvironment()
    {
        $this->warn("\n[3/3] Auditing Critical Environment Variables...");

        $critical = [
            'LALAMOVE_API_KEY',
            'LALAMOVE_SECRET_KEY',
            'PAYMONGO_SECRET_KEY',
            'PAYMONGO_PUBLIC_KEY',
            'RESEND_API_KEY',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'VITE_SENTRY_DSN_PUBLIC'
        ];

        $missing = [];

        foreach ($critical as $key) {
            if (empty(env($key))) {
                $missing[] = $key;
            }
        }

        if (empty($missing)) {
            $this->info("✔ All critical environment variables are defined.");
        } else {
            foreach ($missing as $key) {
                $this->error("✖ Environment variable '$key' is UNDEFINED or EMPTY.");
            }
        }
    }
}
