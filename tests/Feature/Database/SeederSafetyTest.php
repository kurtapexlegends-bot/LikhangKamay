<?php

namespace Tests\Feature\Database;

use App\Models\User;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_seeder_skips_when_credentials_are_not_provided(): void
    {
        putenv('SUPER_ADMIN_EMAIL');
        putenv('SUPER_ADMIN_PASSWORD');
        unset($_ENV['SUPER_ADMIN_EMAIL'], $_ENV['SUPER_ADMIN_PASSWORD']);
        $_SERVER['SUPER_ADMIN_EMAIL'] = null;
        $_SERVER['SUPER_ADMIN_PASSWORD'] = null;

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseMissing('users', [
            'role' => 'super_admin',
        ]);
    }

    public function test_super_admin_seeder_creates_user_when_explicit_credentials_are_provided(): void
    {
        putenv('SUPER_ADMIN_EMAIL=admin@example.com');
        putenv('SUPER_ADMIN_PASSWORD=StrongSeederPassword123');
        $_ENV['SUPER_ADMIN_EMAIL'] = 'admin@example.com';
        $_ENV['SUPER_ADMIN_PASSWORD'] = 'StrongSeederPassword123';
        $_SERVER['SUPER_ADMIN_EMAIL'] = 'admin@example.com';
        $_SERVER['SUPER_ADMIN_PASSWORD'] = 'StrongSeederPassword123';

        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@example.com',
            'role' => 'super_admin',
        ]);

        putenv('SUPER_ADMIN_EMAIL');
        putenv('SUPER_ADMIN_PASSWORD');
        unset($_ENV['SUPER_ADMIN_EMAIL'], $_ENV['SUPER_ADMIN_PASSWORD']);
        $_SERVER['SUPER_ADMIN_EMAIL'] = null;
        $_SERVER['SUPER_ADMIN_PASSWORD'] = null;
    }
}
