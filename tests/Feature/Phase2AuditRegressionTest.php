<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class Phase2AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_rejects_empty_items_payload(): void
    {
        $buyer = User::factory()->create();

        $response = $this->from('/checkout')->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [],
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Empty Cart Street, Cavite',
            'shipping_address_type' => 'home',
            'payment_method' => 'COD',
            'total' => 0,
        ]);

        $response
            ->assertRedirect('/checkout')
            ->assertSessionHasErrors('items');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_online_payment_route_rejects_cod_orders_even_if_accessed_directly(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-COD-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_method' => 'Pick Up',
        ]);

        $response = $this->actingAs($buyer)->get(route('payment.pay', $order->order_number));

        $response
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('error', 'This order is not eligible for online payment.');

        $this->assertNull($order->fresh()->paymongo_session_id);
    }

    public function test_success_callback_does_not_mark_non_payable_order_paid(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 500);

        $order = Order::create([
            'order_number' => 'ORD-CANCEL-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500,
            'status' => 'Cancelled',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_cancelled',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 500,
            'quantity' => 1,
            'product_img' => $product->cover_photo_path,
        ]);

        $mock = Mockery::mock(PayMongoService::class);
        $mock->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_cancelled')
            ->andReturn([
                'attributes' => [
                    'reference_number' => $order->order_number,
                    'payment_status' => 'paid',
                    'status' => 'completed',
                ],
                'included' => [
                    [
                        'type' => 'payment',
                        'attributes' => [
                            'status' => 'paid',
                        ],
                    ],
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mock);

        $response = $this->actingAs($buyer)->get(route('payment.success', ['order_id' => $order->order_number]));

        $response
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('error', 'This payment can no longer be applied to the order. Please contact support if you were charged.');

        $order->refresh();
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('cs_test_cancelled', $order->paymongo_session_id);
    }

    public function test_seller_cannot_manually_mark_online_payment_order_as_paid(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-MANUAL-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500,
            'status' => 'Accepted',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $response = $this->from('/orders')->actingAs($seller)->post(route('orders.payment-status', $order->order_number), [
            'payment_status' => 'paid',
        ]);

        $response
            ->assertRedirect('/orders')
            ->assertSessionHas('error', 'Only cash on delivery orders can be marked paid manually.');

        $this->assertSame('pending', $order->fresh()->payment_status);
    }

    private function createProduct(User $seller, float $price): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'P2-AUDIT-' . fake()->unique()->numerify('###'),
            'name' => 'Phase 2 Audit Product',
            'description' => 'Regression test product.',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => $price,
            'cost_price' => round($price * 0.6, 2),
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }
}
