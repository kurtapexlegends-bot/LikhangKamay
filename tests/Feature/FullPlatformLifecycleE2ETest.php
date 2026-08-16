<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Services\AccountingLedgerService;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Services\SponsorshipAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FullPlatformLifecycleE2ETest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_platform_lifecycle_from_start_to_finish(): void
    {
        // ==========================================
        // 1. SEED TAXONOMY & PLATFORM SETTINGS
        // ==========================================
        $category = Category::create([
            'name' => 'Ceramics & Pottery',
            'slug' => 'ceramics-pottery',
            'is_active' => true,
        ]);

        // ==========================================
        // 2. ADMIN ONBOARDING
        // ==========================================
        $superAdmin = User::factory()->superAdmin()->create([
            'name' => 'Super Admin LikhangKamay',
            'email' => 'admin@likhangkamay.app',
        ]);

        // ==========================================
        // 3. ARTISAN REGISTRATION & SHOP CREATION
        // ==========================================
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Kurt Artisan',
            'email' => 'kurtapexlegends@gmail.com',
            'shop_name' => 'Kurt Pottery Works',
            'shop_slug' => 'kurt-pottery-works',
            'premium_tier' => 'super_premium',
            'region' => 'Region IV-A',
            'city' => 'Tagaytay',
            'street_address' => '123 Artisan Village',
        ]);

        $this->actingAs($artisan)
            ->get(route('dashboard'))
            ->assertOk();

        // ==========================================
        // 4. PRODUCT CREATION (PENDING REVIEW)
        // ==========================================
        $product = Product::create([
            'user_id' => $artisan->id,
            'name' => 'Handcrafted Blue Terracotta Planter',
            'slug' => 'handcrafted-blue-terracotta-planter',
            'sku' => 'KPW-PLANTER-001',
            'description' => 'A beautiful handcrafted terracotta planter glazed in natural indigo.',
            'category' => 'Ceramics & Pottery',
            'clay_type' => 'Terracotta',
            'price' => 850.00,
            'cost' => 450.00,
            'stock' => 20,
            'sold' => 0,
            'status' => 'pending_review',
            'cover_photo_path' => 'products/covers/planter.jpg',
        ]);

        $this->assertEquals('pending_review', $product->fresh()->status);

        // ==========================================
        // 5. SUPER ADMIN CATALOG MODERATION (APPROVE)
        // ==========================================
        $this->actingAs($superAdmin)
            ->post(route('admin.catalog.moderate'), [
                'ids' => [$product->id],
                'action' => 'approve',
            ])
            ->assertSessionHasNoErrors();

        $this->assertEquals('Active', $product->fresh()->status);

        // ==========================================
        // 6. BUYER REGISTRATION & CATALOG BROWSING
        // ==========================================
        $buyer = User::factory()->create([
            'name' => 'Kurt Stanley Buyer',
            'email' => 'kurtstanleytalastas@gmail.com',
            'role' => 'buyer',
            'region' => 'NCR',
            'city' => 'Manila',
            'street_address' => '456 Rizal Avenue',
            'phone_number' => '09123456789',
        ]);

        // Buyer searches marketplace
        $this->actingAs($buyer)
            ->get(route('shop.index', ['search' => 'Terracotta']))
            ->assertOk();

        // Buyer checks product details
        $this->actingAs($buyer)
            ->get(route('product.show', $product->slug))
            ->assertOk();

        // ==========================================
        // 7. BUYER WISHLIST & SHOP FOLLOW
        // ==========================================
        $this->actingAs($buyer)
            ->postJson(route('buyer.wishlist.toggle'), ['product_id' => $product->id])
            ->assertOk()
            ->assertJson(['is_wishlisted' => true]);

        $this->actingAs($buyer)
            ->postJson(route('buyer.shops.toggle-follow'), ['shop_id' => $artisan->id])
            ->assertOk()
            ->assertJson(['is_followed' => true]);

        // ==========================================
        // 8. CART OPERATIONS & CHECKOUT
        // ==========================================
        $this->actingAs($buyer)
            ->post(route('cart.store'), [
                'product_id' => $product->id,
                'quantity' => 2,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($buyer)
            ->get(route('cart.index'))
            ->assertOk();

        // Place order
        $order = Order::create([
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'status' => 'Pending',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'merchandise_subtotal' => 1700.00,
            'shipping_fee_amount' => 150.00,
            'total_amount' => 1850.00,
            'seller_net_amount' => 1700.00,
            'shipping_address' => '456 Rizal Avenue, Manila',
            'shipping_recipient_name' => $buyer->name,
            'shipping_contact_phone' => $buyer->phone_number,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 850.00,
            'cost' => 450.00,
            'quantity' => 2,
            'subtotal' => 1700.00,
        ]);

        // Decrement product stock
        $product->decrement('stock', 2);
        $product->increment('sold', 2);
        $this->assertEquals(18, $product->fresh()->stock);
        $this->assertEquals(2, $product->fresh()->sold);

        // ==========================================
        // 9. ARTISAN ORDER FULFILLMENT WORKFLOW
        // ==========================================
        $this->actingAs($artisan)
            ->get(route('orders.index'))
            ->assertOk();

        // Artisan / Courier delivers package
        $order->update([
            'status' => 'Delivered',
            'delivered_at' => now(),
            'tracking_number' => 'LLM-TRK-987654321',
        ]);

        // Buyer receives package and confirms
        $this->actingAs($buyer)
            ->post(route('my-orders.receive', $order->id))
            ->assertSessionHasNoErrors();

        $this->assertEquals('Completed', $order->fresh()->status);

        // ==========================================
        // 10. PRODUCT REVIEW SUBMISSION
        // ==========================================
        $this->actingAs($buyer)
            ->post(route('reviews.store'), [
                'order_id' => $order->id,
                'product_id' => $product->id,
                'rating' => 5,
                'comment' => 'Exceptional quality terracotta planter! Arrived in pristine condition.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('reviews', [
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 5,
        ]);

        // ==========================================
        // 11. PROCUREMENT & ACCOUNTING RELEASE
        // ==========================================
        $supply = Supply::create([
            'user_id' => $artisan->id,
            'name' => 'High Grade Terracotta Raw Clay',
            'sku' => 'SUP-CLAY-001',
            'category' => 'Other',
            'unit' => 'kg',
            'unit_cost' => 50.00,
            'quantity' => 10,
            'min_stock' => 5,
            'max_stock' => 200,
        ]);

        $stockRequest = StockRequest::create([
            'user_id' => $artisan->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 500.00,
            'status' => 'pending',
        ]);

        // Accounting approves release
        $approveResponse = $this->actingAs($artisan)
            ->post(route('accounting.approve', $stockRequest->id));
        $approveResponse->assertSessionMissing('error');
        $approveResponse->assertSessionHasNoErrors();

        $this->assertEquals('accounting_approved', $stockRequest->fresh()->status);

        // Procurement receives shipment
        $this->actingAs($artisan)
            ->post(route('procurement.receive', $stockRequest->id))
            ->assertSessionHasNoErrors();

        $this->assertEquals('completed', $stockRequest->fresh()->status);
        $this->assertEquals(20, $supply->fresh()->quantity);

        // ==========================================
        // 12. HR, STAFF & PAYROLL
        // ==========================================
        $employee = Employee::create([
            'user_id' => $artisan->id,
            'employee_id' => 'EMP-001',
            'name' => 'Yashica Acosta',
            'role' => 'Master Glazer',
            'salary' => 25000.00,
            'join_date' => now()->subMonths(6)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $this->actingAs($artisan)
            ->get(route('hr.index'))
            ->assertOk();

        // ==========================================
        // 13. SELLER ANALYTICS & INSIGHTS
        // ==========================================
        \Illuminate\Support\Facades\Cache::flush();
        $metricsService = app(ShopAnalyticsMetricsService::class);
        $metrics = $metricsService->getSellerDashboardMetrics($artisan->id);

        $this->assertIsArray($metrics);
        $this->assertArrayHasKey('revenueData', $metrics);
        $this->assertEquals(1700.00, $metrics['revenueData']['value']);

        // ==========================================
        // 14. ADMIN PLATFORM AUDIT & OPERATIONS
        // ==========================================
        $this->actingAs($superAdmin)
            ->get(route('admin.dashboard'))
            ->assertOk();

        $this->actingAs($superAdmin)
            ->get(route('admin.operations'))
            ->assertOk();
    }
}
