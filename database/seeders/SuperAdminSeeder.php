<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Create or update the Super Admin account only when explicit credentials are provided.
     */
    public function run(): void
    {
        $email = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');
        $name = env('SUPER_ADMIN_NAME', 'LikhangKamay Admin');

        if (blank($email) || blank($password)) {
            $this->command?->warn('SuperAdminSeeder skipped. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to seed a super admin account.');
            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'role' => 'super_admin',
                'email_verified_at' => now(),
                'artisan_status' => 'approved',
            ]
        );

        $this->command?->info("Super Admin created/updated: {$email}");
    }
}
