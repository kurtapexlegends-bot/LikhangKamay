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
        if (Schema::hasTable('order_deliveries') && Schema::hasTable('orders')) {
            DB::table('order_deliveries')
                ->whereIn('order_id', function ($query) {
                    $query->select('id')->from('orders')->where('status', 'Pending');
                })
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive cleanup cannot and should not restore invalid orphaned records.
    }
};
