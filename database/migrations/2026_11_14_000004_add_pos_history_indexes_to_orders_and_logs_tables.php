<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && !$this->hasIndex('orders', 'orders_pos_history_id_idx')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index(['artisan_id', 'order_type', 'id'], 'orders_pos_history_id_idx');
            });
        }

        if (Schema::hasTable('seller_activity_logs') && !$this->hasIndex('seller_activity_logs', 'seller_logs_pos_subject_idx')) {
            Schema::table('seller_activity_logs', function (Blueprint $table) {
                $table->index(['seller_owner_id', 'event_type', 'subject_id'], 'seller_logs_pos_subject_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders') && $this->hasIndex('orders', 'orders_pos_history_id_idx')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex('orders_pos_history_id_idx');
            });
        }

        if (Schema::hasTable('seller_activity_logs') && $this->hasIndex('seller_activity_logs', 'seller_logs_pos_subject_idx')) {
            Schema::table('seller_activity_logs', function (Blueprint $table) {
                $table->dropIndex('seller_logs_pos_subject_idx');
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        try {
            foreach (Schema::getIndexes($table) as $index) {
                if (($index['name'] ?? null) === $indexName) {
                    return true;
                }
            }
        } catch (\Throwable) {
            return false;
        }

        return false;
    }
};
