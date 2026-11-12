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
        if (!Schema::hasTable('vouchers')) {
            Schema::create('vouchers', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('name', 255);
                $table->string('description', 500)->nullable();
                $table->foreignId('shop_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('discount_type', 20)->default('percentage'); // 'percentage' | 'fixed_amount'
                $table->decimal('discount_value', 10, 2);
                $table->decimal('min_spend', 10, 2)->default(0.00);
                $table->decimal('max_discount', 10, 2)->nullable();
                $table->integer('usage_limit_total')->nullable();
                $table->integer('usage_limit_per_user')->default(1);
                $table->integer('used_count')->default(0);
                $table->boolean('is_public')->default(true);
                $table->boolean('is_active')->default(true);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['shop_id', 'is_active'], 'idx_vouchers_shop_active');
                $table->index(['is_public', 'is_active'], 'idx_vouchers_public_active');
            });
        }

        if (!Schema::hasTable('voucher_redemptions')) {
            Schema::create('voucher_redemptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('voucher_id')->constrained('vouchers')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->decimal('discount_amount', 10, 2)->default(0.00);
                $table->string('status', 20)->default('redeemed'); // 'redeemed' | 'cancelled'
                $table->timestamp('redeemed_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamps();

                $table->index(['voucher_id', 'user_id', 'status'], 'idx_voucher_redemptions_user_status');
                $table->index(['order_id'], 'idx_voucher_redemptions_order');
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'voucher_id')) {
                    $table->foreignId('voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();
                }
                if (!Schema::hasColumn('orders', 'voucher_code')) {
                    $table->string('voucher_code', 50)->nullable();
                }
                if (!Schema::hasColumn('orders', 'voucher_discount_amount')) {
                    $table->decimal('voucher_discount_amount', 10, 2)->default(0.00);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'voucher_id')) {
                    $table->dropConstrainedForeignId('voucher_id');
                }
                $columnsToDrop = [];
                foreach (['voucher_code', 'voucher_discount_amount'] as $col) {
                    if (Schema::hasColumn('orders', $col)) {
                        $columnsToDrop[] = $col;
                    }
                }
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        Schema::dropIfExists('voucher_redemptions');
        Schema::dropIfExists('vouchers');
    }
};
