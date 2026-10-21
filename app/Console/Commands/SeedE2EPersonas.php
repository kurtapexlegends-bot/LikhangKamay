<?php

namespace App\Console\Commands;

use Database\Seeders\E2ETestPersonaSeeder;
use Illuminate\Console\Command;

class SeedE2EPersonas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:seed-personas';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed or update the 5 synthetic E2E testing personas across roles with is_test=true';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Seeding 5 synthetic E2E testing personas...');

        $seeder = new E2ETestPersonaSeeder();
        $seeder->setCommand($this);
        $seeder->run();

        $this->info('Done.');
        return Command::SUCCESS;
    }
}
