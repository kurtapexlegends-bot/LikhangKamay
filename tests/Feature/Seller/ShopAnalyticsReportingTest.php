<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\ShopAnalyticsService;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ShopAnalyticsReportingTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private ShopAnalyticsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new ShopAnalyticsService();

        $this->owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        // Compliance agreement for workspace access
        \App\Models\SellerComplianceAgreement::create([
            'user_id' => $this->owner->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);
    }

    public function test_analytics_correctly_aggregates_sales_and_order_metrics(): void
    {
        // Completed orders
        $this->createOrder([
            'status' => 'Completed',
            'seller_net_amount' => 150.00,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        $this->createOrder([
            'status' => 'Completed',
            'seller_net_amount' => 250.00,
            'created_at' => Carbon::now(),
        ]);

        // Processing order (should not count towards total completed sales)
        $this->createOrder([
            'status' => 'Processing',
            'seller_net_amount' => 100.00,
            'created_at' => Carbon::now(),
        ]);

        // Cancelled order
        $this->createOrder([
            'status' => 'Cancelled',
            'seller_net_amount' => 300.00,
            'created_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson(route('shop.analytics.rollup'));

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'date',
                    'daily' => ['sales', 'orders_count', 'completed_orders_count'],
                    'all_time' => ['total_sales', 'orders_count', 'aov', 'orders_by_status'],
                    'low_stock_alerts',
                    'generated_at',
                ],
            ]);

        $data = $response->json('data');

        // All-Time sales = 150 + 250 = 400.00
        $this->assertEquals(400.00, $data['all_time']['total_sales']);
        $this->assertEquals(2, $data['all_time']['orders_count']); // Completed count
        $this->assertEquals(200.00, $data['all_time']['aov']); // 400 / 2 = 200

        // Status breakdown
        $statusBreakdown = $data['all_time']['orders_by_status'];
        $this->assertEquals(2, $statusBreakdown['Completed']);
        $this->assertEquals(1, $statusBreakdown['Processing']);
        $this->assertEquals(1, $statusBreakdown['Cancelled']);
        $this->assertEquals(0, $statusBreakdown['Pending']);
    }

    public function test_analytics_correctly_detects_low_stock_products(): void
    {
        // 2 low-stock products (threshold = 5)
        $this->createProduct([
            'status' => 'Active',
            'stock' => 3,
            'name' => 'Low Stock Cup',
            'sku' => 'CUP-1',
        ]);

        $this->createProduct([
            'status' => 'Active',
            'stock' => 1,
            'name' => 'Low Stock Mug',
            'sku' => 'MUG-1',
        ]);

        // 1 active product with plenty of stock
        $this->createProduct([
            'status' => 'Active',
            'stock' => 12,
            'name' => 'Plentiful Bowl',
            'sku' => 'BOWL-1',
        ]);

        // 1 inactive product with low stock (should be ignored)
        $this->createProduct([
            'status' => 'Draft',
            'stock' => 2,
            'name' => 'Inactive Vase',
            'sku' => 'VASE-1',
        ]);

        $rollup = $this->service->getAnalyticsRollup($this->owner->id, null, 5);
        $alerts = $rollup['low_stock_alerts'];

        $this->assertEquals(2, $alerts['count']);
        $this->assertEquals(5, $alerts['threshold']);

        $productNames = collect($alerts['products'])->pluck('name')->all();
        $this->assertContains('Low Stock Cup', $productNames);
        $this->assertContains('Low Stock Mug', $productNames);
        $this->assertNotContains('Plentiful Bowl', $productNames);
        $this->assertNotContains('Inactive Vase', $productNames);
    }

    public function test_analytics_cache_rollup_stores_data_and_evicts_on_events(): void
    {
        $today = Carbon::now(config('app.timezone'))->toDateString();
        $cacheKey = "seller_{$this->owner->id}_analytics_daily_rollup_{$today}";

        // 1. Initial request triggers calculation
        $this->service->getAnalyticsRollup($this->owner->id, $today);
        $this->assertTrue(Cache::has($cacheKey));

        // 2. Event invalidation: updating product stock should evict the cache
        $product = $this->createProduct(['stock' => 10]);
        $product->update(['stock' => 3]); // Fires saved event

        $this->assertFalse(Cache::has($cacheKey));

        // Recalculate
        $this->service->getAnalyticsRollup($this->owner->id, $today);
        $this->assertTrue(Cache::has($cacheKey));

        // 3. Event invalidation: saving an order should evict the cache
        $this->createOrder([]); // Fires saved event
        
        $this->assertFalse(Cache::has($cacheKey));
    }

    public function test_analytics_dashboard_receives_rollup_metrics(): void
    {
        // 1. Create a product with low stock so we have an alert
        $this->createProduct([
            'status' => 'Active',
            'stock' => 2,
            'name' => 'Visual Low Stock Alert Product',
        ]);

        // 2. Create an order (5 hours ago, accepted 2 hours ago)
        $now = Carbon::now();
        $this->createOrder([
            'status' => 'Completed',
            'created_at' => $now->copy()->subHours(5),
            'accepted_at' => $now->copy()->subHours(2),
        ]);

        // 3. Request the visual analytics index route
        $response = $this->actingAs($this->owner)
            ->get(route('analytics.index'));

        // 4. Assert response is successful and has Inertia data
        $response->assertOk();

        // Retrieve Inertia props passed to the view
        $inertiaData = $response->original->getData()['page']['props'];

        // Assert low stock products are injected
        $this->assertArrayHasKey('low_stock_products', $inertiaData['insights']);
        $this->assertCount(1, $inertiaData['insights']['low_stock_products']);
        $this->assertEquals('Visual Low Stock Alert Product', $inertiaData['insights']['low_stock_products'][0]['name']);
    }

    private function createProduct(array $attributes): Product
    {
        $product = new Product();
        $product->forceFill(array_merge([
            'user_id' => $this->owner->id,
            'sku' => 'SKU-' . strtoupper(fake()->bothify('??###')),
            'name' => 'Test Product',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 100.00,
            'cost_price' => 50.00,
            'stock' => 10,
            'lead_time' => 3,
            'sold' => 0,
            'track_as_supply' => false,
        ], $attributes));
        
        $product->timestamps = false;
        $product->save();

        return $product;
    }

    private function createOrder(array $attributes): Order
    {
        $order = new Order();
        $order->forceFill(array_merge([
            'artisan_id' => $this->owner->id,
            'user_id' => User::factory()->create()->id,
            'order_number' => 'ORD-' . strtoupper(fake()->bothify('??#####')),
            'customer_name' => 'Buyer Test',
            'total_amount' => 100.00,
            'merchandise_subtotal' => 100.00,
            'convenience_fee_amount' => 0.00,
            'shipping_fee_amount' => 0.00,
            'platform_commission_amount' => 5.00,
            'seller_net_amount' => 95.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ], $attributes));
        
        $order->timestamps = false;
        $order->save();

        return $order;
    }

    public function test_analytics_snapshots_generation_and_financial_metrics(): void
    {
        // 1. Create order
        $order = $this->createOrder([
            'status' => 'Completed',
            'created_at' => Carbon::now(),
        ]);

        // 2. Create order item
        $product = $this->createProduct([
            'price' => 150.00,
            'cost_price' => 50.00,
        ]);

        $orderItem = new \App\Models\OrderItem();
        $orderItem->forceFill([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'price' => 150.00,
            'cost' => 50.00,
            'created_at' => Carbon::now(),
        ]);
        $orderItem->save();

        // 3. Run the console command to generate snapshots
        $this->artisan('app:generate-analytics-snapshots', ['--backfill' => true])
            ->assertSuccessful();

        // 4. Assert snapshot exists in database
        $this->assertDatabaseHas('seller_analytics_snapshots', [
            'seller_id' => $this->owner->id,
            'revenue' => 300.00, // 150.00 * 2
            'cost' => 100.00,    // 50.00 * 2
            'orders_count' => 1,
        ]);



        // 5. Query metrics service and assert values
        $metricsService = new ShopAnalyticsMetricsService();
        $metrics = $metricsService->getFinancialMetrics($this->owner->id);

        $this->assertEquals(300.00, $metrics['current']['revenue']);
        $this->assertEquals(100.00, $metrics['current']['cost']);
        $this->assertEquals(200.00, $metrics['current']['profit']); // 300 - 100
        $this->assertEquals(1, $metrics['current']['orders']);
        $this->assertEquals(300.00, $metrics['current']['avg']); // 300 / 1
        $this->assertEquals(66.7, round($metrics['current']['margin'], 1)); // (200 / 300) * 100 = 66.666...
    }
}
