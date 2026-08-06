<?php

namespace Tests\Feature;

use App\Models\Discount;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscountTest extends TestCase
{
    use RefreshDatabase;

    protected function createSeller(): User
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $seller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        return $seller;
    }

    public function test_seller_can_create_percentage_discount()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Handmade Clay Vase',
            'sku' => 'VASE-001',
            'category' => 'Pottery',
            'price' => 1000.00,
            'status' => 'Active',
        ]);

        $response = $this->actingAs($seller)->post(route('discounts.store'), [
            'name' => '15% Off Summer Sale',
            'type' => 'percentage',
            'value' => 15,
            'start_at' => now()->subHour()->toIso8601String(),
            'end_at' => now()->addDays(7)->toIso8601String(),
            'product_ids' => [$product->id],
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('discounts', [
            'user_id' => $seller->id,
            'name' => '15% Off Summer Sale',
            'type' => 'percentage',
            'value' => 15,
        ]);

        $product->refresh();
        $this->assertTrue($product->has_discount);
        $this->assertEquals(850.00, $product->effective_price);
        $this->assertEquals(15, $product->discount_info['percentage_off']);
    }

    public function test_price_safety_guard_blocks_discount_exceeding_product_price()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Cheap Trinket',
            'sku' => 'TRINKET-01',
            'category' => 'Small',
            'price' => 50.00,
            'status' => 'Active',
        ]);

        // Attempting to set fixed promo price of ₱100 on a ₱50 item!
        $response = $this->actingAs($seller)->post(route('discounts.store'), [
            'name' => 'Invalid Discount',
            'type' => 'fixed',
            'value' => 100,
            'start_at' => now()->subHour()->toIso8601String(),
            'end_at' => now()->addDays(3)->toIso8601String(),
            'product_ids' => [$product->id],
        ]);

        $response->assertSessionHasErrors(['value']);
    }

    public function test_seller_can_create_fixed_promo_price_discount()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'MUG-002',
            'category' => 'Kitchenware',
            'price' => 1200.00,
            'status' => 'Active',
        ]);

        $response = $this->actingAs($seller)->post(route('discounts.store'), [
            'name' => 'Special Promo 1000',
            'type' => 'fixed',
            'value' => 1000,
            'start_at' => now()->subHour()->toIso8601String(),
            'end_at' => now()->addDays(3)->toIso8601String(),
            'product_ids' => [$product->id],
        ]);

        $response->assertSessionHasNoErrors();
        $product->refresh();
        $this->assertTrue($product->has_discount);
        $this->assertEquals(1000.00, $product->effective_price);
        $this->assertEquals(200.00, $product->discount_info['saved_amount']);
    }

    public function test_seller_can_create_per_product_custom_discounts()
    {
        $seller = $this->createSeller();

        $productA = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Product A',
            'sku' => 'SKU-A',
            'category' => 'Art',
            'price' => 2000.00,
            'status' => 'Active',
        ]);

        $productB = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Product B',
            'sku' => 'SKU-B',
            'category' => 'Art',
            'price' => 500.00,
            'status' => 'Active',
        ]);

        $response = $this->actingAs($seller)->post(route('discounts.store'), [
            'name' => 'Custom Per Product Campaign',
            'start_at' => now()->subHour()->toIso8601String(),
            'end_at' => now()->addDays(5)->toIso8601String(),
            'items' => [
                ['product_id' => $productA->id, 'type' => 'percentage', 'value' => 25],
                ['product_id' => $productB->id, 'type' => 'fixed', 'value' => 400],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $productA->refresh();
        $productB->refresh();

        $this->assertTrue($productA->has_discount);
        $this->assertEquals(1500.00, $productA->effective_price);

        $this->assertTrue($productB->has_discount);
        $this->assertEquals(400.00, $productB->effective_price);
    }

    public function test_lowest_price_wins_strategy_for_overlapping_active_discounts()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Overlap Pot',
            'sku' => 'POT-99',
            'category' => 'Pottery',
            'price' => 1000.00,
            'status' => 'Active',
        ]);

        // 10% OFF discount
        $discount10 = Discount::create([
            'user_id' => $seller->id,
            'name' => '10% Off',
            'type' => 'percentage',
            'value' => 10,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDays(2),
            'is_active' => true,
        ]);
        $discount10->products()->attach($product->id);

        // 40% OFF discount (better deal)
        $discount40 = Discount::create([
            'user_id' => $seller->id,
            'name' => '40% Off',
            'type' => 'percentage',
            'value' => 40,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDays(2),
            'is_active' => true,
        ]);
        $discount40->products()->attach($product->id);

        $product->refresh();
        $this->assertTrue($product->has_discount);
        // Lowest Price Wins: 1000 * 0.6 = 600
        $this->assertEquals(600.00, $product->effective_price);
    }

    public function test_promo_stock_quota_exhaustion()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Flash Sale Item',
            'sku' => 'FLASH-1',
            'category' => 'Limited',
            'price' => 800.00,
            'status' => 'Active',
        ]);

        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Flash Quota 5 Items',
            'type' => 'percentage',
            'value' => 50,
            'promo_stock' => 5,
            'promo_sold' => 5, // Fully sold out promo stock!
            'start_at' => now()->subHour(),
            'end_at' => now()->addDays(1),
            'is_active' => true,
        ]);
        $discount->products()->attach($product->id);

        $product->refresh();
        $this->assertFalse($product->has_discount);
        $this->assertEquals(800.00, $product->effective_price);
    }

    public function test_expired_discount_is_not_active()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Terracotta Planter',
            'sku' => 'PLANT-003',
            'category' => 'Home Decor',
            'price' => 500.00,
            'status' => 'Active',
        ]);

        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Expired Discount',
            'type' => 'percentage',
            'value' => 20,
            'start_at' => now()->subDays(10),
            'end_at' => now()->subDay(),
            'is_active' => true,
        ]);

        $discount->products()->attach($product->id);

        $product->refresh();
        $this->assertFalse($product->has_discount);
        $this->assertEquals(500.00, $product->effective_price);
    }

    public function test_discount_with_max_purchase_limit_calculates_correct_quantity_price()
    {
        $seller = $this->createSeller();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Woven Basket',
            'sku' => 'BASKET-10',
            'category' => 'Crafts',
            'price' => 1000.00,
            'status' => 'Active',
        ]);

        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Max 2 Per Order Discount',
            'type' => 'percentage',
            'value' => 50, // 50% OFF -> ₱500 promo price
            'max_purchase_limit' => 2,
            'start_at' => now()->subHour(),
            'end_at' => now()->addDays(2),
            'is_active' => true,
        ]);
        $discount->products()->attach($product->id);

        $product->refresh();

        // 5 units ordered: 2 units at promo price (₱500 * 2 = ₱1,000) + 3 units at regular price (₱1,000 * 3 = ₱3,000) = ₱4,000 total!
        $totalPrice = $product->calculateTotalPriceForQuantity(5);
        $this->assertEquals(4000.00, $totalPrice);
    }
}
