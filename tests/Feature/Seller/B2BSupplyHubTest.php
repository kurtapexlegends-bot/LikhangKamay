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

        // Verify stock is now 5 + 20 = 25
        $existingSupply->refresh();
        $this->assertEquals(25, $existingSupply->quantity);
        $this->assertEquals(295.00, (float) $existingSupply->unit_cost);
    }
}
