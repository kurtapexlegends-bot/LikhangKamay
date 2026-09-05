<?php

namespace Tests\Feature\Seller;

use App\Actions\Consumer\ReceiveOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Supply;
use App\Models\User;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class B2BSupplyHubTest extends TestCase
{
    use RefreshDatabase;

    private User $supplierArtisan;
    private User $buyerArtisan;
    private User $regularBuyer;
    private Product $b2bClaySack;

    protected function setUp(): void
    {
        parent::setUp();

        $this->supplierArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'approved_at' => now(),
            'setup_completed_at' => now(),
            'shop_name' => 'Bulacan Clayworks',
            'city' => 'Bulacan',
        ]);

        $this->buyerArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'approved_at' => now(),
            'setup_completed_at' => now(),
            'shop_name' => 'Silang Pottery Studio',
            'city' => 'Cavite',
        ]);

        $this->regularBuyer = User::factory()->create([
            'role' => 'buyer',
        ]);

        $this->b2bClaySack = Product::factory()->create([
            'user_id' => $this->supplierArtisan->id,
            'sku' => 'B2B-CLAY-001',
            'name' => 'Stoneware Moist Clay 25kg Sack',
            'category' => 'Raw Clay & Slips',
            'price' => 350.00,
            'cost_price' => 180.00,
            'stock' => 100,
            'weight' => 25.0,
            'is_b2b_supply' => true,
            'moq' => 4,
            'wholesale_price' => 295.00,
            'wholesale_min_qty' => 10,
            'supply_unit' => 'bag',
            'status' => 'Active',
        ]);
    }

    public function test_unauthenticated_or_non_artisan_cannot_access_b2b_supply_hub(): void
    {
        // Guest
        $response = $this->get(route('seller.supply-hub.index'));
        $response->assertRedirect(route('login'));

        // Regular consumer buyer
        $response = $this->actingAs($this->regularBuyer)->get(route('seller.supply-hub.index'));
        $response->assertStatus(403);
    }

    public function test_verified_artisan_can_browse_b2b_supply_hub(): void
    {
        $response = $this->actingAs($this->buyerArtisan)->get(route('seller.supply-hub.index'));
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/Index')
            ->has('supplies.data', 1)
            ->where('supplies.data.0.name', 'Stoneware Moist Clay 25kg Sack')
            ->where('supplies.data.0.moq', 4)
            ->where('supplies.data.0.wholesale_price', 295)
        );
    }

    public function test_artisan_can_toggle_product_into_b2b_supply_hub_with_moq_and_wholesale_tiers(): void
    {
        $retailProduct = Product::factory()->create([
            'user_id' => $this->supplierArtisan->id,
            'sku' => 'B2B-GLZ-002',
            'category' => 'Glazes & Oxides',
            'name' => 'Clear Gloss Dipping Glaze 5L',
            'price' => 1200.00,
            'stock' => 20,
            'is_b2b_supply' => false,
            'moq' => 1,
        ]);

        $response = $this->actingAs($this->supplierArtisan)
            ->post(route('seller.supply-hub.toggle', $retailProduct->id), [
                'is_b2b_supply' => true,
                'moq' => 2,
                'wholesale_price' => 980.00,
                'wholesale_min_qty' => 5,
                'supply_unit' => 'liters',
            ]);

        $response->assertSessionHas('success');

        $retailProduct->refresh();
        $this->assertTrue($retailProduct->is_b2b_supply);
        $this->assertEquals(2, $retailProduct->moq);
        $this->assertEquals('980.00', (string) $retailProduct->wholesale_price);
        $this->assertEquals(5, $retailProduct->wholesale_min_qty);
        $this->assertEquals('liters', $retailProduct->supply_unit);
    }

    public function test_effective_b2b_price_respects_wholesale_quantity_threshold(): void
    {
        // Order MOQ of 4 (below wholesale min 10) -> standard price 350.00
        $this->assertEquals(350.00, $this->b2bClaySack->getEffectiveB2BPrice(4));

        // Order 10 units (meets wholesale min 10) -> wholesale price 295.00
        $this->assertEquals(295.00, $this->b2bClaySack->getEffectiveB2BPrice(10));

        // Order 20 units -> wholesale price 295.00
        $this->assertEquals(295.00, $this->b2bClaySack->getEffectiveB2BPrice(20));
    }

    public function test_receiving_b2b_order_automatically_creates_studio_supply_for_artisan(): void
    {
        // Verify buyer starts with 0 supplies
        $this->assertEquals(0, Supply::where('user_id', $this->buyerArtisan->id)->count());

        $order = Order::create([
            'order_number' => 'ORD-B2B-1001',
            'user_id' => $this->buyerArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'merchandise_subtotal' => 2950.00,
            'total_amount' => 2950.00,
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 295.00,
            'cost' => 180.00,
            'quantity' => 10,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        // Buyer receives order
        $receiveOrderAction = app(ReceiveOrder::class);
        $receiveOrderAction->execute((string) $order->id, $this->buyerArtisan);

        // Order should be marked Completed
        $order->refresh();
        $this->assertEquals('Completed', $order->status);

        // Buyer's studio inventory should now have 1 record with 10 bags of Stoneware Moist Clay
        $supply = Supply::where('user_id', $this->buyerArtisan->id)->first();
        $this->assertNotNull($supply);
        $this->assertEquals('Stoneware Moist Clay 25kg Sack', $supply->name);
        $this->assertEquals(10, $supply->quantity);
        $this->assertEquals('bag', $supply->unit);
        $this->assertEquals(295.00, (float) $supply->unit_cost);
        $this->assertEquals('Bulacan Clayworks', $supply->supplier);
    }

    public function test_receiving_subsequent_b2b_order_increments_existing_supply_record(): void
    {
        // Pre-existing supply record
        $existingSupply = Supply::create([
            'user_id' => $this->buyerArtisan->id,
            'product_id' => $this->b2bClaySack->id,
            'sku' => 'B2B-STON-123',
            'name' => 'Stoneware Moist Clay 25kg Sack',
            'category' => 'Other',
            'quantity' => 5,
            'unit' => 'bag',
            'min_stock' => 2,
            'unit_cost' => 350.00,
            'supplier' => 'Bulacan Clayworks',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-B2B-1002',
            'user_id' => $this->buyerArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'merchandise_subtotal' => 5900.00,
            'total_amount' => 5900.00,
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 295.00,
            'cost' => 180.00,
            'quantity' => 20,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        // Buyer receives order
        $receiveOrderAction = app(ReceiveOrder::class);
        $receiveOrderAction->execute((string) $order->id, $this->buyerArtisan);

        // Verify stock is now 5 + 20 = 25 and weighted average cost is (5*350 + 20*295)/25 = 306.00
        $existingSupply->refresh();
        $this->assertEquals(25, $existingSupply->quantity);
        $this->assertEquals(306.00, (float) $existingSupply->unit_cost);
    }

    public function test_artisan_can_access_workspace_procurement_checkout(): void
    {
        $response = $this->actingAs($this->buyerArtisan)
            ->withSession([
                'cart' => [
                    $this->b2bClaySack->id => [
                        'id' => $this->b2bClaySack->id,
                        'name' => $this->b2bClaySack->name,
                        'price' => 350.00,
                        'qty' => 4,
                        'variant' => 'Standard',
                        'seller_id' => $this->supplierArtisan->id,
                        'is_b2b_supply' => true,
                    ]
                ]
            ])
            ->get(route('seller.supply-hub.checkout'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/ProcurementCheckout')
            ->has('items', 1)
        );
    }

    public function test_artisan_can_view_inbound_sourcing_orders(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-B2B-1003',
            'user_id' => $this->buyerArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'merchandise_subtotal' => 1400.00,
            'total_amount' => 1400.00,
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
        ]);

        $response = $this->actingAs($this->buyerArtisan)->get(route('seller.supply-hub.orders'));
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/SourcingOrders')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_number', 'ORD-B2B-1003')
        );
    }

    public function test_artisan_can_confirm_material_delivery_from_workspace_orders(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-B2B-1004',
            'user_id' => $this->buyerArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'merchandise_subtotal' => 1400.00,
            'total_amount' => 1400.00,
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $response = $this->actingAs($this->buyerArtisan)
            ->post(route('seller.supply-hub.orders.confirm', $order->id));

        $response->assertRedirect();
        
        $order->refresh();
        $this->assertEquals('Completed', $order->status);

        $this->assertDatabaseHas('supplies', [
            'user_id' => $this->buyerArtisan->id,
            'product_id' => $this->b2bClaySack->id,
            'quantity' => 4,
            'unit_cost' => 350.00,
        ]);
    }

    public function test_receiving_b2b_order_auto_completes_open_stock_requests(): void
    {
        $existingSupply = Supply::create([
            'user_id' => $this->buyerArtisan->id,
            'product_id' => $this->b2bClaySack->id,
            'sku' => 'B2B-STON-123',
            'name' => 'Stoneware Moist Clay 25kg Sack',
            'category' => 'Other',
            'quantity' => 2,
            'unit' => 'bag',
            'min_stock' => 5,
            'unit_cost' => 350.00,
        ]);

        $stockRequest = \App\Models\StockRequest::create([
            'user_id' => $this->buyerArtisan->id,
            'requested_by_user_id' => $this->buyerArtisan->id,
            'supply_id' => $existingSupply->id,
            'quantity' => 10,
            'total_cost' => 3500.00,
            'status' => \App\Models\StockRequest::STATUS_ACCOUNTING_APPROVED,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-B2B-1005',
            'user_id' => $this->buyerArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'merchandise_subtotal' => 2950.00,
            'total_amount' => 2950.00,
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 295.00,
            'quantity' => 10,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $response = $this->actingAs($this->buyerArtisan)
            ->post(route('seller.supply-hub.orders.confirm', $order->id));

        $response->assertRedirect();

        // Verify supply quantity is updated (2 + 10 = 12)
        $existingSupply->refresh();
        $this->assertEquals(12, $existingSupply->quantity);

        // Verify stock request was automatically completed
        $stockRequest->refresh();
        $this->assertEquals(\App\Models\StockRequest::STATUS_COMPLETED, $stockRequest->status);
        $this->assertEquals(10, $stockRequest->received_quantity);
    }

    public function test_artisan_can_access_workspace_sourcing_cart(): void
    {
        $response = $this->actingAs($this->buyerArtisan)
            ->withSession([
                'cart' => [
                    $this->b2bClaySack->id => [
                        'id' => $this->b2bClaySack->id,
                        'name' => $this->b2bClaySack->name,
                        'price' => 350.00,
                        'qty' => 4,
                        'variant' => 'Standard',
                        'seller_id' => $this->supplierArtisan->id,
                        'is_b2b_supply' => true,
                    ]
                ]
            ])
            ->get(route('seller.supply-hub.cart'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/Cart')
            ->has('cart')
            ->has('pricing')
        );
    }

    public function test_artisan_can_view_wholesale_sales_orders(): void
    {
        $order = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-TEST-1',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 1400.00,
            'merchandise_subtotal' => 1400.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $response = $this->actingAs($this->supplierArtisan)
            ->get(route('seller.supply-hub.sales'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/WholesaleSales')
            ->has('orders.data', 1)
            ->where('activeSalesCount', 1)
            ->where('pendingSalesCount', 1)
        );
    }

    public function test_artisan_can_update_wholesale_sales_order_status(): void
    {
        $order = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-TEST-2',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 1400.00,
            'merchandise_subtotal' => 1400.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $response = $this->actingAs($this->supplierArtisan)
            ->post(route('seller.supply-hub.sales.status', $order->order_number), [
                'status' => 'Accepted',
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals('Accepted', $order->fresh()->status);
    }

    public function test_retail_orders_index_strictly_excludes_b2b_wholesale_orders(): void
    {
        // 1. Retail Order
        $retailProduct = Product::factory()->create([
            'user_id' => $this->supplierArtisan->id,
            'sku' => 'RET-VASE-001',
            'name' => 'Handmade Ceramic Vase',
            'category' => 'Pottery',
            'price' => 1500.00,
            'is_b2b_supply' => false,
        ]);

        $retailOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->regularBuyer->id,
            'order_number' => 'ORD-RET-1001',
            'customer_name' => $this->regularBuyer->name,
            'shipping_address' => 'Manila, Philippines',
            'status' => 'Pending',
            'total_amount' => 1500.00,
            'merchandise_subtotal' => 1500.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $retailOrder->id,
            'product_id' => $retailProduct->id,
            'product_name' => $retailProduct->name,
            'price' => 1500.00,
            'cost' => 500.00,
            'quantity' => 1,
            'is_b2b_supply' => false,
        ]);

        // 2. B2B Wholesale Order
        $b2bOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-1002',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 1400.00,
            'merchandise_subtotal' => 1400.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $b2bOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
        ]);

        // Access retail orders manager
        $response = $this->actingAs($this->supplierArtisan)->get(route('orders.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/Orders/OrderManager')
            ->has('orders.data', 1)
            ->where('orders.data.0.id', 'ORD-RET-1001')
        );
    }

    public function test_sourcing_orders_strictly_includes_b2b_and_excludes_personal_retail_purchases(): void
    {
        // 1. Retail purchase made by buyer artisan as a consumer
        $retailOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-RET-BUYER-01',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 500.00,
            'merchandise_subtotal' => 500.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $retailOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => 'Retail Gift Mug',
            'price' => 500.00,
            'cost' => 200.00,
            'quantity' => 1,
            'is_b2b_supply' => false,
        ]);

        // 2. B2B material purchase
        $b2bOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-SOURCING-01',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 1400.00,
            'merchandise_subtotal' => 1400.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $b2bOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
        ]);

        $response = $this->actingAs($this->buyerArtisan)
            ->get(route('seller.supply-hub.orders'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/SourcingOrders')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_number', 'ORD-B2B-SOURCING-01')
            ->where('activeOrdersCount', 1)
        );
    }

    public function test_artisan_can_confirm_delivery_using_order_number_string(): void
    {
        $order = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-2026-B2B-STRING-ID',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Delivered',
            'payment_status' => 'paid',
            'payment_method' => 'Credit Card',
            'total_amount' => 1400.00,
            'merchandise_subtotal' => 1400.00,
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 4,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $response = $this->actingAs($this->buyerArtisan)
            ->post(route('seller.supply-hub.orders.confirm', 'ORD-2026-B2B-STRING-ID'));

        $response->assertSessionHas('success');
        $this->assertEquals('Completed', $order->fresh()->status);
    }

    public function test_wholesale_sales_returns_delivered_completed_and_cancelled_counts(): void
    {
        // 1. Delivered wholesale order
        $deliveredOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-DEL-01',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Delivered',
            'total_amount' => 700.00,
            'merchandise_subtotal' => 700.00,
            'shipping_method' => 'Delivery',
        ]);
        OrderItem::create([
            'order_id' => $deliveredOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 2,
            'is_b2b_supply' => true,
        ]);

        // 2. Completed wholesale order
        $completedOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-CMP-01',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Completed',
            'total_amount' => 700.00,
            'merchandise_subtotal' => 700.00,
            'shipping_method' => 'Delivery',
        ]);
        OrderItem::create([
            'order_id' => $completedOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 2,
            'is_b2b_supply' => true,
        ]);

        // 3. Cancelled wholesale order
        $cancelledOrder = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-CAN-01',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Cancelled',
            'total_amount' => 700.00,
            'merchandise_subtotal' => 700.00,
            'shipping_method' => 'Delivery',
        ]);
        OrderItem::create([
            'order_id' => $cancelledOrder->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 2,
            'is_b2b_supply' => true,
        ]);

        $response = $this->actingAs($this->supplierArtisan)
            ->get(route('seller.supply-hub.sales'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/WholesaleSales')
            ->where('deliveredSalesCount', 1)
            ->where('completedSalesCount', 1)
            ->where('cancelledSalesCount', 1)
        );
    }

    public function test_artisan_can_search_inbound_sourcing_orders_by_product_name_and_order_number(): void
    {
        $order = Order::create([
            'artisan_id' => $this->supplierArtisan->id,
            'seller_id' => $this->supplierArtisan->id,
            'user_id' => $this->buyerArtisan->id,
            'order_number' => 'ORD-B2B-SRC-888',
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Studio, Cavite',
            'status' => 'Pending',
            'total_amount' => 700.00,
            'merchandise_subtotal' => 700.00,
            'shipping_method' => 'Delivery',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => 'Stoneware Moist Clay 25kg Sack',
            'price' => 350.00,
            'cost' => 180.00,
            'quantity' => 2,
            'is_b2b_supply' => true,
        ]);

        // Search by product_name
        $response1 = $this->actingAs($this->buyerArtisan)
            ->get(route('seller.supply-hub.orders', ['search' => 'Stoneware']));

        $response1->assertOk();
        $response1->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/SourcingOrders')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_number', 'ORD-B2B-SRC-888')
        );

        // Search by order_number
        $response2 = $this->actingAs($this->buyerArtisan)
            ->get(route('seller.supply-hub.orders', ['search' => 'SRC-888']));

        $response2->assertOk();
        $response2->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/SourcingOrders')
            ->has('orders.data', 1)
        );

        // Search for non-existent term
        $response3 = $this->actingAs($this->buyerArtisan)
            ->get(route('seller.supply-hub.orders', ['search' => 'NonExistentItem']));

        $response3->assertOk();
        $response3->assertInertia(fn ($page) => $page
            ->component('Seller/SupplyHub/SourcingOrders')
            ->has('orders.data', 0)
        );
    }
}

