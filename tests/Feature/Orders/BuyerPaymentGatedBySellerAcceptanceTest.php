<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\Product;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class BuyerPaymentGatedBySellerAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_cannot_pay_online_until_seller_accepts_order(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-GATE-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 600,
            'convenience_fee_amount' => 15,
            'shipping_fee_amount' => 50,
            'platform_commission_amount' => 30,
            'seller_net_amount' => 570,
            'total_amount' => 665,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Acacia St., Dasmariñas, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_name' => 'Ceramic Stoneware Vase',
            'variant' => 'Standard',
            'price' => 600,
            'quantity' => 1,
            'product_img' => null,
        ]);

        // Mock PayMongo session creation
        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function ($data) use ($order) {
                return $data['reference_number'] === $order->order_number
                    && in_array('gcash', $data['payment_method_types'], true);
            }))
            ->andReturn([
                'id' => 'cs_gate_test_123',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.com/cs_gate_test_123',
                ]
            ]);
        $this->app->instance(PayMongoService::class, $paymongoMock);

        // 1. Guard check: Buyer cannot pay while order is Pending
        $responsePending = $this->actingAs($buyer)->post(route('payment.pay', $order->order_number));
        $responsePending->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('error', 'Please wait for the seller to accept your order before making payment.');

        $this->assertNull($order->fresh()->paymongo_session_id);

        // 2. Seller accepts the order
        $order->update([
            'status' => 'Accepted',
            'accepted_at' => now(),
        ]);

        // 3. Buyer can now proceed to payment
        $responseAccepted = $this->actingAs($buyer)->post(route('payment.pay', $order->order_number));
        $responseAccepted->assertRedirect('https://checkout.paymongo.com/cs_gate_test_123');
        $this->assertSame('cs_gate_test_123', $order->fresh()->paymongo_session_id);
    }
}
