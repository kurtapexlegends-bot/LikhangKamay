<?php

namespace Tests\Feature\Finance;

use App\Actions\Consumer\GetBuyerOrders;
use App\Actions\Seller\Orders\ListSellerOrders;
use App\Actions\Consumer\PlaceOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class OrderVATCalculationTest extends TestCase
{
    use RefreshDatabase;

    private OrderFinanceService $financeService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->financeService = app(OrderFinanceService::class);
    }

    public function test_non_vat_seller_calculations(): void
    {
        $nonVatSeller = User::factory()->create([
            'role' => 'artisan',
            'is_vat_registered' => false,
            'tin' => '123-456-789-000',
        ]);

        $subtotal = 1120.00;
        $amounts = $this->financeService->calculateAmounts($subtotal, 'Pick Up', 0.0, $nonVatSeller);

        $this->assertEquals('vat_exempt', $amounts['vat_type']);
        $this->assertEquals(0.00, $amounts['vatable_sales']);
        $this->assertEquals(0.00, $amounts['vat_amount']);
        $this->assertEquals(1120.00, $amounts['vat_exempt_sales']);
        $this->assertEquals(12.00, $amounts['vat_rate']);
        $this->assertEquals(1120.00, $amounts['total_amount']);
    }

    public function test_vat_registered_seller_calculations(): void
    {
        $vatSeller = User::factory()->create([
            'role' => 'artisan',
            'is_vat_registered' => true,
            'tin' => '987-654-321-000',
            'tax_business_name' => 'Luzon Pottery Workshop Inc.',
        ]);

        $subtotal = 1120.00;
        $amounts = $this->financeService->calculateAmounts($subtotal, 'Pick Up', 0.0, $vatSeller);

        $this->assertEquals('vat_inclusive', $amounts['vat_type']);
        // 1120 / 1.12 = 1000.00
        $this->assertEquals(1000.00, $amounts['vatable_sales']);
        // 1120 - 1000 = 120.00
        $this->assertEquals(120.00, $amounts['vat_amount']);
        $this->assertEquals(0.00, $amounts['vat_exempt_sales']);
        $this->assertEquals(12.00, $amounts['vat_rate']);
        $this->assertEquals(1120.00, $amounts['total_amount']);
        $this->assertEquals($subtotal, round($amounts['vatable_sales'] + $amounts['vat_amount'], 2));
    }

    public function test_null_seller_defaults_to_vat_exempt(): void
    {
        $subtotal = 500.00;
        $amounts = $this->financeService->calculateAmounts($subtotal, 'Pick Up', 0.0, null);

        $this->assertEquals('vat_exempt', $amounts['vat_type']);
        $this->assertEquals(0.00, $amounts['vatable_sales']);
        $this->assertEquals(0.00, $amounts['vat_amount']);
        $this->assertEquals(500.00, $amounts['vat_exempt_sales']);
    }

    public function test_place_order_persists_vat_matrix_for_vat_registered_seller(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $vatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => true,
            'tin' => '111-222-333-000',
            'tax_business_name' => 'Bulacan Woodworks Inc.',
        ]);

        $product = Product::factory()->create([
            'user_id' => $vatSeller->id,
            'name' => 'Handmade Wood Serving Bowl',
            'category' => 'Woodcraft',
            'sku' => 'SKU-' . uniqid(),
            'price' => 1120.00,
            'stock' => 10,
        ]);

        $request = Request::create('/checkout', 'POST', [
            'shipping_method' => 'Pick Up',
            'items' => [
                [
                    'id' => $product->id,
                    'qty' => 1,
                    'artisan_id' => $vatSeller->id,
                    'name' => $product->name,
                ],
            ],
        ]);

        /** @var PlaceOrder $placeOrder */
        $placeOrder = app(PlaceOrder::class);
        $placeOrder->execute($request, $buyer);

        $order = Order::where('user_id', $buyer->id)->latest()->first();

        $this->assertNotNull($order);
        $this->assertEquals('vat_inclusive', $order->vat_type);
        $this->assertEquals(1000.00, (float) $order->vatable_sales);
        $this->assertEquals(120.00, (float) $order->vat_amount);
        $this->assertEquals(0.00, (float) $order->vat_exempt_sales);
        $this->assertEquals(12.00, (float) $order->vat_rate);
    }

    public function test_place_order_persists_vat_matrix_for_non_vat_seller(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $nonVatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => false,
            'tin' => '444-555-666-000',
        ]);

        $product = Product::factory()->create([
            'user_id' => $nonVatSeller->id,
            'name' => 'Woven Bamboo Basket',
            'category' => 'Weaving',
            'sku' => 'SKU-' . uniqid(),
            'price' => 450.00,
            'stock' => 10,
        ]);

        $request = Request::create('/checkout', 'POST', [
            'shipping_method' => 'Pick Up',
            'items' => [
                [
                    'id' => $product->id,
                    'qty' => 1,
                    'artisan_id' => $nonVatSeller->id,
                    'name' => $product->name,
                ],
            ],
        ]);

        /** @var PlaceOrder $placeOrder */
        $placeOrder = app(PlaceOrder::class);
        $placeOrder->execute($request, $buyer);

        $order = Order::where('user_id', $buyer->id)->latest()->first();

        $this->assertNotNull($order);
        $this->assertEquals('vat_exempt', $order->vat_type);
        $this->assertEquals(0.00, (float) $order->vatable_sales);
        $this->assertEquals(0.00, (float) $order->vat_amount);
        $this->assertEquals(450.00, (float) $order->vat_exempt_sales);
        $this->assertEquals(12.00, (float) $order->vat_rate);
    }

    public function test_seller_can_update_tax_profile(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.settings.tax'), [
            'tin' => '123456789012',
            'is_vat_registered' => true,
            'tax_business_name' => 'Artisan Craft Enterprise',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $artisan->refresh();
        $this->assertEquals('123-456-789-012', $artisan->tin);
        $this->assertTrue((bool) $artisan->is_vat_registered);
        $this->assertEquals('Artisan Craft Enterprise', $artisan->tax_business_name);
    }

    public function test_receipt_view_renders_bir_tax_matrix(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
            'is_vat_registered' => true,
            'tin' => '777-888-999-000',
            'tax_business_name' => 'Manila Clay Studio Inc.',
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
            'tin' => '111-222-333-444',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-VAT-TEST-99',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'status' => 'Completed',
            'merchandise_subtotal' => 1120.00,
            'shipping_fee_amount' => 0.00,
            'convenience_fee_amount' => 0.00,
            'total_amount' => 1120.00,
            'vat_type' => 'vat_inclusive',
            'vatable_sales' => 1000.00,
            'vat_amount' => 120.00,
            'vat_exempt_sales' => 0.00,
            'vat_rate' => 12.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Handmade Clay Vase',
            'price' => 1120.00,
            'quantity' => 1,
        ]);

        $response = $this->actingAs($buyer)->get(route('my-orders.receipt', $order->id));

        $response->assertOk();
        $response->assertSee('BIR Sales Invoice &amp; Tax Matrix', false);
        $response->assertSee('777-888-999-000');
        $response->assertSee('1,000.00');
        $response->assertSee('120.00');
        $response->assertSee('12% VAT');
    }

    public function test_packing_slip_view_renders_bir_tax_matrix_and_tin(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => true,
            'tin' => '555-666-777-000',
            'tax_business_name' => 'Taal Crafts Cooperative',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-SLIP-TEST-01',
            'user_id' => $artisan->id,
            'artisan_id' => $artisan->id,
            'customer_name' => 'Juan Luna',
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Rizal St, Cavite City',
            'payment_method' => 'COD',
            'status' => 'Accepted',
            'merchandise_subtotal' => 2240.00,
            'shipping_fee_amount' => 80.00,
            'convenience_fee_amount' => 67.20,
            'total_amount' => 2387.20,
            'vat_type' => 'vat_inclusive',
            'vatable_sales' => 2000.00,
            'vat_amount' => 240.00,
            'vat_exempt_sales' => 0.00,
            'vat_rate' => 12.00,
        ]);

        $order->load(['items', 'delivery', 'user']);

        $viewHtml = view('pdf.packing-slips', [
            'orders' => collect([$order]),
            'artisan' => $artisan,
        ])->render();

        $this->assertStringContainsString('555-666-777-000', $viewHtml);
        $this->assertStringContainsString('Vatable Sales:', $viewHtml);
        $this->assertStringContainsString('2,000.00', $viewHtml);
        $this->assertStringContainsString('12% VAT (Included):', $viewHtml);
        $this->assertStringContainsString('240.00', $viewHtml);
    }

    public function test_mixed_cart_checkout_creates_orders_with_respective_vat_matrices(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $vatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => true,
            'tin' => '111-222-333-000',
            'tax_business_name' => 'Vat Workshop Enterprise',
        ]);

        $nonVatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => false,
            'tin' => '444-555-666-000',
        ]);

        $productA = Product::factory()->create([
            'user_id' => $vatSeller->id,
            'name' => 'Ceramic Glazed Mug',
            'category' => 'Pottery',
            'sku' => 'SKU-' . uniqid(),
            'price' => 1120.00,
            'stock' => 10,
        ]);

        $productB = Product::factory()->create([
            'user_id' => $nonVatSeller->id,
            'name' => 'Handmade Woven Coaster',
            'category' => 'Weaving',
            'sku' => 'SKU-' . uniqid(),
            'price' => 450.00,
            'stock' => 10,
        ]);

        $request = Request::create('/checkout', 'POST', [
            'shipping_method' => 'Pick Up',
            'items' => [
                [
                    'id' => $productA->id,
                    'qty' => 1,
                    'artisan_id' => $vatSeller->id,
                    'name' => $productA->name,
                ],
                [
                    'id' => $productB->id,
                    'qty' => 1,
                    'artisan_id' => $nonVatSeller->id,
                    'name' => $productB->name,
                ],
            ],
        ]);

        /** @var PlaceOrder $placeOrder */
        $placeOrder = app(PlaceOrder::class);
        $placeOrder->execute($request, $buyer);

        $orderA = Order::where('user_id', $buyer->id)->where('artisan_id', $vatSeller->id)->first();
        $orderB = Order::where('user_id', $buyer->id)->where('artisan_id', $nonVatSeller->id)->first();

        $this->assertNotNull($orderA);
        $this->assertNotNull($orderB);

        // Order A (VAT seller)
        $this->assertEquals('vat_inclusive', $orderA->vat_type);
        $this->assertEquals(1000.00, (float) $orderA->vatable_sales);
        $this->assertEquals(120.00, (float) $orderA->vat_amount);
        $this->assertEquals(0.00, (float) $orderA->vat_exempt_sales);
        $this->assertEquals(12.00, (float) $orderA->vat_rate);

        // Order B (Non-VAT seller)
        $this->assertEquals('vat_exempt', $orderB->vat_type);
        $this->assertEquals(0.00, (float) $orderB->vatable_sales);
        $this->assertEquals(0.00, (float) $orderB->vat_amount);
        $this->assertEquals(450.00, (float) $orderB->vat_exempt_sales);
        $this->assertEquals(12.00, (float) $orderB->vat_rate);
    }

    public function test_buyer_order_history_serializes_vat_columns(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $vatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => true,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-BUYER-SERIAL-01',
            'user_id' => $buyer->id,
            'artisan_id' => $vatSeller->id,
            'customer_name' => $buyer->name,
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
            'payment_method' => 'COD',
            'status' => 'Pending',
            'merchandise_subtotal' => 1120.00,
            'total_amount' => 1120.00,
            'vat_type' => 'vat_inclusive',
            'vatable_sales' => 1000.00,
            'vat_amount' => 120.00,
            'vat_exempt_sales' => 0.00,
            'vat_rate' => 12.00,
        ]);

        $getBuyerOrders = app(GetBuyerOrders::class);
        $serializedOrders = $getBuyerOrders->execute($buyer);

        $first = $serializedOrders->firstWhere('id', $order->id);
        $this->assertNotNull($first);
        $this->assertEquals('vat_inclusive', $first['vat_type']);
        $this->assertEquals(1000.00, $first['vatable_sales']);
        $this->assertEquals(120.00, $first['vat_amount']);
        $this->assertEquals(0.00, $first['vat_exempt_sales']);
        $this->assertEquals(12.00, $first['vat_rate']);
    }

    public function test_seller_order_manager_serializes_vat_columns(): void
    {
        $vatSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'is_vat_registered' => true,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-SELLER-SERIAL-01',
            'user_id' => $vatSeller->id,
            'artisan_id' => $vatSeller->id,
            'customer_name' => 'Buyer Name',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
            'payment_method' => 'COD',
            'status' => 'Pending',
            'merchandise_subtotal' => 1120.00,
            'total_amount' => 1120.00,
            'vat_type' => 'vat_inclusive',
            'vatable_sales' => 1000.00,
            'vat_amount' => 120.00,
            'vat_exempt_sales' => 0.00,
            'vat_rate' => 12.00,
        ]);

        $listSellerOrders = app(ListSellerOrders::class);
        $result = $listSellerOrders->execute($vatSeller->id, $vatSeller, []);

        $ordersCollection = collect($result['orders']->items());
        $found = $ordersCollection->firstWhere('db_id', $order->id);

        $this->assertNotNull($found);
        $this->assertEquals('vat_inclusive', $found['vat_type']);
        $this->assertEquals(1000.00, $found['vatable_sales']);
        $this->assertEquals(120.00, $found['vat_amount']);
        $this->assertEquals(0.00, $found['vat_exempt_sales']);
        $this->assertEquals(12.00, $found['vat_rate']);
    }

    public function test_historical_receipt_preserves_order_vat_snapshot_even_if_artisan_changes_status(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
            'is_vat_registered' => false,
            'tin' => '111-222-333-000',
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $historicalOrder = Order::create([
            'order_number' => 'ORD-HIST-01',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'status' => 'Completed',
            'merchandise_subtotal' => 500.00,
            'total_amount' => 500.00,
            'vat_type' => 'vat_exempt',
            'vatable_sales' => 0.00,
            'vat_amount' => 0.00,
            'vat_exempt_sales' => 500.00,
            'vat_rate' => 12.00,
        ]);

        OrderItem::create([
            'order_id' => $historicalOrder->id,
            'product_name' => 'Woven Mat',
            'price' => 500.00,
            'quantity' => 1,
        ]);

        // Artisan now registers for VAT after the order was already completed
        $artisan->update(['is_vat_registered' => true]);

        $response = $this->actingAs($buyer)->get(route('my-orders.receipt', $historicalOrder->id));

        $response->assertOk();
        // The historical receipt must still reflect VAT-Exempt Sale, NOT 12% VAT
        $response->assertSee('VAT-Exempt Sale');
        $response->assertDontSee('12% Value-Added Tax (VAT)');
        $response->assertSee('500.00');
    }

    public function test_seller_can_update_tax_profile_with_extended_branch_code(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.settings.tax'), [
            'tin' => '12345678900000',
            'is_vat_registered' => true,
            'tax_business_name' => 'Artisan Craft Enterprise Cavite Branch',
        ]);

        $response->assertRedirect();
        $artisan->refresh();
        $this->assertEquals('123-456-789-00000', $artisan->tin);
    }
}
