<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SpecificSuperAdminSeeder extends Seeder
{
    /**
     * Backward-compatible alias to the guarded SuperAdminSeeder.
     */
    public function run(): void
    {
        $this->call(SuperAdminSeeder::class);
    }
}
