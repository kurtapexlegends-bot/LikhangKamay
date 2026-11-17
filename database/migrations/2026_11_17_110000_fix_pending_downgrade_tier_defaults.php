<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
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

        // Clear accidental 'free' pending downgrade tier for active paid subscribers who never requested a cancellation
        DB::table('users')
            ->whereIn('premium_tier', ['premium', 'super_premium'])
            ->where('pending_downgrade_tier', 'free')
            ->whereNull('subscription_cancelled_at')
            ->update(['pending_downgrade_tier' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive data normalization; no destructive revert needed.
    }
};
