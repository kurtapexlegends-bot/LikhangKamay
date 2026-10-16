<?php

namespace Tests\Feature\Orders;

use App\Actions\Consumer\PlaceOrder;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CheckoutUserConcurrencyLockTest extends TestCase
{
    use RefreshDatabase;

    public function test_concurrent_checkout_is_blocked_when_user_lock_is_held(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'LOCK-001',
            'name' => 'Lock Test Product',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 200,
            'cost_price' => 100,
            'stock' => 5,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $lockKey = "checkout:user:{$buyer->id}";
        $existingLock = Cache::lock($lockKey, 15);
        $this->assertTrue($existingLock->get(), 'Failed to acquire simulated lock.');

        $placeOrder = app(PlaceOrder::class);
        $request = new Request([
            'items' => [
                [
                    'id' => $product->id,
                    'artisan_id' => $seller->id,
                    'name' => $product->name,
                    'qty' => 1,
                    'price' => 200,
                ],
            ],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 200,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('An order is currently being processed for your account. Please wait a moment.');

        try {
            $placeOrder->execute($request, $buyer);
        } finally {
            $existingLock->release();
        }
    }

    public function test_buyer_checkout_controller_redirects_back_with_error_flash_when_user_lock_is_held(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'LOCK-002',
            'name' => 'Lock Controller Test Product',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 250,
            'cost_price' => 120,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $lockKey = "checkout:user:{$buyer->id}";
        $existingLock = Cache::lock($lockKey, 15);
        $this->assertTrue($existingLock->get());

        try {
            $response = $this->actingAs($buyer)
                ->from(route('cart.index'))
                ->post(route('checkout.store'), [
                    'items' => [
                        [
                            'id' => $product->id,
                            'artisan_id' => $seller->id,
                            'name' => $product->name,
                            'qty' => 2,
                            'variant' => 'Standard',
                        ],
                    ],
                    'shipping_method' => 'Pick Up',
                    'payment_method' => 'COD',
                    'total' => 500,
                ]);

            $response->assertRedirect(route('cart.index'));
            $response->assertSessionHas('error', 'An order is currently being processed for your account. Please wait a moment.');

            // Verify no order was created and stock was not decremented
            $this->assertDatabaseMissing('orders', [
                'user_id' => $buyer->id,
            ]);
            $this->assertEquals(10, $product->fresh()->stock);
        } finally {
            $existingLock->release();
        }
    }

    public function test_user_lock_is_safely_released_after_checkout_completes(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'LOCK-003',
            'name' => 'Lock Release Test Product',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 300,
            'cost_price' => 150,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)
            ->post(route('checkout.store'), [
                'items' => [
                    [
                        'id' => $product->id,
                        'artisan_id' => $seller->id,
                        'name' => $product->name,
                        'qty' => 1,
                        'variant' => 'Standard',
                    ],
                ],
                'shipping_method' => 'Pick Up',
                'payment_method' => 'COD',
                'total' => 300,
            ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        // Lock must be released
        $lockKey = "checkout:user:{$buyer->id}";
        $testLock = Cache::lock($lockKey, 10);
        $this->assertTrue($testLock->get(), 'Checkout lock remained held after order placement.');
        $testLock->release();
    }
}
