<?php

namespace Tests\Feature\Buyer;

use App\Models\User;
use App\Models\WalletTopUp;
use App\Services\PayMongoService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Mockery;
use Tests\TestCase;

class WalletTopUpTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_buyer_can_start_a_wallet_top_up(): void
    {
        $buyer = User::factory()->createOne(['role' => 'buyer']);

        $payMongo = Mockery::mock(PayMongoService::class);
        $payMongo->shouldReceive('createCheckoutSession')
            ->once()
            ->andReturn([
                'id' => 'cs_wallet_top_up',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.test/topup',
                ],
            ]);

        $this->app->instance(PayMongoService::class, $payMongo);

        $response = $this
            ->actingAs($buyer)
            ->withHeader('X-Inertia', 'true')
            ->post(route('my-wallet.top-up'), [
                'amount' => 500,
            ]);

        $response->assertStatus(409);
        $response->assertHeader('X-Inertia-Location', 'https://checkout.paymongo.test/topup');

        $this->assertDatabaseHas('wallet_top_ups', [
            'user_id' => $buyer->id,
            'amount' => '500.00',
            'status' => 'pending',
            'paymongo_session_id' => 'cs_wallet_top_up',
        ]);
    }

    public function test_successful_wallet_top_up_credits_wallet_only_once(): void
    {
        $buyer = User::factory()->createOne(['role' => 'buyer']);
        $wallet = app(WalletService::class)->getOrCreateWallet($buyer);

        $topUp = WalletTopUp::create([
            'user_id' => $buyer->id,
            'wallet_id' => $wallet->id,
            'amount' => 250,
            'currency' => 'PHP',
            'status' => WalletTopUp::STATUS_PENDING,
            'reference_number' => 'WTU-TEST0001',
            'paymongo_session_id' => 'cs_wallet_paid',
        ]);

        $payMongo = Mockery::mock(PayMongoService::class);
        $payMongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->andReturn([
                'attributes' => [
                    'reference_number' => 'WTU-TEST0001',
                    'payment_status' => 'paid',
                    'status' => 'paid',
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

        $this->app->instance(PayMongoService::class, $payMongo);

        $this->actingAs($buyer)
            ->get(URL::signedRoute('wallet.topups.success', ['top_up' => $topUp->reference_number]))
            ->assertRedirect(route('my-wallet.index'));

        $topUp->refresh();
        $wallet->refresh();

        $this->assertSame(WalletTopUp::STATUS_PAID, $topUp->status);
        $this->assertSame('250.00', $wallet->balance);
        $this->assertDatabaseCount('wallet_transactions', 1);

        $this->actingAs($buyer)
            ->get(URL::signedRoute('wallet.topups.success', ['top_up' => $topUp->reference_number]))
            ->assertRedirect(route('my-wallet.index'));

        $wallet->refresh();

        $this->assertSame('250.00', $wallet->balance);
        $this->assertDatabaseCount('wallet_transactions', 1);
    }
}
