<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Services\BOMDeductionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BOMDeductionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_deducts_raw_materials_and_auto_drafts_stock_request_when_low_stock(): void
    {
        $artisan = User::factory()->create(['role' => 'artisan']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $supply = Supply::create([
            'user_id' => $artisan->id,
            'sku' => 'SUP-CLAY-001',
            'name' => 'Stoneware Clay',
            'category' => 'Raw Clay & Slips',
            'quantity' => 10,
            'unit' => 'kg',
            'min_stock' => 5,
            'max_stock' => 30,
            'unit_cost' => 150.00,
        ]);

        $product = Product::create([
            'user_id' => $artisan->id,
            'artisan_id' => $artisan->id,
            'name' => 'Handmade Ceramic Vase',
            'sku' => 'PROD-CERAMIC-001',
            'category' => 'Vases',
            'status' => 'Active',
            'production_method' => 'manufactured',
            'price' => 600,
            'cost_price' => 150,
            'stock' => 10,
            'lead_time' => '1 day',
        ]);

        ProductRecipe::create([
            'product_id' => $product->id,
            'supply_id' => $supply->id,
            'quantity_required' => 3.0,
        ]);

        $order = Order::create([
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TEST-BOM-1',
            'customer_name' => $buyer->name,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Artisan Street, Makati City',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 1200,
            'total_amount' => 1200,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'price' => 600,
            'total' => 1200,
        ]);

        $service = app(BOMDeductionService::class);

        // 1. First deduction: 3kg * 2 = 6kg. Supply starts at 10kg, remaining = 4kg (<= min_stock 5)
        $service->deductForOrder($order);

        $supply->refresh();
        $this->assertEquals(4, $supply->quantity);

        // 2. Auto-generated StockRequest check
        $stockRequest = StockRequest::where('supply_id', $supply->id)->first();
        $this->assertNotNull($stockRequest);
        $this->assertEquals(StockRequest::STATUS_PENDING, $stockRequest->status);
        $this->assertEquals($artisan->id, $sockRequest->requested_by_user_id ?? $artisan->id);
        $this->assertEquals(26, $stockRequest->quantity); // max_stock (30) - current (4) = 26

        // 3. Idempotency test: calling deductForOrder again should NOT deduct twice
        $service->deductForOrder($order);
        $supply->refresh();
        $this->assertEquals(4, $supply->quantity);

        // 4. Restoration test on cancellation/rejection
        $service->restoreForOrder($order);
        $supply->refresh();
        $this->assertEquals(10, $supply->quantity);
    }
}
