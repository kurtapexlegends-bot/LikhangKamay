<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BuyerCancelOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_cancel_pending_order_with_structured_reason()
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $seller = User::factory()->artisanApproved()->create(['email' => 'artisan@example.com']);
        
        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Handmade Clay Bowl',
            'sku' => 'HCB-001',
            'category' => 'Ceramics',
            'status' => 'Active',
            'price' => 250,
            'cost_price' => 100,
            'stock' => 10,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/clay-bowl.jpg',
        ]);

        $product->decrement('stock', 2);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-CANCEL-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'total_amount' => 515,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '123 Test St, Dasmariñas, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 250,
            'cost' => 100,
            'quantity' => 2,
            'product_img' => 'products/clay-bowl.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.cancel', $order->id), [
            'reason' => 'change_delivery_address',
            'details' => 'Need to deliver to office instead',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Order cancelled successfully.');

        $order->refresh();
        $this->assertEquals('Cancelled', $order->status);
        $this->assertStringContainsString('change_delivery_address', $order->cancellation_reason);
        $this->assertEquals(10, $product->fresh()->stock);

        Mail::assertSent(\App\Mail\OrderCancelled::class);
    }

    public function test_buyer_can_cancel_accepted_order_within_15_minute_grace_period()
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $seller = User::factory()->artisanApproved()->create(['email' => 'artisan2@example.com']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Woven Basket',
            'sku' => 'WB-001',
            'category' => 'Baskets',
            'status' => 'Active',
            'price' => 300,
            'cost_price' => 120,
            'stock' => 5,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/basket.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-GRACE-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'total_amount' => 315,
            'status' => 'Accepted',
            'accepted_at' => now()->subMinutes(5),
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '456 Test St, Silang, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 300,
            'cost' => 120,
            'quantity' => 1,
            'product_img' => 'products/basket.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.cancel', $order->id), [
            'reason' => 'ordered_by_mistake',
        ]);

        $response->assertRedirect();
        $this->assertEquals('Cancelled', $order->fresh()->status);
    }

    public function test_buyer_cannot_cancel_accepted_order_after_grace_period()
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $seller = User::factory()->artisanApproved()->create(['email' => 'artisan3@example.com']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Bamboo Lamp',
            'sku' => 'BL-001',
            'category' => 'Lighting',
            'status' => 'Active',
            'price' => 800,
            'cost_price' => 300,
            'stock' => 3,
            'lead_time' => '2 days',
            'cover_photo_path' => 'products/lamp.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-EXPIRED-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 800,
            'total_amount' => 815,
            'status' => 'Accepted',
            'accepted_at' => now()->subMinutes(20),
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '789 Test St, Tagaytay, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 800,
            'cost' => 300,
            'quantity' => 1,
            'product_img' => 'products/lamp.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.cancel', $order->id), [
            'reason' => 'ordered_by_mistake',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertEquals('Accepted', $order->fresh()->status);
    }

    public function test_buyer_can_change_address_and_reorder_in_one_click()
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $seller = User::factory()->artisanApproved()->create(['email' => 'artisan4@example.com']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Handwoven Placemat',
            'sku' => 'HP-001',
            'category' => 'Home',
            'status' => 'Active',
            'price' => 150,
            'cost_price' => 60,
            'stock' => 8,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/placemat.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REORDER-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'total_amount' => 315,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Old Address, Bacoor, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 150,
            'cost' => 60,
            'quantity' => 2,
            'product_img' => 'products/placemat.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.change-address-reorder', $order->id));

        $response->assertRedirect(route('checkout.create'));
        $this->assertEquals('Cancelled', $order->fresh()->status);
        $this->assertStringContainsString('change_delivery_address', $order->fresh()->cancellation_reason);
        $this->assertEquals(10, $product->fresh()->stock); // 8 + 2 restored
        
        $sessionCart = session('cart');
        $this->assertNotEmpty($sessionCart);
        $cartItem = array_values($sessionCart)[0];
        $this->assertEquals($product->id, $cartItem['id']);
        $this->assertEquals(2, $cartItem['qty']);
    }
}
