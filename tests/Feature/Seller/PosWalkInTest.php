<?php

namespace Tests\Feature\Seller;

use App\Actions\Seller\Orders\ListSellerOrders;
use App\Models\Discount;
use App\Models\Employee;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\SellerActivityLog;
use App\Models\SellerLocation;
use App\Models\StaffAttendanceSession;
use App\Models\Supply;
use App\Models\User;
use App\Services\AccountingLedgerService;
use App\Services\SettlementReportService;
use App\Services\ShopAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PosWalkInTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_index_lists_only_owned_active_retail_products(): void
    {
        $owner = $this->createSellerOwner();
        $otherSeller = $this->createSellerOwner();

        $activeRetail = $this->createProduct($owner, [
            'name' => 'Handwoven Abaca Tote',
            'sku' => 'POS-RETAIL-01',
            'status' => 'Active',
            'is_b2b_supply' => false,
            'price' => 450,
            'stock' => 12,
        ]);

        $this->createProduct($owner, [
            'name' => 'Draft Vase',
            'sku' => 'POS-DRAFT-01',
            'status' => 'Draft',
            'is_b2b_supply' => false,
        ]);

        $this->createProduct($owner, [
            'name' => 'Bulk B2B Clay',
            'sku' => 'POS-B2B-01',
            'status' => 'Active',
            'is_b2b_supply' => true,
        ]);

        $this->createProduct($otherSeller, [
            'name' => 'Other Studio Bowl',
            'sku' => 'OTHER-01',
            'status' => 'Active',
            'is_b2b_supply' => false,
        ]);

        $this->actingAs($owner)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/POS/Index')
                ->where('canEditPos', true)
                ->has('products', 1)
                ->where('products.0.id', $activeRetail->id)
                ->where('products.0.name', 'Handwoven Abaca Tote')
            );
    }

    public function test_walkin_cash_checkout_updates_inventory_computes_vat_and_renders_80mm_receipt(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner([
            'is_vat_registered' => true,
            'tax_business_name' => 'Cavite Clay Studio',
            'tin' => '123-456-789-000',
        ]);

        $product = $this->createProduct($owner, [
            'name' => 'Terracotta Pitcher',
            'sku' => 'TC-PITCH-01',
            'price' => 560.00,
            'stock' => 10,
            'sold' => 2,
        ]);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 1500.00,
                'customer_name' => 'Maria Clara',
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHas('posReceipt');

        $product->refresh();
        $this->assertSame(8, $product->stock);
        $this->assertSame(4, $product->sold);

        $order = Order::where('artisan_id', $owner->id)->firstOrFail();
        $this->assertSame(Order::TYPE_POS_WALKIN, $order->order_type);
        $this->assertNull($order->user_id);
        $this->assertSame('Completed', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('POS Cash', $order->payment_method);
        $this->assertSame('Walk-In POS', $order->shipping_method);
        $this->assertSame('Maria Clara', $order->customer_name);
        $this->assertEquals(1120.00, (float) $order->total_amount);
        $this->assertEquals(1500.00, (float) $order->pos_cash_tendered);
        $this->assertEquals(380.00, (float) $order->pos_change_amount);
        $this->assertSame($owner->id, $order->pos_processed_by_user_id);
        $this->assertSame('vat_inclusive', $order->vat_type);
        $this->assertEquals(1000.00, (float) $order->vatable_sales);
        $this->assertEquals(120.00, (float) $order->vat_amount);

        $this->assertDatabaseHas('seller_activity_logs', [
            'seller_owner_id' => $owner->id,
            'actor_user_id' => $owner->id,
            'event_type' => 'pos_walkin_completed',
            'title' => 'Walk-In POS Sale Completed',
        ]);

        $this->actingAs($owner)
            ->get(route('seller.pos.receipt', $order))
            ->assertOk()
            ->assertSee($order->order_number)
            ->assertSee('Terracotta Pitcher')
            ->assertSee('380.00');
    }

    public function test_manufactured_pos_sale_deducts_bom_and_rolls_back_on_material_shortage(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();

        $supply = Supply::create([
            'user_id' => $owner->id,
            'sku' => 'RAW-CLAY-POS',
            'name' => 'Stoneware Clay',
            'category' => 'Raw Clay',
            'quantity' => 6.0,
            'unit' => 'kg',
            'min_stock' => 2.0,
            'max_stock' => 50.0,
            'unit_cost' => 100.0,
        ]);

        $manufactured = $this->createProduct($owner, [
            'name' => 'Hand-Thrown Tea Bowl',
            'sku' => 'BOWL-MFG-01',
            'production_method' => 'manufactured',
            'price' => 300.00,
            'stock' => 5,
        ]);

        ProductRecipe::create([
            'product_id' => $manufactured->id,
            'supply_id' => $supply->id,
            'quantity_required' => 4.0,
        ]);

        // Ordering 2 requires 8.0kg clay (> 6.0kg available): must reject and rollback cleanly
        $this->actingAs($owner)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $manufactured->id, 'quantity' => 2],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 1000.00,
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHasErrors('items');

        $manufactured->refresh();
        $supply->refresh();
        $this->assertSame(5, $manufactured->stock);
        $this->assertEquals(6.0, (float) $supply->quantity);
        $this->assertSame(0, Order::where('artisan_id', $owner->id)->count());

        // Ordering 1 requires 4.0kg clay (<= 6.0kg available): succeeds and leaves 2.0kg
        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $manufactured->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 500.00,
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHasNoErrors();

        $manufactured->refresh();
        $supply->refresh();
        $this->assertSame(4, $manufactured->stock);
        $this->assertEquals(2.0, (float) $supply->quantity);
    }

    public function test_pos_ewallet_sales_count_toward_revenue_but_are_excluded_from_online_paymongo_payout_pool(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner(['base_funds' => 0]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = $this->createProduct($owner, [
            'price' => 1000.00,
            'stock' => 10,
        ]);

        // 1. Record direct walk-in POS GCash sale (PHP 1,000)
        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_gcash',
                'payment_reference' => 'GC-WALKIN-9911',
            ])
            ->assertRedirect(route('seller.pos.index'));

        // 2. Create completed online PayMongo GCash order (PHP 2,000)
        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => $buyer->id,
            'order_type' => Order::TYPE_ONLINE,
            'order_number' => 'ORD-ONLINE-PM-1',
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Bacoor, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 2000.00,
            'seller_net_amount' => 2000.00,
            'total_amount' => 2000.00,
        ]);

        $snapshot = app(AccountingLedgerService::class)->buildFinancialSnapshot($owner);
        $this->assertEquals(3000.00, $snapshot['revenue']);
        $this->assertEquals(2000.00, $snapshot['ready_for_payout']);

        $statement = app(SettlementReportService::class)->getMonthlyStatementData(
            $owner,
            (int) now()->year,
            (int) now()->month
        );
        $this->assertEquals(3000.00, $statement['summary']['net_earnings']);
        $this->assertEquals(1000.00, $statement['summary']['cod_sales']);
        $this->assertEquals(2000.00, $statement['summary']['online_sales']);
    }

    public function test_multi_tenant_idor_and_staff_readonly_rbac_are_enforced(): void
    {
        $owner = $this->createSellerOwner();
        $otherSeller = $this->createSellerOwner();

        $ownerProduct = $this->createProduct($owner, [
            'price' => 250.00,
            'stock' => 5,
        ]);

        $ownerOrder = Order::create([
            'artisan_id' => $owner->id,
            'user_id' => null,
            'order_type' => Order::TYPE_POS_WALKIN,
            'order_number' => 'POS-IDOR-001',
            'customer_name' => 'Walk-In Guest',
            'status' => 'Completed',
            'shipping_method' => 'Walk-In POS',
            'shipping_address' => 'In-Studio Walk-In',
            'payment_method' => 'POS Cash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 250.00,
            'seller_net_amount' => 250.00,
            'total_amount' => 250.00,
        ]);

        // Cross-tenant receipt access blocked
        $this->actingAs($otherSeller)
            ->get(route('seller.pos.receipt', $ownerOrder))
            ->assertForbidden();

        // Cross-tenant product checkout blocked
        $this->actingAs($otherSeller)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $ownerProduct->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300.00,
            ])
            ->assertSessionHasErrors('items');

        // Read-only clocked-in staff can view POS but cannot checkout or update QR settings
        $readOnlyStaff = $this->createStaff($owner, [
            'orders' => true,
        ], User::STAFF_ACCESS_PERMISSION_READ_ONLY);
        $this->clockInStaff($readOnlyStaff);

        $this->actingAs($readOnlyStaff)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/POS/Index')
                ->where('canEditPos', false)
            );

        $this->actingAs($readOnlyStaff)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $ownerProduct->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300.00,
            ])
            ->assertForbidden();

        $this->actingAs($readOnlyStaff)
            ->post(route('seller.pos.qr-settings'), [
                'pos_gcash_qr_key' => 'shops/unauthorized-qr.png',
            ])
            ->assertForbidden();

        // Editable clocked-in cashier staff CAN process walk-in checkout and is tracked as cashier
        $cashierStaff = $this->createStaff($owner, [
            'orders' => true,
        ], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $this->clockInStaff($cashierStaff);

        $this->actingAs($cashierStaff)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $ownerProduct->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300.00,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $cashierOrder = Order::where('artisan_id', $owner->id)
            ->where('pos_processed_by_user_id', $cashierStaff->id)
            ->first();
        $this->assertNotNull($cashierOrder);
    }

    public function test_seller_can_update_and_clear_walkin_qr_settings(): void
    {
        $owner = $this->createSellerOwner();

        $this->actingAs($owner)
            ->post(route('seller.pos.qr-settings'), [
                'pos_gcash_qr_key' => 'shops/gcash-test-qr.png',
                'pos_maya_qr_key' => 'shops/maya-test-qr.png',
            ])
            ->assertRedirect(route('seller.pos.index'));

        $owner->refresh();
        $this->assertSame('shops/gcash-test-qr.png', $owner->pos_gcash_qr_path);
        $this->assertSame('shops/maya-test-qr.png', $owner->pos_maya_qr_path);

        $this->actingAs($owner)
            ->post(route('seller.pos.qr-settings'), [
                'clear_gcash_qr' => true,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $owner->refresh();
        $this->assertNull($owner->pos_gcash_qr_path);
        $this->assertSame('shops/maya-test-qr.png', $owner->pos_maya_qr_path);
    }

    public function test_duplicate_lines_merge_insufficient_stock_rejects_and_supply_sync_and_caches_clear(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $product = $this->createProduct($owner, [
            'name' => 'Woven Placemat',
            'price' => 200.00,
            'stock' => 5,
            'track_as_supply' => true,
        ]);

        $supply = Supply::create([
            'user_id' => $owner->id,
            'product_id' => $product->id,
            'sku' => 'RESELL-SUP-01',
            'name' => 'Woven Placemat Batch',
            'category' => 'Tableware',
            'quantity' => 5,
            'unit' => 'pcs',
            'min_stock' => 2,
            'max_stock' => 50,
            'unit_cost' => 80,
        ]);

        // Duplicate product_id rows summing to 6 > 5 stock must fail cleanly
        $this->actingAs($owner)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 3],
                    ['product_id' => $product->id, 'quantity' => 3],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 1500.00,
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHasErrors('items');

        $product->refresh();
        $supply->refresh();
        $this->assertSame(5, $product->stock);
        $this->assertEquals(5, (float) $supply->quantity);

        // Prime analytics/dashboard caches and confirm checkout invalidates them
        $today = now(config('app.timezone'))->toDateString();
        Cache::put("seller_dashboard_metrics_{$owner->id}", ['stale' => true], 300);
        Cache::put("seller_{$owner->id}_analytics_daily_rollup_{$today}", ['stale' => true], 300);
        Cache::put("seller_analytics_data_{$owner->id}_" . md5('All Categories'), ['stale' => true], 300);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 600.00,
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHasNoErrors();

        $product->refresh();
        $supply->refresh();
        $this->assertSame(2, $product->stock);
        $this->assertEquals(2, (float) $supply->quantity);
        $this->assertFalse(Cache::has("seller_dashboard_metrics_{$owner->id}"));
        $this->assertFalse(Cache::has("seller_{$owner->id}_analytics_daily_rollup_{$today}"));
        $this->assertFalse(Cache::has("seller_analytics_data_{$owner->id}_" . md5('All Categories')));
    }

    public function test_promo_max_purchase_limit_splits_order_items_without_rounding_drift(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $product = $this->createProduct($owner, [
            'name' => 'Limited Glazed Mug',
            'price' => 200.00,
            'stock' => 10,
        ]);

        $discount = Discount::create([
            'user_id' => $owner->id,
            'name' => 'Opening Special',
            'type' => 'fixed',
            'value' => 100.00,
            'promo_stock' => 20,
            'promo_sold' => 0,
            'max_purchase_limit' => 2,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDay(),
            'is_active' => true,
            'is_followers_only' => false,
        ]);
        $discount->products()->attach($product->id);

        // Qty 3: 2 @ PHP 100.00 + 1 @ PHP 200.00 = PHP 400.00 exact
        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 3],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 400.00,
            ])
            ->assertRedirect(route('seller.pos.index'))
            ->assertSessionHasNoErrors();

        $order = Order::with('items')->where('artisan_id', $owner->id)->firstOrFail();
        $this->assertEquals(400.00, (float) $order->total_amount);
        $this->assertCount(2, $order->items);

        $itemSum = $order->items->sum(fn ($item) => round((float) $item->price * (int) $item->quantity, 2));
        $this->assertEquals(400.00, round($itemSum, 2));

        $discount->refresh();
        $this->assertSame(2, (int) $discount->promo_sold);
    }

    public function test_unclocked_staff_and_staff_without_orders_permission_are_blocked_and_order_filters_separate_pos(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Unclocked staff with orders permission is redirected to staff dashboard
        $unclockedStaff = $this->createStaff($owner, ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $this->actingAs($unclockedStaff)
            ->get(route('seller.pos.index'))
            ->assertRedirect(route('staff.dashboard'));

        // Clocked-in staff without orders permission gets 403
        $stockOnlyStaff = $this->createStaff($owner, ['procurement' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $this->clockInStaff($stockOnlyStaff);
        $this->actingAs($stockOnlyStaff)
            ->get(route('seller.pos.index'))
            ->assertForbidden();

        // ListSellerOrders separates online PayMongo GCash vs Walk-In POS GCash and POS Cash
        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => $buyer->id,
            'order_type' => Order::TYPE_ONLINE,
            'order_number' => 'ORD-ONLINE-FILTER-1',
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Bacoor, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 500.00,
            'seller_net_amount' => 500.00,
            'total_amount' => 500.00,
        ]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => null,
            'order_type' => Order::TYPE_POS_WALKIN,
            'order_number' => 'POS-FILTER-GCASH',
            'customer_name' => 'Walk-In Guest',
            'status' => 'Completed',
            'shipping_method' => 'Walk-In POS',
            'shipping_address' => 'Cavite Studio',
            'payment_method' => 'POS GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 300.00,
            'seller_net_amount' => 300.00,
            'total_amount' => 300.00,
        ]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => null,
            'order_type' => Order::TYPE_POS_WALKIN,
            'order_number' => 'POS-FILTER-CASH',
            'customer_name' => 'Walk-In Cash',
            'status' => 'Completed',
            'shipping_method' => 'Walk-In POS',
            'shipping_address' => 'Cavite Studio',
            'payment_method' => 'POS Cash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 250.00,
            'seller_net_amount' => 250.00,
            'total_amount' => 250.00,
        ]);

        $lister = app(ListSellerOrders::class);

        $paymongoFiltered = $lister->execute($owner->id, $owner, ['payment_method' => 'paymongo']);
        $this->assertSame(['ORD-ONLINE-FILTER-1'], $paymongoFiltered['orders']->pluck('order_number')->all());

        $posFiltered = $lister->execute($owner->id, $owner, ['payment_method' => 'pos']);
        $this->assertEqualsCanonicalizing(['POS-FILTER-GCASH', 'POS-FILTER-CASH'], $posFiltered['orders']->pluck('order_number')->all());

        $manualFiltered = $lister->execute($owner->id, $owner, ['payment_method' => 'manual']);
        $this->assertSame(['POS-FILTER-CASH'], $manualFiltered['orders']->pluck('order_number')->all());

        $walkInTabFiltered = $lister->execute($owner->id, $owner, ['status' => 'Walk-In']);
        $this->assertSame(2, $walkInTabFiltered['tabCounts']['Walk-In']);
        $this->assertEqualsCanonicalizing(['POS-FILTER-GCASH', 'POS-FILTER-CASH'], $walkInTabFiltered['orders']->pluck('order_number')->all());
    }

    public function test_pos_sale_can_be_voided_restoring_inventory_bom_promo_and_excluding_from_revenue(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $otherSeller = $this->createSellerOwner();
        $readOnlyStaff = $this->createStaff($owner, ['orders'], User::STAFF_ACCESS_PERMISSION_READ_ONLY);
        $this->clockInStaff($readOnlyStaff);

        $supply = Supply::create([
            'user_id' => $owner->id,
            'sku' => 'VOID-CLAY-01',
            'name' => 'Porcelain Clay',
            'category' => 'Clay',
            'quantity' => 10,
            'min_stock' => 2,
            'unit' => 'kg',
            'unit_cost' => 50,
            'status' => 'In Stock',
        ]);

        $product = $this->createProduct($owner, [
            'name' => 'Porcelain Mug',
            'sku' => 'VOID-MUG-01',
            'production_method' => 'manufactured',
            'price' => 400.00,
            'stock' => 6,
            'sold' => 1,
        ]);

        ProductRecipe::create([
            'product_id' => $product->id,
            'supply_id' => $supply->id,
            'quantity_required' => 2,
            'unit' => 'kg',
        ]);

        $discount = Discount::create([
            'user_id' => $owner->id,
            'name' => 'Counter Promo',
            'type' => 'fixed',
            'value' => 50.00,
            'promo_stock' => 20,
            'promo_sold' => 0,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDay(),
            'is_active' => true,
            'is_followers_only' => false,
        ]);
        $discount->products()->attach($product->id);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 1000.00,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $order = Order::where('artisan_id', $owner->id)->firstOrFail();
        $product->refresh();
        $supply->refresh();
        $discount->refresh();

        $this->assertSame(4, $product->stock);
        $this->assertSame(3, $product->sold);
        $this->assertSame(6, (int) $supply->quantity);
        $this->assertSame(2, (int) $discount->promo_sold);

        $this->actingAs($readOnlyStaff)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Read only attempt',
                'supervisor_id' => $owner->id,
                'supervisor_pin' => '482910',
            ])
            ->assertForbidden();

        $this->actingAs($otherSeller)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Cross tenant attempt',
                'supervisor_id' => $owner->id,
                'supervisor_pin' => '482910',
            ])
            ->assertForbidden();

        $owner->forceFill(['pos_void_pin' => '482910'])->save();

        $this->actingAs($owner)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Wrong quantity punched',
                'supervisor_id' => $owner->id,
                'supervisor_pin' => '482910',
            ])
            ->assertRedirect();

        $order->refresh();
        $product->refresh();
        $supply->refresh();
        $discount->refresh();

        $this->assertSame(Order::STATUS_CANCELLED, $order->status);
        $this->assertSame('refunded', $order->payment_status);
        $this->assertSame('Wrong quantity punched', $order->cancellation_reason);
        $this->assertSame(6, $product->stock);
        $this->assertSame(1, $product->sold);
        $this->assertSame(10, (int) $supply->quantity);
        $this->assertSame(0, (int) $discount->promo_sold);

        $this->assertDatabaseHas('seller_activity_logs', [
            'seller_owner_id' => $owner->id,
            'event_type' => 'pos_walkin_voided',
            'subject_id' => $order->id,
        ]);

        $snapshot = app(AccountingLedgerService::class)->buildFinancialSnapshot($owner);
        $this->assertEquals(0.00, $snapshot['revenue']);

        // Second void attempt must fail cleanly
        $this->actingAs($owner)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Duplicate void',
                'supervisor_id' => $owner->id,
                'supervisor_pin' => '482910',
            ])
            ->assertSessionHasErrors('order');

        // Receipt indicates voided status and void audit metadata
        $this->actingAs($owner)
            ->get(route('seller.pos.receipt', $order))
            ->assertOk()
            ->assertSee('Voided Walk-In Receipt')
            ->assertSee('Void Approved By')
            ->assertSee('VOIDED');
    }

    public function test_accounting_ledger_breaks_down_and_filters_sales_by_payment_channel(): void
    {
        $owner = $this->createSellerOwner();
        $owner->modules_enabled = array_merge($owner->modules_enabled ?? [], [
            'accounting' => true,
        ]);
        $owner->save();

        $buyer = User::factory()->create(['role' => 'buyer', 'is_test' => false]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => $buyer->id,
            'order_type' => Order::TYPE_ONLINE,
            'order_number' => 'ORD-AUDIT-GCASH',
            'customer_name' => 'Online GCash Buyer',
            'status' => 'Completed',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Bacoor, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 900.00,
            'seller_net_amount' => 900.00,
            'total_amount' => 900.00,
            'is_test' => false,
        ]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => $buyer->id,
            'order_type' => Order::TYPE_ONLINE,
            'order_number' => 'ORD-AUDIT-COD',
            'customer_name' => 'Online COD Buyer',
            'status' => 'Completed',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Imus, Cavite',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 450.00,
            'seller_net_amount' => 450.00,
            'total_amount' => 450.00,
            'is_test' => false,
        ]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => null,
            'order_type' => Order::TYPE_POS_WALKIN,
            'order_number' => 'POS-AUDIT-CASH',
            'customer_name' => 'Walk-In Cash',
            'status' => 'Completed',
            'shipping_method' => 'Walk-In POS',
            'shipping_address' => 'Cavite Studio',
            'payment_method' => 'POS Cash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 300.00,
            'seller_net_amount' => 300.00,
            'total_amount' => 300.00,
            'is_test' => false,
        ]);

        Order::create([
            'artisan_id' => $owner->id,
            'user_id' => null,
            'order_type' => Order::TYPE_POS_WALKIN,
            'order_number' => 'POS-AUDIT-GCASH',
            'customer_name' => 'Walk-In GCash',
            'status' => 'Completed',
            'shipping_method' => 'Walk-In POS',
            'shipping_address' => 'Cavite Studio',
            'payment_method' => 'POS GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 600.00,
            'seller_net_amount' => 600.00,
            'total_amount' => 600.00,
            'is_test' => false,
        ]);

        $this->actingAs($owner)
            ->get(route('accounting.index', [
                'tab' => 'history',
                'type' => 'sale',
                'payment_channel' => 'pos_gcash',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Accounting/FundRelease')
                ->where('filters.payment_channel', 'pos_gcash')
                ->where('channelBreakdown.all.net', 2250)
                ->where('channelBreakdown.online_all.net', 1350)
                ->where('channelBreakdown.online_gcash.net', 900)
                ->where('channelBreakdown.online_cod.net', 450)
                ->where('channelBreakdown.pos_all.net', 900)
                ->where('channelBreakdown.pos_cash.net', 300)
                ->where('channelBreakdown.pos_gcash.net', 600)
                ->has('history.data', 1)
                ->where('history.data.0.order_number', 'POS-AUDIT-GCASH')
                ->where('history.data.0.payment_method', 'POS GCash')
            );
    }

    public function test_pos_history_strictly_isolates_owner_branch_manager_accounting_and_cashier(): void
    {
        $owner = $this->createSellerOwner();
        $owner->modules_enabled = array_merge($owner->modules_enabled ?? [], [
            'accounting' => true,
        ]);
        $owner->save();
        $product = $this->createProduct($owner, ['stock' => 25, 'price' => 300.00]);

        $branchA = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Imus Main Studio',
            'address' => '101 Aguinaldo Hwy, Imus, Cavite',
            'latitude' => 14.4296,
            'longitude' => 120.9367,
            'radius_meters' => 120,
            'is_active' => true,
        ]);
        $branchB = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Tagaytay Showroom',
            'address' => '22 Tagaytay-Nasugbu Hwy, Tagaytay, Cavite',
            'latitude' => 14.1153,
            'longitude' => 120.9621,
            'radius_meters' => 120,
            'is_active' => true,
        ]);

        $cashierA1 = $this->createBranchStaff($owner, $branchA, 'Cashier A1', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $cashierA2 = $this->createBranchStaff($owner, $branchA, 'Cashier A2', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $cashierB1 = $this->createBranchStaff($owner, $branchB, 'Cashier B1', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $managerA = $this->createBranchStaff($owner, $branchA, 'Manager A', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT, true);
        $accountingB = $this->createBranchStaff($owner, $branchB, 'Accounting B', ['orders' => true, 'accounting' => true], User::STAFF_ACCESS_PERMISSION_READ_ONLY);

        foreach ([$cashierA1, $cashierA2, $cashierB1, $managerA, $accountingB] as $staff) {
            $this->clockInStaffAtLocation($staff, $staff->employee->assignedLocation);
        }

        $checkout = fn (User $actor, string $customer) => $this->actingAs($actor)->post(route('seller.pos.store'), [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'pos_cash',
            'cash_tendered' => 500.00,
            'customer_name' => $customer,
        ])->assertRedirect(route('seller.pos.index'));

        $checkout($cashierA1, 'Client A1');
        $checkout($cashierA2, 'Client A2');
        $checkout($cashierB1, 'Client B1');
        $checkout($owner, 'Client Owner');

        $orderA1 = Order::where('customer_name', 'Client A1')->firstOrFail();
        $orderA2 = Order::where('customer_name', 'Client A2')->firstOrFail();
        $orderB1 = Order::where('customer_name', 'Client B1')->firstOrFail();
        $orderOwner = Order::where('customer_name', 'Client Owner')->firstOrFail();

        $this->assertSame($branchA->id, (int) $orderA1->pos_location_id);
        $this->assertSame($branchB->id, (int) $orderB1->pos_location_id);

        // Regular cashier sees ONLY their own walk-in sales and cannot open peers' or other branches' receipts
        $this->actingAs($cashierA1)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('recentOrders', 1)
                ->where('recentOrders.0.id', $orderA1->id)
                ->where('recentOrders.0.location_name', 'Imus Main Studio')
                ->where('canVoidPos', false)
            );
        $this->actingAs($cashierA1)->get(route('seller.pos.receipt', $orderA1))->assertOk();
        $this->actingAs($cashierA1)->get(route('seller.pos.receipt', $orderA2))->assertForbidden();
        $this->actingAs($cashierA1)->get(route('seller.pos.receipt', $orderB1))->assertForbidden();

        // Multi-branch Shop Manager (Branch A) sees Branch A orders (not Branch B)
        $this->actingAs($managerA)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canVoidPos', true)
                ->where('recentOrders', fn ($orders) => collect($orders)->pluck('id')->sort()->values()->all()
                    === collect([$orderA1->id, $orderA2->id, $orderOwner->id])->sort()->values()->all())
            );
        $this->actingAs($managerA)->get(route('seller.pos.receipt', $orderA2))->assertOk();
        $this->actingAs($managerA)->get(route('seller.pos.receipt', $orderB1))->assertForbidden();

        // Multi-branch Accounting (Branch B) sees Branch B orders only
        $this->actingAs($accountingB)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('recentOrders', 1)
                ->where('recentOrders.0.id', $orderB1->id)
            );
        $this->actingAs($accountingB)->get(route('seller.pos.receipt', $orderB1))->assertOk();
        $this->actingAs($accountingB)->get(route('seller.pos.receipt', $orderA1))->assertForbidden();

        // Shop Owner sees EVERYTHING across all branches and cashiers
        $this->actingAs($owner)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canVoidPos', true)
                ->has('recentOrders', 4)
            );
        $this->actingAs($owner)->get(route('seller.pos.receipt', $orderB1))->assertOk();

        // Single-location fallback: deactivating Branch B reverts Manager & Accounting to studio-wide view; cashier remains self-only
        $branchB->update(['is_active' => false]);

        $this->actingAs($managerA)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('recentOrders', 4));

        $this->actingAs($accountingB)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('recentOrders', 4));

        $this->actingAs($cashierA1)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('recentOrders', 1));
    }

    public function test_pos_security_enforces_supervisor_void_authority_reason_length_and_duplicate_ewallet_reference(): void
    {
        $owner = $this->createSellerOwner();
        $product = $this->createProduct($owner, ['stock' => 10, 'price' => 400.00]);

        $cashier = $this->createStaff($owner, ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $this->clockInStaff($cashier);

        $manager = $this->createBranchStaff($owner, null, 'Floor Manager', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT, true);
        $this->clockInStaff($manager);

        $this->actingAs($cashier)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_gcash',
                'payment_reference' => 'GCASH-UNIQ-991',
            ])
            ->assertRedirect(route('seller.pos.index'));

        $gcashOrder = Order::where('pos_payment_reference', 'GCASH-UNIQ-991')->firstOrFail();

        // Duplicate active e-wallet reference rejected
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_maya',
                'payment_reference' => 'GCASH-UNIQ-991',
            ])
            ->assertSessionHasErrors('payment_reference');

        // Regular cashier cannot self-authorize voids using their own account
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $gcashOrder), [
                'reason' => 'Customer changed mind',
                'supervisor_id' => $cashier->id,
                'supervisor_pin' => '482910',
            ])
            ->assertSessionHasErrors('supervisor_id');

        // Supervisor must have configured a Void PIN first
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $gcashOrder), [
                'reason' => 'Customer switched payment method',
                'supervisor_id' => $manager->id,
                'supervisor_pin' => '739152',
            ])
            ->assertSessionHasErrors('supervisor_pin');

        $manager->forceFill(['pos_void_pin' => '739152'])->save();

        // Wrong supervisor PIN is rejected and logged in audit trail
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $gcashOrder), [
                'reason' => 'Customer switched payment method',
                'supervisor_id' => $manager->id,
                'supervisor_pin' => '999999',
            ])
            ->assertSessionHasErrors('supervisor_pin');

        $this->assertDatabaseHas('seller_activity_logs', [
            'seller_owner_id' => $owner->id,
            'actor_user_id' => $cashier->id,
            'event_type' => 'pos_walkin_void_denied',
            'subject_id' => $gcashOrder->id,
        ]);

        // Supervisor void requires a clear reason (>= 5 chars)
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $gcashOrder), [
                'reason' => 'bad',
                'supervisor_id' => $manager->id,
                'supervisor_pin' => '739152',
            ])
            ->assertSessionHasErrors('reason');

        // Cashier voids on counter terminal using Floor Manager's 6-digit PIN override (dual attribution)
        $this->actingAs($cashier)
            ->post(route('seller.pos.void', $gcashOrder), [
                'reason' => 'Customer switched payment method',
                'supervisor_id' => $manager->id,
                'supervisor_pin' => '739152',
            ])
            ->assertRedirect();

        $voidLog = SellerActivityLog::where('event_type', 'pos_walkin_voided')
            ->where('subject_id', $gcashOrder->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame($cashier->id, (int) $voidLog->actor_user_id);
        $this->assertSame($manager->id, (int) ($voidLog->details['approved_by_user_id'] ?? 0));
        $this->assertSame('Floor Manager', $voidLog->details['approved_by_name'] ?? null);

        // Once voided, reference is no longer active and can be legitimately reused
        $this->actingAs($cashier)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_gcash',
                'payment_reference' => 'GCASH-UNIQ-991',
            ])
            ->assertRedirect(route('seller.pos.index'));
    }

    public function test_pos_checkout_enforces_strict_store_geofence_and_records_terminal_telemetry(): void
    {
        $owner = $this->createSellerOwner();
        $product = $this->createProduct($owner, ['stock' => 10, 'price' => 250.00]);

        $strictBranch = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Dasmariñas Flagship',
            'address' => '88 Congressional Ave, Dasmariñas, Cavite',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'radius_meters' => 100,
            'enforce_strict_geofence' => true,
            'is_active' => true,
        ]);

        $cashier = $this->createBranchStaff($owner, $strictBranch, 'Geofenced Cashier', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $cashier->employee->update(['allow_remote_clock_in' => false]);
        $session = $this->clockInStaffAtLocation($cashier, $strictBranch, false, 450);

        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300.00,
            ])
            ->assertSessionHasErrors('location');

        $this->assertSame(10, $product->fresh()->stock);

        // Once verified inside store geofence, checkout succeeds and telemetry is persisted
        $session->update([
            'is_within_geofence' => true,
            'distance_meters' => 18,
            'liveness_verified' => true,
        ]);

        $this->actingAs($cashier)
            ->withServerVariables(['REMOTE_ADDR' => '192.168.10.55'])
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300.00,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $order = Order::where('pos_processed_by_user_id', $cashier->id)->latest('id')->firstOrFail();
        $this->assertSame($strictBranch->id, (int) $order->pos_location_id);

        $log = SellerActivityLog::where('event_type', 'pos_walkin_completed')
            ->where('subject_id', $order->id)
            ->firstOrFail();

        $this->assertSame($strictBranch->id, (int) ($log->details['location_id'] ?? 0));
        $this->assertSame('Dasmariñas Flagship', $log->details['location_name'] ?? null);
        $this->assertTrue((bool) ($log->details['within_geofence'] ?? false));
        $this->assertSame(18, $log->details['distance_meters'] ?? null);
        $this->assertTrue((bool) ($log->details['liveness_verified'] ?? false));
        $this->assertSame('192.168.10.55', $log->details['ip_address'] ?? null);
    }

    public function test_supervisor_can_manage_personal_void_pin_via_profile_and_lockout_protects_against_brute_force(): void
    {
        $owner = $this->createSellerOwner([
            'password' => 'OwnerSecretPass123!',
        ]);
        $product = $this->createProduct($owner, ['stock' => 10, 'price' => 200.00]);

        $manager = $this->createBranchStaff($owner, null, 'PIN Manager', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT, true);
        $manager->forceFill(['password' => 'ManagerSecretPass123!'])->save();
        $this->clockInStaff($manager);

        $cashier = $this->createStaff($owner, ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $cashier->forceFill(['password' => 'CashierSecretPass123!'])->save();
        $this->clockInStaff($cashier);

        // Cashiers cannot manage Void PINs
        $this->actingAs($cashier)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('canManagePosVoidPin', false));

        $this->actingAs($cashier)
            ->put(route('profile.pos-void-pin.update'), [
                'current_password' => 'CashierSecretPass123!',
                'pin' => '482910',
                'pin_confirmation' => '482910',
            ])
            ->assertForbidden();

        // Managers see Void PIN management and reject weak patterns or wrong account password
        $this->actingAs($manager)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canManagePosVoidPin', true)
                ->where('hasPosVoidPin', false)
            );

        $this->actingAs($manager)
            ->from(route('profile.edit'))
            ->put(route('profile.pos-void-pin.update'), [
                'current_password' => 'WrongPassword123!',
                'pin' => '482910',
                'pin_confirmation' => '482910',
            ])
            ->assertSessionHasErrors('current_password');

        $this->actingAs($manager)
            ->from(route('profile.edit'))
            ->put(route('profile.pos-void-pin.update'), [
                'current_password' => 'ManagerSecretPass123!',
                'pin' => '123456',
                'pin_confirmation' => '123456',
            ])
            ->assertSessionHasErrors('pin');

        $this->actingAs($manager)
            ->put(route('profile.pos-void-pin.update'), [
                'current_password' => 'ManagerSecretPass123!',
                'pin' => '482910',
                'pin_confirmation' => '482910',
            ])
            ->assertRedirect(route('profile.edit'));

        $manager->refresh();
        $this->assertTrue($manager->hasPosVoidPin());
        $this->assertArrayNotHasKey('pos_void_pin', $manager->toArray());

        // Brute-force lockout after 5 wrong PIN guesses
        $this->actingAs($cashier)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 250.00,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $order = Order::where('pos_processed_by_user_id', $cashier->id)->latest('id')->firstOrFail();

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($cashier)
                ->from(route('seller.pos.index'))
                ->post(route('seller.pos.void', $order), [
                    'reason' => 'Pin guessing check',
                    'supervisor_id' => $manager->id,
                    'supervisor_pin' => '999999',
                ])
                ->assertSessionHasErrors('supervisor_pin');
        }

        // 6th attempt even with right PIN is rate-limited
        $this->actingAs($cashier)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Pin guessing check',
                'supervisor_id' => $manager->id,
                'supervisor_pin' => '482910',
            ])
            ->assertSessionHasErrors('supervisor_pin');

        $this->assertSame(Order::STATUS_COMPLETED, $order->fresh()->status);
    }

    public function test_cross_branch_supervisor_pin_override_is_blocked_while_owner_pin_works_across_branches(): void
    {
        $owner = $this->createSellerOwner();
        $owner->forceFill(['pos_void_pin' => '849201'])->save();
        $product = $this->createProduct($owner, ['stock' => 10, 'price' => 300.00]);

        $branchA = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Branch Alpha',
            'address' => 'Imus, Cavite',
            'latitude' => 14.4296,
            'longitude' => 120.9367,
            'radius_meters' => 100,
            'is_active' => true,
        ]);
        $branchB = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Branch Beta',
            'address' => 'Bacoor, Cavite',
            'latitude' => 14.4589,
            'longitude' => 120.9585,
            'radius_meters' => 100,
            'is_active' => true,
        ]);

        $cashierA = $this->createBranchStaff($owner, $branchA, 'Cashier Alpha', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT);
        $managerB = $this->createBranchStaff($owner, $branchB, 'Manager Beta', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT, true);
        $managerB->forceFill(['pos_void_pin' => '635190'])->save();

        $this->clockInStaffAtLocation($cashierA, $branchA);
        $this->clockInStaffAtLocation($managerB, $branchB);

        $this->actingAs($cashierA)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 350.00,
            ])
            ->assertRedirect(route('seller.pos.index'));

        $orderA = Order::where('pos_processed_by_user_id', $cashierA->id)->latest('id')->firstOrFail();

        // Branch Beta Manager's valid PIN cannot authorize a Branch Alpha void
        $this->actingAs($cashierA)
            ->from(route('seller.pos.index'))
            ->post(route('seller.pos.void', $orderA), [
                'reason' => 'Wrong variant scanned',
                'supervisor_id' => $managerB->id,
                'supervisor_pin' => '635190',
            ])
            ->assertSessionHasErrors('supervisor_id');

        // Shop Owner's PIN authorizes across any branch
        $this->actingAs($cashierA)
            ->post(route('seller.pos.void', $orderA), [
                'reason' => 'Wrong variant scanned',
                'supervisor_id' => $owner->id,
                'supervisor_pin' => '849201',
            ])
            ->assertRedirect();

        $this->assertSame(Order::STATUS_CANCELLED, $orderA->fresh()->status);
    }

    public function test_walkin_pos_is_available_across_all_subscription_tiers(): void
    {
        foreach (['free', 'premium', 'super_premium'] as $tier) {
            auth()->logout();

            $owner = $this->createSellerOwner([
                'premium_tier' => $tier,
            ]);
            $owner->forceFill(['pos_void_pin' => '592841'])->save();
            $product = $this->createProduct($owner, ['stock' => 5, 'price' => 150.00]);

            $this->actingAs($owner)
                ->get(route('seller.pos.index'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Seller/POS/Index')
                    ->where('canEditPos', true)
                    ->has('products', 1)
                );

            $this->actingAs($owner)
                ->post(route('seller.pos.store'), [
                    'items' => [['product_id' => $product->id, 'quantity' => 1]],
                    'payment_method' => 'pos_cash',
                    'cash_tendered' => 200.00,
                ])
                ->assertRedirect(route('seller.pos.index'));

            $order = Order::where('artisan_id', $owner->id)
                ->where('order_type', Order::TYPE_POS_WALKIN)
                ->latest('id')
                ->firstOrFail();

            $this->actingAs($owner)
                ->get(route('seller.pos.receipt', $order))
                ->assertOk();

            $this->actingAs($owner)
                ->post(route('seller.pos.void', $order), [
                    'reason' => "Tier {$tier} verification void",
                    'supervisor_id' => $owner->id,
                    'supervisor_pin' => '592841',
                ])
                ->assertRedirect();

            $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);
        }
    }

    public function test_pos_history_endpoint_paginates_filters_and_enforces_branch_scope(): void
    {
        $owner = $this->createSellerOwner(['premium_tier' => 'super_premium']);

        $branchA = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Imus Branch',
            'latitude' => 14.4297,
            'longitude' => 120.9367,
            'radius_meters' => 100,
            'is_active' => true,
        ]);
        $branchB = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Bacoor Branch',
            'latitude' => 14.4589,
            'longitude' => 120.9587,
            'radius_meters' => 100,
            'is_active' => true,
        ]);

        $managerB = $this->createBranchStaff($owner, $branchB, 'Bacoor Manager', ['orders' => true], User::STAFF_ACCESS_PERMISSION_CAN_EDIT, true);
        $this->clockInStaffAtLocation($managerB, $branchB, true, 10);

        for ($i = 1; $i <= 32; $i++) {
            $isVoided = $i <= 2;
            $isBranchB = $i > 25;
            Order::create([
                'order_number' => sprintf('POS-HIST-%04d', $i),
                'artisan_id' => $owner->id,
                'order_type' => Order::TYPE_POS_WALKIN,
                'customer_name' => $i === 3 ? 'Maria Santos Special' : "Walk-In #{$i}",
                'merchandise_subtotal' => 250.00,
                'total_amount' => 250.00,
                'status' => $isVoided ? Order::STATUS_CANCELLED : Order::STATUS_COMPLETED,
                'payment_method' => $i % 2 === 0 ? 'POS GCash' : 'POS Cash',
                'payment_status' => $isVoided ? 'refunded' : 'paid',
                'shipping_method' => 'Walk-In POS',
                'shipping_address' => $isBranchB ? 'Bacoor Branch' : 'Imus Branch',
                'pos_processed_by_user_id' => $isBranchB ? $managerB->id : $owner->id,
                'pos_location_id' => $isBranchB ? $branchB->id : $branchA->id,
            ]);
        }

        // Initial Inertia payload caps initial rows at 25 while reporting true DB totals
        $this->actingAs($owner)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('recentOrders', 25)
                ->where('historySummary.all', 32)
                ->where('historySummary.completed', 30)
                ->where('historySummary.voided', 2)
                ->has('historyBranches', 2)
            );

        // Page 1 and Page 2 pagination
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', ['page' => 1, 'per_page' => 25]))
            ->assertOk()
            ->assertJsonCount(25, 'orders')
            ->assertJsonPath('meta.total', 32)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('summary.all', 32)
            ->assertJsonPath('summary.completed', 30)
            ->assertJsonPath('summary.voided', 2);

        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', ['page' => 2, 'per_page' => 25]))
            ->assertOk()
            ->assertJsonCount(7, 'orders')
            ->assertJsonPath('meta.current_page', 2);

        // Server-side search finds row #3 even though it lives beyond page 1
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', ['search' => 'Maria Santos Special']))
            ->assertOk()
            ->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.order_number', 'POS-HIST-0003');

        // Backdate #10 to yesterday and #11 to 5 days ago (Manila business time) for flexible date tests
        $yesterdayManila = now('Asia/Manila')->subDay();
        $fiveDaysAgoManila = now('Asia/Manila')->subDays(5);

        Order::where('order_number', 'POS-HIST-0010')
            ->firstOrFail()
            ->forceFill(['created_at' => $yesterdayManila->copy()->setTime(14, 15)->setTimezone(config('app.timezone'))])
            ->save();

        Order::where('order_number', 'POS-HIST-0011')
            ->firstOrFail()
            ->forceFill(['created_at' => $fiveDaysAgoManila->copy()->setTime(11, 0)->setTimezone(config('app.timezone'))])
            ->save();

        // Status + payment + date range filtering
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', ['status' => 'voided', 'payment_method' => 'POS Cash', 'date_range' => 'today']))
            ->assertOk()
            ->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.order_number', 'POS-HIST-0001');

        // Yesterday preset isolates strictly yesterday's walk-in order
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', ['date_range' => 'yesterday']))
            ->assertOk()
            ->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.order_number', 'POS-HIST-0010');

        // Specific date isolates exact Manila calendar day
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', [
                'date_range' => 'specific',
                'specific_date' => $fiveDaysAgoManila->toDateString(),
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'orders')
            ->assertJsonPath('orders.0.order_number', 'POS-HIST-0011');

        // Custom date range matches both yesterday and 5 days ago when spanning those days
        $this->actingAs($owner)
            ->getJson(route('seller.pos.history', [
                'date_range' => 'custom',
                'date_from' => $fiveDaysAgoManila->toDateString(),
                'date_to' => $yesterdayManila->toDateString(),
            ]))
            ->assertOk()
            ->assertJsonCount(2, 'orders')
            ->assertJsonPath('meta.total', 2);

        // Strict branch isolation: Branch B manager only sees their 7 Branch B receipts even when passing branch_id of Branch A
        $this->actingAs($managerB)
            ->getJson(route('seller.pos.history', ['branch_id' => $branchA->id]))
            ->assertOk()
            ->assertJsonCount(7, 'orders')
            ->assertJsonPath('meta.total', 7)
            ->assertJsonPath('summary.all', 7);
    }

    public function test_pos_index_and_checkout_enforce_promo_stock_cap_and_restore_on_void(): void
    {
        $owner = $this->createSellerOwner([
            'pos_void_pin' => \Illuminate\Support\Facades\Hash::make('135790'),
            'pos_void_pin_updated_at' => now(),
        ]);

        $productA = $this->createProduct($owner, [
            'name' => 'Discounted Clay Pitcher',
            'sku' => 'PROMO-A-01',
            'price' => 500.00,
            'stock' => 10,
        ]);

        $productB = $this->createProduct($owner, [
            'name' => 'Discounted Woven Tray',
            'sku' => 'PROMO-B-01',
            'price' => 300.00,
            'stock' => 10,
        ]);

        $discount = Discount::create([
            'user_id' => $owner->id,
            'name' => 'Studio Clearance 20%',
            'type' => 'percentage',
            'value' => 20,
            'promo_stock' => 3,
            'promo_sold' => 0,
            'max_purchase_limit' => 5,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDay(),
            'is_active' => true,
            'is_followers_only' => false,
        ]);
        $discount->products()->attach([$productA->id, $productB->id]);

        $this->actingAs($owner)
            ->get(route('seller.pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/POS/Index')
                ->where('products.0.discount_info.percentage_off', 20)
                ->where('products.0.discount_info.remaining_promo_stock', 3)
            );

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $productA->id, 'quantity' => 2],
                    ['product_id' => $productB->id, 'quantity' => 3],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 2000,
                'customer_name' => 'Promo Buyer',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $order = Order::where('artisan_id', $owner->id)->latest('id')->firstOrFail();

        // Product A gets 2 promo units @ 400 (800). Shared discount has 1 promo stock left,
        // so Product B gets 1 promo unit @ 240 + 2 regular units @ 300 (840) => total 1640.
        $this->assertSame(1640.0, round((float) $order->total_amount, 2));
        $this->assertSame(3, (int) $discount->fresh()->promo_sold);

        $saleLog = SellerActivityLog::where('seller_owner_id', $owner->id)
            ->where('event_type', 'pos_walkin_completed')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame('owner', $saleLog->actor_type);

        // Voiding the walk-in sale restores promo_sold back to 0 and records owner actor_type.
        $this->actingAs($owner)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'Customer exchanged item',
                'supervisor_pin' => '135790',
                'supervisor_id' => $owner->id,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(0, (int) $discount->fresh()->promo_sold);

        $voidLog = SellerActivityLog::where('seller_owner_id', $owner->id)
            ->where('event_type', 'pos_walkin_voided')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame('owner', $voidLog->actor_type);
    }

    public function test_accounting_and_seller_orders_safely_ignore_invalid_date_filters(): void
    {
        $owner = $this->createSellerOwner();
        $owner->modules_enabled = array_merge($owner->modules_enabled ?? [], [
            'accounting' => true,
        ]);
        $owner->save();

        $this->actingAs($owner)
            ->get(route('accounting.index', [
                'start_date' => 'not-a-date',
                'end_date' => '2026-02-30',
                'tab' => 'history',
            ]))
            ->assertOk();

        $this->actingAs($owner)
            ->get(route('accounting.index', [
                'start_date' => ['2026-01-01'],
                'end_date' => ['2026-01-31'],
                'search' => ['invalid-array'],
            ]))
            ->assertOk();

        $ordersResult = app(ListSellerOrders::class)->execute($owner->id, $owner, [
            'start_date' => 'invalid-date',
            'end_date' => '2026-99-99',
        ]);

        $this->assertArrayHasKey('orders', $ordersResult);
        $this->assertArrayHasKey('tabCounts', $ordersResult);
    }

    public function test_pos_qr_settings_rejects_path_traversal_keys(): void
    {
        $owner = $this->createSellerOwner();

        $this->actingAs($owner)
            ->post(route('seller.pos.qr-settings'), [
                'pos_gcash_qr_key' => 'shops/../private/key.png',
                'pos_maya_qr_key' => 'shops/qr//maya.png',
            ])
            ->assertSessionHasErrors(['pos_gcash_qr_key', 'pos_maya_qr_key']);

        $this->actingAs($owner)
            ->post(route('seller.pos.qr-settings'), [
                'pos_gcash_qr_key' => 'shops/1/pos-qr/gcash-valid.png',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('shops/1/pos-qr/gcash-valid.png', $owner->fresh()->pos_gcash_qr_path);
    }

    public function test_oauth_artisan_can_set_pos_void_pin_and_authorize_void(): void
    {
        $owner = $this->createSellerOwner([
            'social_provider' => 'google',
            'social_id' => 'google-oauth-9911',
            'password' => \Illuminate\Support\Facades\Hash::make('OAuthPass#2026'),
        ]);

        $product = $this->createProduct($owner, [
            'price' => 250.00,
            'stock' => 5,
        ]);

        $this->actingAs($owner)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Profile/Edit')
                ->where('canManagePosVoidPin', true)
                ->where('hasPosVoidPin', false)
            );

        $this->actingAs($owner)
            ->put(route('profile.pos-void-pin.update'), [
                'current_password' => 'OAuthPass#2026',
                'pin' => '246810',
                'pin_confirmation' => '246810',
            ])
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHasNoErrors();

        $this->assertTrue($owner->fresh()->hasPosVoidPin());

        $pinLog = SellerActivityLog::where('seller_owner_id', $owner->id)
            ->where('event_type', 'pos_void_pin_updated')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame('owner', $pinLog->actor_type);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $order = Order::where('artisan_id', $owner->id)->latest('id')->firstOrFail();

        $this->actingAs($owner)
            ->post(route('seller.pos.void', $order), [
                'reason' => 'OAuth owner void test',
                'supervisor_pin' => '246810',
                'supervisor_id' => $owner->id,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);
    }

    public function test_pos_checkout_falls_back_to_secondary_discount_when_shared_promo_stock_exhausts_mid_cart(): void
    {
        $owner = $this->createSellerOwner();

        $productA = $this->createProduct($owner, [
            'name' => 'Primary Promo Vase',
            'sku' => 'FALLBACK-A-01',
            'price' => 500.00,
            'stock' => 10,
        ]);

        $productB = $this->createProduct($owner, [
            'name' => 'Shared Dual Promo Bowl',
            'sku' => 'FALLBACK-B-01',
            'price' => 400.00,
            'stock' => 10,
        ]);

        $primaryDiscount = Discount::create([
            'user_id' => $owner->id,
            'name' => 'Primary 30% Flash',
            'type' => 'percentage',
            'value' => 30,
            'promo_stock' => 2,
            'promo_sold' => 0,
            'max_purchase_limit' => null,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDay(),
            'is_active' => true,
            'is_followers_only' => false,
        ]);
        $primaryDiscount->products()->attach([$productA->id, $productB->id]);

        $secondaryDiscount = Discount::create([
            'user_id' => $owner->id,
            'name' => 'Secondary 10% Backup',
            'type' => 'percentage',
            'value' => 10,
            'promo_stock' => 5,
            'promo_sold' => 0,
            'max_purchase_limit' => null,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDay(),
            'is_active' => true,
            'is_followers_only' => false,
        ]);
        $secondaryDiscount->products()->attach([$productB->id]);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $productA->id, 'quantity' => 2],
                    ['product_id' => $productB->id, 'quantity' => 2],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 2000,
                'customer_name' => 'Fallback Buyer',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $order = Order::where('artisan_id', $owner->id)->latest('id')->firstOrFail();

        // Product A consumes all 2 units of primary (30% off 500 = 350 * 2 = 700).
        // Product B reloads discounts after primary is touched and falls back to secondary (10% off 400 = 360 * 2 = 720).
        $this->assertSame(1420.0, round((float) $order->total_amount, 2));
        $this->assertSame(2, (int) $primaryDiscount->fresh()->promo_sold);
        $this->assertSame(2, (int) $secondaryDiscount->fresh()->promo_sold);
    }

    public function test_pos_history_and_list_seller_orders_ignore_non_scalar_query_parameters(): void
    {
        $owner = $this->createSellerOwner();
        $product = $this->createProduct($owner, [
            'name' => 'Scalar Guard Jar',
            'sku' => 'SCALAR-01',
            'price' => 250.00,
            'stock' => 5,
        ]);

        $this->actingAs($owner)
            ->post(route('seller.pos.store'), [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
                'payment_method' => 'pos_cash',
                'cash_tendered' => 300,
                'customer_name' => 'History Check',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($owner)
            ->get(route('seller.pos.history', [
                'search' => ['nested' => 'bad'],
                'specific_date' => ['2026-11-14'],
                'payment_method' => ['pos_cash'],
                'status' => ['completed'],
                'page' => ['bad'],
            ]))
            ->assertOk()
            ->assertJsonStructure([
                'orders',
                'summary',
                'meta',
            ])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 1);

        $orderListing = app(ListSellerOrders::class)->execute($owner->id, $owner, [
            'search' => ['nested' => 'bad'],
            'status' => ['completed'],
            'payment_method' => ['pos_cash'],
            'fulfillment_type' => ['walkin'],
            'start_date' => ['2026-11-01'],
            'end_date' => '2026-99-99',
        ]);

        $this->assertArrayHasKey('orders', $orderListing);
    }

    private function createSellerOwner(array $overrides = []): User
    {
        $owner = User::factory()->artisanApproved()->create(array_merge([
            'premium_tier' => 'premium',
            'base_funds' => 0,
        ], $overrides));

        $owner->modules_enabled = array_merge($owner->modules_enabled ?? [], [
            'orders' => true,
        ]);
        $owner->save();

        return $owner;
    }

    private function createProduct(User $owner, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $owner->id,
            'artisan_id' => $owner->id,
            'name' => 'Studio Craft Item',
            'sku' => 'SKU-' . uniqid(),
            'category' => 'Ceramics',
            'status' => 'Active',
            'is_b2b_supply' => false,
            'production_method' => 'resell',
            'price' => 500.00,
            'cost_price' => 150.00,
            'stock' => 10,
            'sold' => 0,
            'lead_time' => '1 day',
        ], $overrides));
    }

    private function createStaff(User $owner, array $permissions, string $accessLevel): User
    {
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Studio Cashier',
            'role' => 'Cashier',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        return User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'name' => 'Studio Cashier',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(
                User::withStaffAccessPermissionLevelFlag($permissions, $accessLevel),
                true
            ),
        ]);
    }

    private function createBranchStaff(
        User $owner,
        ?SellerLocation $location,
        string $name,
        array $permissions,
        string $accessLevel,
        bool $isManager = false
    ): User {
        $employee = Employee::create([
            'user_id' => $owner->id,
            'assigned_location_id' => $location?->id,
            'name' => $name,
            'role' => $isManager ? 'Shop Manager' : 'Cashier',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $flags = User::withWorkspaceAccessFlag(
            User::withStaffAccessPermissionLevelFlag($permissions, $accessLevel),
            true
        );

        if ($isManager) {
            $flags = User::withStaffUserLevelFlag($flags, User::STAFF_MANAGER_USER_LEVEL);
        }

        return User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'name' => $name,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => $flags,
        ]);
    }

    private function clockInStaff(User $staff): void
    {
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $staff->seller_owner_id,
            'employee_id' => $staff->employee_id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 0,
        ]);
    }

    private function clockInStaffAtLocation(
        User $staff,
        ?SellerLocation $location,
        bool $withinGeofence = true,
        int $distanceMeters = 12
    ): StaffAttendanceSession {
        return StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $staff->seller_owner_id,
            'employee_id' => $staff->employee_id,
            'seller_location_id' => $location?->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 0,
            'is_within_geofence' => $withinGeofence,
            'distance_meters' => $distanceMeters,
            'liveness_verified' => true,
        ]);
    }
}
