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
        if (Schema::hasTable('vouchers')) {
            Schema::table('vouchers', function (Blueprint $table) {
                if (!Schema::hasColumn('vouchers', 'scope_type')) {
                    $table->string('scope_type', 30)->default('all')->after('discount_type'); // 'all' | 'specific_products' | 'category'
                }
                if (!Schema::hasColumn('vouchers', 'applicable_products')) {
                    $table->json('applicable_products')->nullable()->after('scope_type');
                }
                if (!Schema::hasColumn('vouchers', 'applicable_category')) {
                    $table->string('applicable_category', 100)->nullable()->after('applicable_products');
                }
                if (!Schema::hasColumn('vouchers', 'min_requirement_type')) {
                    $table->string('min_requirement_type', 20)->default('spend')->after('min_spend'); // 'spend' | 'quantity'
                }
                if (!Schema::hasColumn('vouchers', 'min_quantity')) {
                    $table->integer('min_quantity')->default(1)->after('min_requirement_type');
                }
                if (!Schema::hasColumn('vouchers', 'target_audience')) {
                    $table->string('target_audience', 30)->default('all')->after('usage_limit_per_user'); // 'all' | 'new_customers' | 'repeat_customers'
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('vouchers')) {
            Schema::table('vouchers', function (Blueprint $table) {
                $columnsToDrop = [];
                foreach (['scope_type', 'applicable_products', 'applicable_category', 'min_requirement_type', 'min_quantity', 'target_audience'] as $col) {
                    if (Schema::hasColumn('vouchers', $col)) {
                        $columnsToDrop[] = $col;
                    }
                }
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
