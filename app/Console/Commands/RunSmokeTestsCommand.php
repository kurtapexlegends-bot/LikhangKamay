<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Process\Process;

class RunSmokeTestsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:smoke {--skip-browser : Skip headless Chrome browser tests} {--prepare-only : Only prepare test accounts and products in database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run the lightweight E2E smoke test suite (AST reference audit, feature flow tests, and browser tests)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('prepare-only')) {
            $this->ensureSmokeAccounts();
            $this->info('Smoke test accounts and products prepared successfully.');
            return self::SUCCESS;
        }

        $start = microtime(true);
        $this->newLine();
        $this->info('========================================================================');
        $this->info('   LikhangKamay | Fast E2E Smoke Test Suite (<2 Minutes)');
        $this->info('========================================================================');

        // Step 1: Ensure smoke test accounts exist
        $this->info("\n[1/3] Verifying Smoke Test Accounts in Database...");
        $this->ensureSmokeAccounts();
        $this->line('  ✓ Test buyer, artisan accounts, and active product ready.');

        // Step 2: Run AST Reference & Undefined Hook Audit
        $this->info("\n[2/3] Auditing React Imports, Hooks & Undefined References...");
        $refProcess = new Process(['node', 'scripts/verify-references.js'], base_path());
        $refProcess->setTimeout(60);
        $refProcess->run();

        if (!$refProcess->isSuccessful()) {
            $this->error($refProcess->getOutput() . $refProcess->getErrorOutput());
            return self::FAILURE;
        }
        $this->line('  ✓ AST Reference audit passed. Zero broken references or undefined hooks.');

        // Step 3: Run Backend Production Flow Feature Tests
        $this->info("\n[3/3] Running Production Flows Feature Tests (HTTP & Inertia contracts)...");
        $phpBinary = (new \Symfony\Component\Process\PhpExecutableFinder)->find(false) ?: 'php';
        $testProcess = new Process([
            $phpBinary,
            'artisan',
            'test',
            'tests/Feature/E2E/ProductionFlowsSmokeTest.php'
        ], base_path(), array_merge($_SERVER, [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
        ]));
        $testProcess->setTimeout(60);
        $testProcess->run(function ($type, $buffer) {
            echo $buffer;
        });

        if (!$testProcess->isSuccessful()) {
            $this->error('Feature flow tests failed.');
            return self::FAILURE;
        }
        $this->line('  ✓ Feature flow tests passed (Buyer, Artisan Profile, Subscription).');

        // Optional Step 4: Headless Browser Smoke Tests
        if (!$this->option('skip-browser')) {
            $this->info("\n[Browser Smoke] Executing Headless Chrome E2E Flows...");
            $browserProcess = new Process(['node', 'tests/e2e/smoke.mjs'], base_path());
            $browserProcess->setTimeout(120);
            $browserProcess->run(function ($type, $buffer) {
                echo $buffer;
            });

            if (!$browserProcess->isSuccessful()) {
                $this->error("\nHeadless browser E2E smoke tests failed.");
                return self::FAILURE;
            }
        }

        $duration = round(microtime(true) - $start, 2);
        $this->newLine();
        $this->info("========================================================================");
        $this->info("  [PASS] All E2E Smoke Tests Succeeded in {$duration}s!");
        $this->info("========================================================================");
        $this->newLine();

        return self::SUCCESS;
    }

    private function ensureSmokeAccounts(): void
    {
        $artisan = User::updateOrCreate(
            ['email' => 'artisan.smoke@likhangkamay.local'],
            [
                'name' => 'Smoke Artisan',
                'first_name' => 'Smoke',
                'last_name' => 'Artisan',
                'password' => Hash::make('password'),
                'role' => 'artisan',
                'artisan_status' => 'approved',
                'approved_at' => now(),
                'setup_completed_at' => now(),
                'email_verified_at' => now(),
                'shop_name' => 'Smoke Artisan Studio',
                'street_address' => '100 Artisan Way',
                'city' => 'Imus City',
                'barangay' => 'Bucandala I',
                'region' => 'Cavite',
                'zip_code' => '4103',
                'premium_tier' => 'free',
            ]
        );

        $artisan->complianceAgreements()->firstOrCreate([
            'document_type' => 'seller_terms',
        ], [
            'version' => '1.0',
            'accepted_at' => now(),
        ]);

        User::updateOrCreate(
            ['email' => 'buyer.smoke@likhangkamay.local'],
            [
                'name' => 'Smoke Buyer',
                'first_name' => 'Smoke',
                'last_name' => 'Buyer',
                'password' => Hash::make('password'),
                'role' => 'buyer',
                'email_verified_at' => now(),
                'city' => 'Imus City',
            ]
        );

        Category::firstOrCreate(
            ['name' => 'Drinkware'],
            ['slug' => 'drinkware', 'icon' => 'Coffee']
        );

        Product::$bypassReview = true;
        Product::updateOrCreate(
            ['sku' => 'SKU-SMOKE-001'],
            [
                'user_id' => $artisan->id,
                'name' => 'Handcrafted Clay Mug',
                'description' => 'A beautifully hand-thrown ceramic mug made from Cavite clay.',
                'category' => 'Drinkware',
                'status' => 'Active',
                'price' => 350.00,
                'stock' => 25,
                'lead_time' => 3,
                'slug' => 'handcrafted-clay-mug',
            ]
        );
        Product::$bypassReview = false;

        Cache::flush();
    }
}
