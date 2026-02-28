<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SpecificSuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = 'likhangkamaybusiness@gmail.com';

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Likhang Kamay Admin',
                'password' => Hash::make('password'), // Default password
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]
        );

        // Ensure role is super_admin even if user existed before
        $user->role = 'super_admin';
        $user->save();

        $this->command->info("User {$email} is now a Super Admin.");
    }
}
