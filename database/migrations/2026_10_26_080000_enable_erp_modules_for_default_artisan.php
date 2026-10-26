<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        $artisan = User::where('email', 'artisan@likhangkamay.com')->first();
        if ($artisan) {
            $artisan->update([
                'premium_tier' => 'super_premium',
                'subscription_expires_at' => now()->addYears(10),
                'modules_enabled' => [
                    'hr' => true,
                    'accounting' => true,
                    'procurement' => true,
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        $artisan = User::where('email', 'artisan@likhangkamay.com')->first();
        if ($artisan) {
            $artisan->update([
                'premium_tier' => 'free',
                'subscription_expires_at' => null,
                'modules_enabled' => null,
            ]);
        }
    }
};
