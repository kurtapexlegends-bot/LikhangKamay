<?php

namespace Tests\Feature\Audit;

use App\Console\Commands\GenerateAnalyticsSnapshots;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerAnalyticsSnapshot;
use App\Models\User;
use App\Services\Admin\AdminAnalyticsService;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Services\ShopAnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTestOrderIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private User $realBuyer;
    private User $testBuyer;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->artisanApproved()->create([
            'is_test' => false,
            'premium_tier' => 'super_premium',
        ]);

        $this->realBuyer = User::factory()->create([
            'role' => 'buyer',
            'is_test' => false,
        ]);

        $this->testBuyer = User::factory()->create([
            'role' => 'buyer',
            'is_test' => true,
        ]);

        $this->product = Product::create([
            'user_id' => $this->artisan->id,
            'artisan_id' => $this->artisan->id,
            'name' => 'Handcrafted Terracotta Vase',
            'sku' => 'VASE-001',
            'category' => 'Pottery & Ceramics',
            'price' => 500.00,
            'cost_price' => 200.00,
            'stock' => 50,
            'lead_time' => 1,
            'status' => 'Active',
        ]);
    }

    public function test_artisan_shop_analytics_strictly_ignores_test_orders(): void
    {
        // 1. Create a real completed order of ₱500
        $realOrder = Order::create([
            'order_number' => 'ORD-REAL-001',
            'user_id' => $this->realBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->realBuyer->name,
            'total_amount' => 500.00,
            'merchandise_subtotal' => 500.00,
            'seller_net_amount' => 475.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => false,
            'created_at' => Carbon::now(),
        ]);

        OrderItem::create([
            'order_id' => $realOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 1,
            'price' => 500.00,
            'cost' => 200.00,
        ]);

        // 2. Create a synthetic test order of ₱99,999 (is_test = true)
        $testOrder = Order::create([
            'order_number' => 'ORD-TEST-999',
            'user_id' => $this->testBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->testBuyer->name,
            'total_amount' => 99999.00,
            'merchandise_subtotal' => 99999.00,
            'seller_net_amount' => 99999.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => true,
            'created_at' => Carbon::now(),
        ]);

        OrderItem::create([
            'order_id' => $testOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 10,
            'price' => 9999.90,
            'cost' => 1000.00,
        ]);

        // 3. Test ShopAnalyticsMetricsService
        $metricsService = new ShopAnalyticsMetricsService();
        $financial = $metricsService->getFinancialMetrics($this->artisan->id);

        // Revenue should be exactly 500.00, orders count exactly 1 (not 99,999 or 2 orders)
        $this->assertEquals(500.00, $financial['current']['revenue']);
        $this->assertEquals(200.00, $financial['current']['cost']);
        $this->assertEquals(300.00, $financial['current']['profit']);
        $this->assertEquals(1, $financial['current']['orders']);

        // Dashboard metrics
        $dashboardMetrics = $metricsService->getSellerDashboardMetrics($this->artisan->id);
        $this->assertEquals(475.00, $dashboardMetrics['revenueData']['value']);
        $this->assertEquals(1, $dashboardMetrics['ordersData']['value']);

        // Category performance
        $catPerf = $metricsService->getCategoryPerformance($this->artisan->id);
        $this->assertEquals(1, $catPerf->sum('value')); // 1 item sold, not 11

        // Top products
        $topProducts = $metricsService->getTopProducts($this->artisan->id);
        $this->assertEquals(1, $topProducts->first()['sales']); // 1 sold, not 11

        // 4. Test ShopAnalyticsService (Rollup)
        $shopService = new ShopAnalyticsService();
        $rollup = $shopService->getAnalyticsRollup($this->artisan->id);
        $this->assertEquals(475.00, $rollup['all_time']['total_sales']);
        $this->assertEquals(1, $rollup['all_time']['orders_count']);
    }

    public function test_admin_analytics_strictly_ignores_test_orders_and_test_artisans(): void
    {
        // Real artisan and order
        $realOrder = Order::create([
            'order_number' => 'ORD-REAL-ADMIN',
            'user_id' => $this->realBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->realBuyer->name,
            'total_amount' => 1000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => false,
            'created_at' => Carbon::now(),
        ]);

        OrderItem::create([
            'order_id' => $realOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 2,
            'price' => 500.00,
            'cost' => 200.00,
        ]);

        // Synthetic test order
        $testOrder = Order::create([
            'order_number' => 'ORD-TEST-ADMIN',
            'user_id' => $this->testBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->testBuyer->name,
            'total_amount' => 500000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => true,
            'created_at' => Carbon::now(),
        ]);

        // Synthetic test artisan
        $testArtisan = User::factory()->artisanApproved()->create([
            'is_test' => true,
            'shop_name' => 'Fake Test Artisan',
        ]);

        Order::create([
            'order_number' => 'ORD-TEST-ARTISAN-ORDER',
            'user_id' => $this->testBuyer->id,
            'artisan_id' => $testArtisan->id,
            'customer_name' => $this->testBuyer->name,
            'total_amount' => 250000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => true,
            'created_at' => Carbon::now(),
        ]);

        $adminService = new AdminAnalyticsService();
        $insights = $adminService->getInsightsData();

        // GMV should only include the ₱1,000 order, completely excluding the ₱750,000 synthetic test orders
        $this->assertEquals(1000.00, $insights['transactions']['currentGmv']);

        // Top artisans should only list real artisan, not testArtisan
        $topArtisanNames = collect($insights['topArtisans'])->pluck('shop_name')->all();
        $this->assertNotContains('Fake Test Artisan', $topArtisanNames);
    }

    public function test_daily_analytics_snapshots_generator_ignores_test_orders(): void
    {
        // 1. Real order
        $realOrder = Order::create([
            'order_number' => 'ORD-SNAP-REAL',
            'user_id' => $this->realBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->realBuyer->name,
            'total_amount' => 200.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => false,
            'created_at' => Carbon::now(),
        ]);

        OrderItem::create([
            'order_id' => $realOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 1,
            'price' => 200.00,
            'cost' => 80.00,
            'created_at' => Carbon::now(),
        ]);

        // 2. Test order
        $testOrder = Order::create([
            'order_number' => 'ORD-SNAP-TEST',
            'user_id' => $this->testBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->testBuyer->name,
            'total_amount' => 50000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => true,
            'created_at' => Carbon::now(),
        ]);

        OrderItem::create([
            'order_id' => $testOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 10,
            'price' => 5000.00,
            'cost' => 1000.00,
            'created_at' => Carbon::now(),
        ]);

        // Run snapshot command
        $this->artisan('app:generate-analytics-snapshots', ['--backfill' => true])
            ->assertSuccessful();

        $snapshot = SellerAnalyticsSnapshot::where('seller_id', $this->artisan->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(200.00, (float) $snapshot->revenue);
        $this->assertEquals(80.00, (float) $snapshot->cost);
        $this->assertEquals(1, (int) $snapshot->orders_count);
    }

    public function test_slow_movers_and_reviews_strictly_ignore_test_orders_and_personas(): void
    {
        // 1. Slow movers test:
        // Product has a test order within 30 days, but NO real orders.
        // It must STILL be classified as a slow mover.
        $testOrder = Order::create([
            'order_number' => 'ORD-SLOW-TEST',
            'user_id' => $this->testBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->testBuyer->name,
            'total_amount' => 500.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => true,
            'created_at' => Carbon::now()->subDays(5),
        ]);

        OrderItem::create([
            'order_id' => $testOrder->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 1,
            'price' => 500.00,
            'cost' => 200.00,
            'created_at' => Carbon::now()->subDays(5),
        ]);

        $metricsService = new ShopAnalyticsMetricsService();
        $salesIntelligence = $metricsService->getSalesIntelligence($this->artisan->id);
        $slowMoverIds = collect($salesIntelligence['slow_movers'])->pluck('id')->all();

        // Product MUST be present in slow_movers despite having a test order
        $this->assertContains($this->product->id, $slowMoverIds);

        // 2. Reviews test:
        // Real buyer leaves 5-star review
        Review::create([
            'user_id' => $this->realBuyer->id,
            'product_id' => $this->product->id,
            'rating' => 5,
            'comment' => 'Genuine artisan masterpiece!',
        ]);

        // Test buyer leaves 1-star review
        Review::create([
            'user_id' => $this->testBuyer->id,
            'product_id' => $this->product->id,
            'rating' => 1,
            'comment' => 'Synthetic test review that must be ignored.',
        ]);

        $reviewStats = $metricsService->getReviewStats($this->artisan->id);
        // Total reviews should be 1 (only the real buyer), average should be 5.0 (not 3.0)
        $this->assertEquals(1, $reviewStats['total']);
        $this->assertEquals(5.0, $reviewStats['average']);

        // Admin platform health reviews check (reviewRate = totalReviews / totalOrders * 100)
        // Add 1 real order so totalOrders = 1
        Order::create([
            'order_number' => 'ORD-HEALTH-REAL',
            'user_id' => $this->realBuyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->realBuyer->name,
            'total_amount' => 500.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
            'is_test' => false,
            'created_at' => Carbon::now()->subDays(1),
        ]);

        $adminService = new AdminAnalyticsService();
        $insights = $adminService->getInsightsData();
        // Since only 1 review is counted out of 1 order, reviewRate must be 100.0% (not 200.0%)
        $this->assertEquals(100.0, $insights['health']['reviewRate']);
    }
}

