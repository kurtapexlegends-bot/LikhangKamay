<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumns('users', ['role', 'artisan_status', 'subscription_expires_at'])) {
                    if (!Schema::hasIndex('users', 'users_role_artisan_status_subscription_idx') &&
                        !Schema::hasIndex('users', ['role', 'artisan_status', 'subscription_expires_at'])) {
                        $table->index(['role', 'artisan_status', 'subscription_expires_at'], 'users_role_artisan_status_subscription_idx');
                    }
                }
            });

            // Safe backfill for existing approved artisans lacking active subscription or trial
            DB::table('users')
                ->where('role', 'artisan')
                ->where('artisan_status', 'approved')
                ->whereNull('subscription_expires_at')
                ->whereNull('trial_ends_at')
                ->update([
                    'subscription_expires_at' => now()->addDays(30),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasIndex('users', 'users_role_artisan_status_subscription_idx')) {
                    $table->dropIndex('users_role_artisan_status_subscription_idx');
                } elseif (Schema::hasIndex('users', ['role', 'artisan_status', 'subscription_expires_at'])) {
                    $table->dropIndex(['role', 'artisan_status', 'subscription_expires_at']);
                }
            });
        }
    }
};
