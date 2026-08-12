<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'subscription_expires_at')) {
                $table->timestamp('subscription_expires_at')->nullable()->after('premium_tier');
            }
            if (!Schema::hasColumn('users', 'subscription_cancelled_at')) {
                $table->timestamp('subscription_cancelled_at')->nullable()->after('subscription_expires_at');
            }
            if (!Schema::hasColumn('users', 'pending_downgrade_tier')) {
                $table->string('pending_downgrade_tier')->nullable()->default('free')->after('subscription_cancelled_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'pending_downgrade_tier')) {
                $table->dropColumn('pending_downgrade_tier');
            }
            if (Schema::hasColumn('users', 'subscription_cancelled_at')) {
                $table->dropColumn('subscription_cancelled_at');
            }
            if (Schema::hasColumn('users', 'subscription_expires_at')) {
                $table->dropColumn('subscription_expires_at');
            }
        });
    }
};
