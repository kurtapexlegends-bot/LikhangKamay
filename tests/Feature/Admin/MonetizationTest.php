<?php

namespace Tests\Feature\Admin;

use App\Models\SellerWalletWithdrawalRequest;
use App\Models\User;
use App\Models\UserTierLog;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MonetizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_monetization_marks_plan_mrr_as_projected(): void
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->artisanApproved()->create(['premium_tier' => 'premium']);
        User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);

        app(WalletService::class)->credit($admin, 70, 'seed_platform_wallet', 'Seed platform wallet');

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization')
                ->where('metrics.mrr.value', 598)
                ->where('metrics.mrr.is_projected', true)
                ->where('metrics.mrr.basis', 'Based on current active artisan plan tiers.')
                ->where('platformWallet.balance', 70)
                ->where('platformWallet.currency', 'PHP')
            );
    }

    public function test_monetization_uses_tier_logs_for_recent_plan_changes(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Cavite Potter',
            'shop_name' => 'Cavite Clay House',
            'premium_tier' => 'premium',
        ]);

        $log = UserTierLog::create([
            'user_id' => $artisan->id,
            'previous_tier' => 'free',
            'new_tier' => 'premium',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization')
                ->where('recentSubscribers.0.id', $log->id)
                ->where('recentSubscribers.0.user_id', $artisan->id)
                ->where('recentSubscribers.0.name', 'Cavite Potter')
                ->where('recentSubscribers.0.shop_name', 'Cavite Clay House')
                ->where('recentSubscribers.0.previous_tier', 'free')
                ->where('recentSubscribers.0.tier', 'Premium')
            );
    }

    public function test_super_admin_can_withdraw_from_platform_wallet(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $walletService = app(WalletService::class);

        $walletService->credit($admin, 500, 'seed_platform_wallet', 'Seed platform wallet');

        $this->actingAs($admin)
            ->post(route('admin.monetization.withdraw'), [
                'amount' => 125.50,
                'note' => 'Transfer to bank',
            ])
            ->assertRedirect();

        $platformWallet = $walletService->getPlatformWallet()->fresh();

        $this->assertSame(374.50, (float) $platformWallet->balance);

        $transaction = WalletTransaction::query()
            ->where('category', 'platform_withdrawal')
            ->latest()
            ->first();

        $this->assertNotNull($transaction);
        $this->assertSame('debit', $transaction->direction);
        $this->assertSame('platform_withdrawal', $transaction->category);
        $this->assertSame(125.50, (float) $transaction->amount);
        $this->assertSame('Platform wallet withdrawal: Transfer to bank', $transaction->description);
    }

    public function test_super_admin_can_review_seller_wallet_withdrawal_requests(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Kurt Pottery',
        ]);
        $walletService = app(WalletService::class);
        $sellerWallet = $walletService->getOrCreateWallet($seller);
        $walletService->credit($sellerWallet, 150, 'seed_seller_wallet', 'Seed seller wallet');

        $holdTransaction = $walletService->debit(
            $sellerWallet,
            150,
            'seller_wallet_withdrawal_hold',
            'Seller withdrawal request hold',
            metadata: ['seeded' => true],
        );

        $request = SellerWalletWithdrawalRequest::create([
            'user_id' => $seller->id,
            'wallet_id' => $sellerWallet->id,
            'hold_transaction_id' => $holdTransaction->id,
            'amount' => 150,
            'currency' => 'PHP',
            'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
            'note' => 'Cash out',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization')
                ->where('pendingWalletWithdrawals.0.id', $request->id)
                ->where('pendingWalletWithdrawals.0.user.shop_name', 'Kurt Pottery')
            );

        $this->actingAs($admin)
            ->post(route('admin.wallet-withdrawals.approve', $request))
            ->assertRedirect();

        $this->assertDatabaseHas('seller_wallet_withdrawal_requests', [
            'id' => $request->id,
            'status' => SellerWalletWithdrawalRequest::STATUS_APPROVED,
            'reviewed_by_user_id' => $admin->id,
        ]);
    }

    public function test_rejecting_seller_wallet_withdrawal_returns_funds_to_seller_wallet(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $walletService = app(WalletService::class);

        $walletService->credit($seller, 500, 'seed_seller_wallet', 'Seed seller wallet');
        $wallet = $walletService->getOrCreateWallet($seller);
        $holdTransaction = $walletService->debit($wallet, 200, 'seller_wallet_withdrawal_hold', 'Seller withdrawal request hold');

        $request = SellerWalletWithdrawalRequest::create([
            'user_id' => $seller->id,
            'wallet_id' => $wallet->id,
            'hold_transaction_id' => $holdTransaction->id,
            'amount' => 200,
            'currency' => 'PHP',
            'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.wallet-withdrawals.reject', $request), [
                'rejection_reason' => 'Bank details were incomplete.',
            ])
            ->assertRedirect();

        $wallet->refresh();

        $this->assertSame(500.0, (float) $wallet->balance);
        $this->assertDatabaseHas('seller_wallet_withdrawal_requests', [
            'id' => $request->id,
            'status' => SellerWalletWithdrawalRequest::STATUS_REJECTED,
            'rejection_reason' => 'Bank details were incomplete.',
        ]);
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'direction' => 'credit',
            'category' => 'seller_wallet_withdrawal_reversal',
            'amount' => 200.00,
        ]);
    }
}
