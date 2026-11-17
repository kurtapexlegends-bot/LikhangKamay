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
            if (!Schema::hasColumn('users', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('subscription_expires_at');
            }
            if (!Schema::hasColumn('users', 'has_used_trial')) {
                $table->boolean('has_used_trial')->default(false)->after('trial_ends_at');
            }
            if (!Schema::hasColumn('users', 'billing_cycle')) {
                $table->string('billing_cycle', 20)->default('monthly')->after('has_used_trial');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'billing_cycle')) {
                $table->dropColumn('billing_cycle');
            }
            if (Schema::hasColumn('users', 'has_used_trial')) {
                $table->dropColumn('has_used_trial');
            }
            if (Schema::hasColumn('users', 'trial_ends_at')) {
                $table->dropColumn('trial_ends_at');
            }
        });
    }
};
