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
        if (!Schema::hasTable('platform_policies')) {
            Schema::create('platform_policies', function (Blueprint $table) {
                $table->id();
                $table->string('type', 64);
                $table->string('title', 255);
                $table->string('version', 32);
                $table->longText('content_markdown');
                $table->json('structured_criteria')->nullable();
                $table->boolean('is_active')->default(false);
                $table->timestamp('published_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['type', 'version'], 'uq_platform_policies_type_version');
                $table->index(['type', 'is_active'], 'idx_platform_policies_type_active');
            });
        }

        if (!Schema::hasTable('user_policy_consents')) {
            Schema::create('user_policy_consents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('platform_policy_id')->nullable()->constrained('platform_policies')->nullOnDelete();
                $table->string('policy_type', 64);
                $table->string('policy_version', 32);
                $table->string('context', 64);
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->json('criteria_acknowledged')->nullable();
                $table->timestamp('accepted_at');
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'policy_type'], 'idx_user_policy_consents_user_type');
                $table->index(['platform_policy_id'], 'idx_user_policy_consents_policy');
                $table->index(['order_id'], 'idx_user_policy_consents_order');
            });
        }

        if (Schema::hasTable('disputes')) {
            Schema::table('disputes', function (Blueprint $table) {
                if (!Schema::hasColumn('disputes', 'platform_policy_id')) {
                    $table->foreignId('platform_policy_id')->nullable()->constrained('platform_policies')->nullOnDelete();
                }
                if (!Schema::hasColumn('disputes', 'policy_version')) {
                    $table->string('policy_version', 32)->nullable();
                }
                if (!Schema::hasColumn('disputes', 'damage_reason_code')) {
                    $table->string('damage_reason_code', 100)->nullable();
                }
                if (!Schema::hasColumn('disputes', 'criteria_checklist')) {
                    $table->json('criteria_checklist')->nullable();
                }
                if (!Schema::hasColumn('disputes', 'photo_angles')) {
                    $table->json('photo_angles')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('disputes')) {
            Schema::table('disputes', function (Blueprint $table) {
                if (Schema::hasColumn('disputes', 'platform_policy_id')) {
                    $table->dropConstrainedForeignId('platform_policy_id');
                }
                $columnsToDrop = [];
                foreach (['policy_version', 'damage_reason_code', 'criteria_checklist', 'photo_angles'] as $col) {
                    if (Schema::hasColumn('disputes', $col)) {
                        $columnsToDrop[] = $col;
                    }
                }
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        Schema::dropIfExists('user_policy_consents');
        Schema::dropIfExists('platform_policies');
    }
};
