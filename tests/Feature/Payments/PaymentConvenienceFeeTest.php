<?php

namespace Tests\Feature\Payments;

use App\Models\Order;
use App\Models\User;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaymentConvenienceFeeTest extends TestCase
{
    use RefreshDatabase;

    public function test_online_payment_session_includes_convenience_fee_line_item(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-PAY-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 20,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
            'total_amount' => 520,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_name' => 'Payment Test Item',
            'variant' => 'Standard',
            'price' => 500,
            'quantity' => 1,
            'product_img' => null,
        ]);

        $mock = Mockery::mock(PayMongoService::class);
        $mock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function (array $data) use ($order) {
                $this->assertSame($order->order_number, $data['reference_number']);
                $this->assertCount(2, $data['line_items']);
                $this->assertSame('Payment Test Item', $data['line_items'][0]['name']);
                $this->assertSame('Convenience Fee', $data['line_items'][1]['name']);
                $this->assertSame(2000, $data['line_items'][1]['amount']);
                return true;
            }))
            ->andReturn([
                'id' => 'cs_test_123',
                'attributes' => [
                    'checkout_url' => 'https://paymongo.test/checkout',
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mock);

        $response = $this->actingAs($buyer)->get(route('payment.pay', $order->order_number));

        $response
            ->assertRedirect('https://paymongo.test/checkout');

        $this->assertSame('cs_test_123', $order->fresh()->paymongo_session_id);
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
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 0,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
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

        $order = Order::create([
            'order_number' => 'ORD-CANCEL-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 20,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
            'total_amount' => 520,
            'status' => 'Cancelled',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_cancelled',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
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
}
