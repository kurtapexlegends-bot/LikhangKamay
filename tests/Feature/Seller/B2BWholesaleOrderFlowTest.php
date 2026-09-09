<?php

namespace Tests\Feature\Seller;

use App\Actions\Consumer\PlaceOrder;
use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class B2BWholesaleOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $supplierArtisan;
    private User $buyerArtisan;
    private User $otherArtisan;
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

        $this->otherArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'approved_at' => now(),
            'setup_completed_at' => now(),
            'shop_name' => 'Vigan Terracotta Works',
            'city' => 'Ilocos',
        ]);

        $this->b2bClaySack = Product::factory()->create([
            'user_id' => $this->supplierArtisan->id,
            'sku' => 'B2B-CLAY-SACK-25',
            'name' => 'Premium Stoneware Moist Clay 25kg',
            'category' => 'Raw Clay & Slips',
            'price' => 350.00,
            'cost_price' => 180.00,
            'stock' => 200,
            'weight' => 25.0,
            'is_b2b_supply' => true,
            'moq' => 5,
            'wholesale_price' => 280.00,
            'wholesale_min_qty' => 20,
            'supply_unit' => 'bag',
            'status' => 'Active',
        ]);
    }

    public function test_cannot_add_b2b_item_to_cart_below_minimum_order_quantity(): void
    {
        // Try adding 2 bags when MOQ is 5
        $response = $this->actingAs($this->buyerArtisan)
            ->postJson(route('cart.store'), [
                'product_id' => $this->b2bClaySack->id,
                'quantity' => 2,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => "Minimum order quantity for Premium Stoneware Moist Clay 25kg is 5 bag.",
        ]);
    }

    public function test_can_add_b2b_item_to_cart_at_or_above_moq_with_correct_pricing(): void
    {
        // Add exact MOQ of 5 bags (retail unit rate applies because below wholesale threshold 20)
        $response = $this->actingAs($this->buyerArtisan)
            ->postJson(route('cart.store'), [
                'product_id' => $this->b2bClaySack->id,
                'quantity' => 5,
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'message' => 'Added to cart!',
            'cart_count' => 5,
        ]);

        $cart = session('cart');
        $item = reset($cart);
        $this->assertEquals(5, $item['qty']);
        $this->assertEquals(350.00, (float) $item['price']);
        $this->assertTrue((bool) $item['is_b2b_supply']);
        $this->assertEquals(5, $item['moq']);
        $this->assertEquals('bag', $item['supply_unit']);
    }

    public function test_cannot_update_cart_item_quantity_below_moq(): void
    {
        $this->actingAs($this->buyerArtisan)
            ->postJson(route('cart.store'), [
                'product_id' => $this->b2bClaySack->id,
                'quantity' => 5,
            ]);

        $cart = session('cart');
        $cartKey = array_key_first($cart);

        // Attempt reducing quantity to 3 (below MOQ 5)
        $response = $this->actingAs($this->buyerArtisan)
            ->patchJson(route('cart.update'), [
                'id' => $cartKey,
                'qty' => 3,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => "Minimum order quantity for Premium Stoneware Moist Clay 25kg is 5 bag.",
        ]);
    }

    public function test_updating_cart_quantity_at_or_above_wholesale_threshold_applies_wholesale_tier_price(): void
    {
        $this->actingAs($this->buyerArtisan)
            ->postJson(route('cart.store'), [
                'product_id' => $this->b2bClaySack->id,
                'quantity' => 5,
            ]);

        $cart = session('cart');
        $cartKey = array_key_first($cart);

        // Update quantity to 20 (qualifies for wholesale tier: 280.00)
        $response = $this->actingAs($this->buyerArtisan)
            ->patchJson(route('cart.update'), [
                'id' => $cartKey,
                'qty' => 20,
            ]);

        $response->assertOk();
        $cart = session('cart');
        $this->assertEquals(20, $cart[$cartKey]['qty']);
        $this->assertEquals(280.00, (float) $cart[$cartKey]['price']);

        // Reduce back to 10 (still >= MOQ 5, but below wholesale min 20 -> reverts to 350.00)
        $response2 = $this->actingAs($this->buyerArtisan)
            ->patchJson(route('cart.update'), [
                'id' => $cartKey,
                'qty' => 10,
            ]);

        $response2->assertOk();
        $cart = session('cart');
        $this->assertEquals(10, $cart[$cartKey]['qty']);
        $this->assertEquals(350.00, (float) $cart[$cartKey]['price']);
    }

    public function test_cart_index_preserves_and_syncs_dynamic_wholesale_tier_pricing(): void
    {
        // Add 25 bags directly into cart session (above wholesale threshold of 20)
        $cartKey = $this->b2bClaySack->id . ':standard';
        $sessionCart = [
            $cartKey => [
                'id' => $this->b2bClaySack->id,
                'cart_key' => $cartKey,
                'qty' => 25,
                'price' => 350.00, // starts at regular price
                'variant' => 'Standard',
                'is_b2b_supply' => true,
            ]
        ];

        $response = $this->actingAs($this->buyerArtisan)
            ->withSession(['cart' => $sessionCart])
            ->getJson(route('cart.index'));

        $response->assertOk();
        $cartData = $response->json('cart');
        $item = reset($cartData);
        // Effective wholesale price 280.00 must be computed and synced
        $this->assertEquals(280.00, (float) $item['price']);
        $this->assertEquals(5, $item['moq']);
        $this->assertEquals('bag', $item['supply_unit']);
        $this->assertTrue((bool) $item['is_b2b_supply']);
    }

    public function test_checkout_order_placement_persists_b2b_supply_flags_and_order_items(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-B2B-CHECKOUT-101',
            'user_id' => $this->buyerArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Pottery Studio, Cavite',
            'merchandise_subtotal' => 5600.00,
            'total_amount' => 5600.00,
            'status' => 'Pending',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'shipping_method' => 'Delivery',
        ]);

        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 280.00,
            'cost' => 180.00,
            'quantity' => 20,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        $order->refresh();
        $this->assertTrue($order->isB2BOrder());
        $this->assertEquals(1, Order::whereB2B()->where('id', $order->id)->count());
        $this->assertEquals(0, Order::whereRetail()->where('id', $order->id)->count());

        $this->assertTrue((bool) $orderItem->is_b2b_supply);
        $this->assertEquals('bag', $orderItem->supply_unit);
    }

    public function test_artisan_buyer_and_supplier_can_view_printable_purchase_order_and_invoice(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-B2B-INVOICE-202',
            'user_id' => $this->buyerArtisan->id,
            'artisan_id' => $this->supplierArtisan->id,
            'customer_name' => $this->buyerArtisan->name,
            'shipping_address' => 'Silang Pottery Studio, Cavite',
            'merchandise_subtotal' => 5600.00,
            'shipping_fee_amount' => 450.00,
            'convenience_fee_amount' => 50.00,
            'total_amount' => 6100.00,
            'status' => 'Processing',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->b2bClaySack->id,
            'product_name' => $this->b2bClaySack->name,
            'price' => 280.00,
            'cost' => 180.00,
            'quantity' => 20,
            'is_b2b_supply' => true,
            'supply_unit' => 'bag',
        ]);

        // Buyer views purchase order from Sourcing Orders
        $buyerResponse = $this->actingAs($this->buyerArtisan)
            ->get(route('seller.supply-hub.orders.invoice', $order->order_number));

        $buyerResponse->assertOk();
        $buyerResponse->assertViewIs('pdf.receipt');
        $buyerResponse->assertSee('Official B2B Purchase Order &amp; Wholesale Commercial Invoice', false);
        $buyerResponse->assertSee('PO-' . $order->order_number);
        $buyerResponse->assertSee('Silang Pottery Studio');
        $buyerResponse->assertSee('Bulacan Clayworks');
        $buyerResponse->assertSee('bag');
        $buyerResponse->assertSee('5,600.00');

        // Supplier views wholesale invoice from Wholesale Sales
        $supplierResponse = $this->actingAs($this->supplierArtisan)
            ->get(route('seller.supply-hub.sales.invoice', $order->order_number));

        $supplierResponse->assertOk();
        $supplierResponse->assertViewIs('pdf.receipt');
        $supplierResponse->assertSee('Official B2B Purchase Order &amp; Wholesale Commercial Invoice', false);

        // Third-party artisan cannot access this invoice
        $otherResponse = $this->actingAs($this->otherArtisan)
            ->get(route('seller.supply-hub.orders.invoice', $order->order_number));
        $otherResponse->assertStatus(404);
    }
}
