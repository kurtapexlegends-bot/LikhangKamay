<?php

namespace Tests\Feature\Console;

use App\Models\Order;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class VerifyPaymongoPaymentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_verifies_pending_orders_within_24_hours(): void
    {
        $buyer = User::factory()->create();
        $artisan = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-RECENT-01',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 200,
            'convenience_fee_amount' => 6,
            'platform_commission_amount' => 10,
            'seller_net_amount' => 190,
            'total_amount' => 206,
            'status' => Order::STATUS_PENDING,
            'shipping_address' => '123 Test St, Imus, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_recent_123',
            'created_at' => now()->subHours(2),
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_recent_123')
            ->andReturn([
                'attributes' => [
                    'payment_status' => 'paid',
                ],
                'included' => [
                    [
                        'type' => 'payment',
                        'id' => 'pay_recent_456',
                        'attributes' => [
                            'status' => 'paid',
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $this->artisan('paymongo:verify')
            ->assertSuccessful();

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('pay_recent_456', $order->payment_id);
    }

    public function test_ignores_orders_older_than_24_hours(): void
    {
        $buyer = User::factory()->create();
        $artisan = User::factory()->artisanApproved()->create();

        $staleOrder = Order::create([
            'order_number' => 'ORD-STALE-01',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 200,
            'convenience_fee_amount' => 6,
            'platform_commission_amount' => 10,
            'seller_net_amount' => 190,
            'total_amount' => 206,
            'status' => Order::STATUS_PENDING,
            'shipping_address' => '123 Test St, Imus, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_stale_999',
        ]);
        $staleOrder->created_at = now()->subHours(30);
        $staleOrder->saveQuietly();

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->never();
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $this->artisan('paymongo:verify')
            ->assertSuccessful();

        $staleOrder->refresh();
        $this->assertSame('pending', $staleOrder->payment_status);
    }

    public function test_reconciles_cancelled_orders_if_paymongo_confirms_paid(): void
    {
        $buyer = User::factory()->create();
        $artisan = User::factory()->artisanApproved()->create();

        $cancelledOrder = Order::create([
            'order_number' => 'ORD-CANCELLED-01',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350,
            'convenience_fee_amount' => 10.50,
            'platform_commission_amount' => 17.50,
            'seller_net_amount' => 332.50,
            'total_amount' => 360.50,
            'status' => Order::STATUS_CANCELLED,
            'cancellation_reason' => 'Customer requested cancellation prior to confirmation',
            'shipping_address' => '123 Test St, Imus, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_cancelled_789',
            'created_at' => now()->subHours(1),
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_cancelled_789')
            ->andReturn([
                'attributes' => [
                    'payment_status' => 'paid',
                ],
                'included' => [
                    [
                        'type' => 'payment',
                        'id' => 'pay_cancelled_999',
                        'attributes' => [
                            'status' => 'paid',
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $this->artisan('paymongo:verify')
            ->assertSuccessful();

        $cancelledOrder->refresh();
        $this->assertSame('paid', $cancelledOrder->payment_status);
        $this->assertSame('pay_cancelled_999', $cancelledOrder->payment_id);
        $this->assertSame(Order::STATUS_CANCELLED, $cancelledOrder->status);
        $this->assertStringContainsString('[PAID_AFTER_CANCELLATION]', (string) $cancelledOrder->cancellation_reason);
        $this->assertStringContainsString('Customer requested cancellation prior to confirmation', (string) $cancelledOrder->cancellation_reason);
    }

    public function test_verifies_pending_subscription_transactions(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'tier' => 'artisan_pro',
            'amount' => 499.00,
            'payment_method' => 'gcash',
            'status' => 'pending',
            'paymongo_session_id' => 'cs_sub_123',
            'created_at' => now()->subHours(2),
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_sub_123')
            ->andReturn([
                'attributes' => [
                    'payment_status' => 'paid',
                ],
                'included' => [
                    [
                        'type' => 'payment',
                        'id' => 'pay_sub_789',
                        'attributes' => [
                            'status' => 'paid',
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $mockSubscriptionService = Mockery::mock(SubscriptionService::class);
        $mockSubscriptionService->shouldReceive('activateSubscription')
            ->once()
            ->with(Mockery::on(fn ($arg) => $arg->id === $transaction->id));
        $this->app->instance(SubscriptionService::class, $mockSubscriptionService);

        $this->artisan('paymongo:verify')
            ->assertSuccessful();
    }

    public function test_handles_paymongo_api_failure_gracefully_without_halting_chunk(): void
    {
        $buyer = User::factory()->create();
        $artisan = User::factory()->artisanApproved()->create();

        $failingOrder = Order::create([
            'order_number' => 'ORD-FAIL-01',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 150,
            'convenience_fee_amount' => 5,
            'platform_commission_amount' => 10,
            'seller_net_amount' => 140,
            'total_amount' => 155,
            'status' => Order::STATUS_PENDING,
            'shipping_address' => '123 Fail Rd, Bacoor, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_fail_429',
            'created_at' => now()->subMinutes(30),
        ]);

        $succeedingOrder = Order::create([
            'order_number' => 'ORD-OK-02',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 9,
            'platform_commission_amount' => 15,
            'seller_net_amount' => 285,
            'total_amount' => 309,
            'status' => Order::STATUS_PENDING,
            'shipping_address' => '456 Success St, Imus, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_success_200',
            'created_at' => now()->subMinutes(25),
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->with('cs_fail_429')
            ->once()
            ->andThrow(new \Exception('PayMongo Error: 429 Too Many Requests'));

        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->with('cs_success_200')
            ->once()
            ->andReturn([
                'attributes' => [
                    'payment_status' => 'paid',
                ],
                'included' => [
                    [
                        'type' => 'payment',
                        'id' => 'pay_ok_123',
                        'attributes' => [
                            'status' => 'paid',
                        ],
                    ],
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $this->artisan('paymongo:verify')
            ->assertSuccessful();

        $failingOrder->refresh();
        $this->assertSame('pending', $failingOrder->payment_status);

        $succeedingOrder->refresh();
        $this->assertSame('paid', $succeedingOrder->payment_status);
        $this->assertSame('pay_ok_123', $succeedingOrder->payment_id);
    }
}
