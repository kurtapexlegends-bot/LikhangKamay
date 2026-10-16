<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopAnalyticsMultiItemRevenueTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_chart_does_not_multiply_order_revenue_for_multi_item_orders_on_all_categories(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        // Single order with 300 net revenue
        $order = Order::create([
            'order_number' => 'ORD-ANL-001',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300.00,
            'convenience_fee_amount' => 10.00,
            'platform_commission_amount' => 15.00,
            'seller_net_amount' => 285.00,
            'total_amount' => 310.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Workshop Pickup - Cavite, Philippines',
            'created_at' => Carbon::now(),
        ]);

        // Create 3 separate items for this 1 order
        for ($i = 1; $i <= 3; $i++) {
            $product = Product::create([
                'user_id' => $seller->id,
                'sku' => "MULTI-ITEM-{$i}",
                'name' => "Product {$i}",
                'category' => 'Home Decor',
                'status' => 'Active',
                'price' => 100.00,
                'cost_price' => 50.00,
                'stock' => 10,
                'lead_time' => 3,
                'track_as_supply' => false,
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => 1,
                'price' => 100.00,
                'cost' => 50.00,
                'created_at' => Carbon::now(),
            ]);
        }

        $metricsService = new ShopAnalyticsMetricsService();
        $chartData = $metricsService->getSalesChartData($seller->id, 'All Categories');

        $currentMonthName = Carbon::now()->format('M');
        $currentMonthData = collect($chartData['monthly'])->firstWhere('name', $currentMonthName);

        $this->assertNotNull($currentMonthData);
        // Prior defect: 3 joined items * 285.00 = 855.00
        // Correct behavior: exactly 285.00
        $this->assertEquals(285.00, $currentMonthData['value']);
        $this->assertEquals(285.00, $currentMonthData['revenue']);

        $currentYearStr = Carbon::now()->format('Y');
        $currentYearData = collect($chartData['yearly'])->firstWhere('name', $currentYearStr);
        $this->assertNotNull($currentYearData);
        $this->assertEquals(285.00, $currentYearData['value']);
    }

    public function test_sales_chart_calculates_category_filtered_revenue_correctly_for_multi_item_order(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'order_number' => 'ORD-ANL-002',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350.00,
            'convenience_fee_amount' => 10.00,
            'platform_commission_amount' => 15.00,
            'seller_net_amount' => 335.00,
            'total_amount' => 360.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Workshop Pickup - Cavite, Philippines',
            'created_at' => Carbon::now(),
        ]);

        // Item 1: Ceramics (2 units @ 100.00 = 200.00)
        $ceramicsProduct = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CAT-CERAMICS',
            'name' => 'Ceramic Mug',
            'category' => 'Ceramics',
            'status' => 'Active',
            'price' => 100.00,
            'cost_price' => 40.00,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $ceramicsProduct->id,
            'product_name' => $ceramicsProduct->name,
            'quantity' => 2,
            'price' => 100.00,
            'cost' => 40.00,
            'created_at' => Carbon::now(),
        ]);

        // Item 2: Textiles (1 unit @ 150.00 = 150.00)
        $textilesProduct = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CAT-TEXTILES',
            'name' => 'Woven Scarf',
            'category' => 'Textiles',
            'status' => 'Active',
            'price' => 150.00,
            'cost_price' => 60.00,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $textilesProduct->id,
            'product_name' => $textilesProduct->name,
            'quantity' => 1,
            'price' => 150.00,
            'cost' => 60.00,
            'created_at' => Carbon::now(),
        ]);

        $metricsService = new ShopAnalyticsMetricsService();

        // 1. Filter by Ceramics
        $ceramicsData = $metricsService->getSalesChartData($seller->id, 'Ceramics');
        $currentMonthName = Carbon::now()->format('M');
        $ceramicsMonth = collect($ceramicsData['monthly'])->firstWhere('name', $currentMonthName);
        $this->assertEquals(200.00, $ceramicsMonth['value']);

        // 2. Filter by Textiles
        $textilesData = $metricsService->getSalesChartData($seller->id, 'Textiles');
        $textilesMonth = collect($textilesData['monthly'])->firstWhere('name', $currentMonthName);
        $this->assertEquals(150.00, $textilesMonth['value']);
    }
}
