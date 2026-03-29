<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_order_credits_seller_and_platform_wallets_only_once(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller);

        $service = app(OrderFinanceService::class);
        $service->settleCompletedOrder($order);
        $service->settleCompletedOrder($order);

        $seller->refresh();
        $admin->refresh();
        $order->refresh();

        $this->assertSame(950.0, (float) $seller->wallet->balance);
        $this->assertSame(80.0, (float) $admin->wallet->balance);
        $this->assertNotNull($order->wallet_settled_at);
        $this->assertDatabaseCount('wallet_transactions', 2);
    }

    public function test_refund_reverses_seller_and_platform_wallets_and_credits_buyer_once(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller);
        $service = app(OrderFinanceService::class);

        $service->settleCompletedOrder($order);
        $service->refundOrderToBuyerWallet($order);
        $service->refundOrderToBuyerWallet($order);

        $buyer->refresh();
        $seller->refresh();
        $admin->refresh();
        $order->refresh();

        $this->assertSame(1030.0, (float) $buyer->wallet->balance);
        $this->assertSame(0.0, (float) $seller->wallet->balance);
        $this->assertSame(0.0, (float) $admin->wallet->balance);
        $this->assertNotNull($order->refunded_to_wallet_at);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $buyer->wallet->id,
            'order_id' => $order->id,
            'direction' => 'credit',
            'category' => 'order_refund_credit',
            'amount' => 1030.00,
        ]);

        $this->assertSame(5, \App\Models\WalletTransaction::query()->count());
    }

    private function createCompletedOrder(User $buyer, User $seller): Order
    {
        return Order::create([
            'order_number' => 'ORD-WALLET-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 1000,
            'convenience_fee_amount' => 30,
            'platform_commission_amount' => 50,
            'seller_net_amount' => 950,
            'total_amount' => 1030,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => '123 Completed Lane, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
        ]);
    }
}
