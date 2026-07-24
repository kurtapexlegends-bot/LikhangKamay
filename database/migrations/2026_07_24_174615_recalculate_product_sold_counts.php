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
        $products = \App\Models\Product::all();

        foreach ($products as $product) {
            // 1. Get sum of completed orders
            $completedSold = \Illuminate\Support\Facades\DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('order_items.product_id', $product->id)
                ->where('orders.status', 'Completed')
                ->sum('order_items.quantity');

            // 2. Get manual deductions from SellerActivityLog
            $manualDeductions = \Illuminate\Support\Facades\DB::table('seller_activity_logs')
                ->where('event_type', 'product_manual_deduction')
                ->get()
                ->sum(function($log) use ($product) {
                    if (str_contains($log->summary, "of {$product->name} were deducted")) {
                        preg_match('/^(\d+)/', $log->summary, $matches);
                        return isset($matches[1]) ? (int)$matches[1] : 0;
                    }
                    return 0;
                });

            $calculatedSold = (int)$completedSold + (int)$manualDeductions;

            $product->update(['sold' => $calculatedSold]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
