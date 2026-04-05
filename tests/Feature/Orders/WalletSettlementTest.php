<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\OrderFinanceService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_online_delivery_order_credits_seller_and_platform_wallets_only_once(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller, [
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
        ]);

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

    public function test_cod_delivery_order_does_not_credit_seller_or_platform_wallets(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller, [
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
        ]);

        app(OrderFinanceService::class)->settleCompletedOrder($order);

        $walletService = app(WalletService::class);
        $sellerWallet = $walletService->getOrCreateWallet($seller)->fresh();
        $platformWallet = $walletService->getOrCreateWallet($admin)->fresh();
        $order->refresh();

        $this->assertSame(0.0, (float) $sellerWallet->balance);
        $this->assertSame(0.0, (float) $platformWallet->balance);
        $this->assertNull($order->wallet_settled_at);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_pick_up_order_does_not_credit_seller_or_platform_wallets_even_if_paid_online(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller, [
            'payment_method' => 'GCash',
            'shipping_method' => 'Pick Up',
            'convenience_fee_amount' => 0,
            'total_amount' => 1000,
        ]);

        app(OrderFinanceService::class)->settleCompletedOrder($order);

        $walletService = app(WalletService::class);
        $sellerWallet = $walletService->getOrCreateWallet($seller)->fresh();
        $platformWallet = $walletService->getOrCreateWallet($admin)->fresh();
        $order->refresh();

        $this->assertSame(0.0, (float) $sellerWallet->balance);
        $this->assertSame(0.0, (float) $platformWallet->balance);
        $this->assertNull($order->wallet_settled_at);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_refund_reverses_wallets_for_settled_online_delivery_and_credits_buyer_once(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller, [
            'payment_method' => 'Wallet',
            'shipping_method' => 'Delivery',
        ]);

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

        $this->assertSame(5, WalletTransaction::query()->count());
    }

    public function test_refund_still_credits_buyer_when_seller_wallet_is_already_drained(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = $this->createCompletedOrder($buyer, $seller, [
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
        ]);

        $service = app(OrderFinanceService::class);
        $walletService = app(WalletService::class);

        $service->settleCompletedOrder($order);
        $walletService->debit($seller, 950, 'manual_withdrawal', 'Manual seller withdrawal');

        $service->refundOrderToBuyerWallet($order);

        $buyer->refresh();
        $seller->refresh();
        $admin->refresh();

        $this->assertSame(1030.0, (float) $buyer->wallet->balance);
        $this->assertSame(0.0, (float) $seller->wallet->balance);
        $this->assertSame(-950.0, (float) $admin->wallet->balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $admin->wallet->id,
            'direction' => 'debit',
            'category' => 'order_refund_platform_reversal',
            'amount' => 1030.00,
        ]);
    }

    private function createCompletedOrder(User $buyer, User $seller, array $overrides = []): Order
    {
        return Order::create(array_merge([
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
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_address' => '123 Completed Lane, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
        ], $overrides));
    }
}
