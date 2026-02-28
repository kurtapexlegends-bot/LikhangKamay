<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Create or update the Super Admin account.
     */
    public function run(): void
    {
        $email = 'likhangkamaybusiness@gmail.com';
        
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'LikhangKamay Admin',
                'password' => Hash::make('admin123456'),
                'role' => 'super_admin',
                'email_verified_at' => now(),
                'artisan_status' => 'approved',
            ]
        );

        $this->command->info("✅ Super Admin created/updated: {$email}");
    }
}
