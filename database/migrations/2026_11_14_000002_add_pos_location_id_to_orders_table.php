<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'pos_location_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('pos_location_id')
                    ->nullable()
                    ->after('pos_processed_by_user_id')
                    ->constrained('seller_locations')
                    ->nullOnDelete();

                $table->index(
                    ['artisan_id', 'order_type', 'pos_location_id'],
                    'orders_pos_branch_lookup_idx'
                );
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'pos_location_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex('orders_pos_branch_lookup_idx');
                $table->dropConstrainedForeignId('pos_location_id');
            });
        }
    }
};
