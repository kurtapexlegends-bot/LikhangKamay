<?php

namespace Tests\Feature\Security;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitingSecurityTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $artisan;
    private Product $product;
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Test Buyer',
            'email' => 'buyer_ratelimit@likhangkamay.com',
            'email_verified_at' => now(),
        ]);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'name' => 'Artisan Seller',
            'email_verified_at' => now(),
        ]);

        $this->product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'sku' => 'RATE-001',
            'category' => 'Pottery',
            'name' => 'Rate Limit Test Pot',
            'price' => 100,
            'stock' => 50,
        ]);

        $this->order = Order::create([
            'order_number' => 'ORD-RL-100',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'status' => 'Completed',
            'merchandise_subtotal' => 100.00,
            'shipping_fee_amount' => 0.00,
            'convenience_fee_amount' => 0.00,
            'total_amount' => 100.00,
            'seller_net_amount' => 100.00,
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'variant' => 'Standard',
            'quantity' => 1,
            'price' => 100.00,
        ]);
    }

    public function test_reviews_submission_is_throttled_after_limit(): void
    {
        $this->actingAs($this->buyer);

        for ($i = 0; $i < 6; $i++) {
            $this->post(route('reviews.store'), [
                'product_id' => $this->product->id,
                'order_item_id' => $this->order->items->first()->id,
                'rating' => 5,
                'comment' => 'Review attempt ' . $i,
            ]);
        }

        $response = $this->post(route('reviews.store'), [
            'product_id' => $this->product->id,
            'order_item_id' => $this->order->items->first()->id,
            'rating' => 5,
            'comment' => 'Throttled attempt',
        ]);

        $response->assertStatus(429);
    }

    public function test_checkout_store_is_throttled_after_limit(): void
    {
        $this->actingAs($this->buyer);

        for ($i = 0; $i < 10; $i++) {
            $this->post(route('checkout.store'), []);
        }

        $response = $this->post(route('checkout.store'), []);

        $response->assertStatus(429);
    }
}
