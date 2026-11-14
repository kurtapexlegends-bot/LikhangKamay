<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();

                if (!Schema::hasColumn('orders', 'order_type')) {
                    $table->string('order_type', 32)->default('online')->after('artisan_id');
                    $table->index('order_type');
                }
                if (!Schema::hasColumn('orders', 'pos_cash_tendered')) {
                    $table->decimal('pos_cash_tendered', 10, 2)->nullable()->after('total_amount');
                }
                if (!Schema::hasColumn('orders', 'pos_change_amount')) {
                    $table->decimal('pos_change_amount', 10, 2)->nullable()->after('pos_cash_tendered');
                }
                if (!Schema::hasColumn('orders', 'pos_payment_reference')) {
                    $table->string('pos_payment_reference', 100)->nullable()->after('pos_change_amount');
                }
                if (!Schema::hasColumn('orders', 'pos_processed_by_user_id')) {
                    $table->foreignId('pos_processed_by_user_id')->nullable()->after('pos_payment_reference')->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'pos_gcash_qr_path')) {
                    $table->string('pos_gcash_qr_path', 500)->nullable()->after('payout_account_number');
                }
                if (!Schema::hasColumn('users', 'pos_maya_qr_path')) {
                    $table->string('pos_maya_qr_path', 500)->nullable()->after('pos_gcash_qr_path');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'pos_processed_by_user_id')) {
                    $table->dropConstrainedForeignId('pos_processed_by_user_id');
                }
                foreach (['pos_payment_reference', 'pos_change_amount', 'pos_cash_tendered'] as $column) {
                    if (Schema::hasColumn('orders', $column)) {
                        $table->dropColumn($column);
                    }
                }
                if (Schema::hasColumn('orders', 'order_type')) {
                    $table->dropIndex(['order_type']);
                    $table->dropColumn('order_type');
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                foreach (['pos_maya_qr_path', 'pos_gcash_qr_path'] as $column) {
                    if (Schema::hasColumn('users', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
