<?php

namespace Tests\Feature\Orders;

use App\Mail\OrderCancelled;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CancelUnpaidOrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancels_unpaid_online_orders_older_than_two_hours_and_restores_stock(): void
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $seller = User::factory()->artisanApproved()->create(['email' => 'artisan@example.com']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Woven Straw Hat',
            'sku' => 'WSH-001',
            'category' => 'Wearables',
            'status' => 'Active',
            'price' => 300,
            'cost_price' => 120,
            'stock' => 5,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/hat.jpg',
        ]);

        // Unpaid GCash order created 3 hours ago
        $expiredOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-EXPIRED-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 600,
            'convenience_fee_amount' => 15,
            'total_amount' => 615,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Test St, Dasmariñas, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $expiredOrder->created_at = now()->subHours(3);
        $expiredOrder->saveQuietly();

        $expiredOrder->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 300,
            'cost' => 120,
            'quantity' => 2,
        ]);

        // Recent GCash order created 30 minutes ago (should NOT be cancelled)
        $recentOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-RECENT-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 15,
            'total_amount' => 315,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Test St, Dasmariñas, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $recentOrder->created_at = now()->subMinutes(30);
        $recentOrder->saveQuietly();

        $recentOrder->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 300,
            'cost' => 120,
            'quantity' => 1,
        ]);

        // COD order created 4 hours ago (should NOT be cancelled by unpaid online sweep)
        $codOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-COD-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 15,
            'total_amount' => 315,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '123 Test St, Dasmariñas, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $codOrder->created_at = now()->subHours(4);
        $codOrder->saveQuietly();

        $codOrder->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 300,
            'cost' => 120,
            'quantity' => 1,
        ]);

        Artisan::call('orders:cancel-unpaid');

        // Verify expired order is cancelled and stock restored
        $expiredOrder->refresh();
        $this->assertEquals('Cancelled', $expiredOrder->status);
        $this->assertStringContainsString('Auto-cancelled due to non-payment', $expiredOrder->shipping_notes);
        
        $product->refresh();
        $this->assertEquals(7, $product->stock); // 5 + 2 restored

        // Verify recent order is untouched
        $recentOrder->refresh();
        $this->assertEquals('Pending', $recentOrder->status);

        // Verify COD order is untouched
        $codOrder->refresh();
        $this->assertEquals('Pending', $codOrder->status);

        Mail::assertSent(OrderCancelled::class, function ($mail) use ($buyer) {
            return $mail->hasTo($buyer->email);
        });
    }
}
