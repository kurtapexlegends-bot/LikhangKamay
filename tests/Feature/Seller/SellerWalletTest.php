<?php

namespace Tests\Feature\Seller;

use App\Models\SellerWalletWithdrawalRequest;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerWalletTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_view_wallet_page(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay House',
        ]);

        app(WalletService::class)->credit($seller, 750, 'seed_seller_wallet', 'Seed seller wallet');

        $this->actingAs($seller)
            ->get(route('seller.wallet.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Wallet')
                ->where('wallet.balance', 750)
                ->where('walletOwner.shop_name', 'Clay House')
            );
    }

    public function test_seller_withdrawal_request_holds_funds_and_creates_pending_request(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $walletService = app(WalletService::class);

        $walletService->credit($seller, 1200, 'seed_seller_wallet', 'Seed seller wallet');

        $this->actingAs($seller)
            ->post(route('seller.wallet.withdrawals.store'), [
                'amount' => 450,
                'note' => 'Weekly payout',
            ])
            ->assertRedirect();

        $seller->refresh();
        $wallet = $walletService->getOrCreateWallet($seller)->fresh();

        $this->assertSame(750.0, (float) $wallet->balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'direction' => 'debit',
            'category' => 'seller_wallet_withdrawal_hold',
            'amount' => 450.00,
        ]);

        $this->assertDatabaseHas('seller_wallet_withdrawal_requests', [
            'user_id' => $seller->id,
            'wallet_id' => $wallet->id,
            'amount' => 450.00,
            'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
            'note' => 'Weekly payout',
        ]);
    }

    public function test_staff_cannot_submit_seller_wallet_withdrawal_requests(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'staff_role_preset_key' => 'accounting',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['accounting' => true, 'wallet' => true], true),
        ]);
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $seller->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        app(WalletService::class)->credit($seller, 500, 'seed_seller_wallet', 'Seed seller wallet');

        $this->actingAs($staff)
            ->post(route('seller.wallet.withdrawals.store'), [
                'amount' => 100,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('seller_wallet_withdrawal_requests', 0);
    }

    public function test_seller_wallet_snapshot_totals_are_not_limited_to_recent_withdrawal_rows(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $walletService = app(WalletService::class);
        $wallet = $walletService->getOrCreateWallet($seller);

        foreach (range(1, 6) as $index) {
            SellerWalletWithdrawalRequest::create([
                'user_id' => $seller->id,
                'wallet_id' => $wallet->id,
                'amount' => 100,
                'currency' => 'PHP',
                'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
                'created_at' => now()->subMinutes(10 - $index),
                'updated_at' => now()->subMinutes(10 - $index),
            ]);
        }

        foreach (range(1, 2) as $index) {
            SellerWalletWithdrawalRequest::create([
                'user_id' => $seller->id,
                'wallet_id' => $wallet->id,
                'amount' => 75,
                'currency' => 'PHP',
                'status' => SellerWalletWithdrawalRequest::STATUS_APPROVED,
                'created_at' => now()->subMinutes($index),
                'updated_at' => now()->subMinutes($index),
            ]);
        }

        $snapshot = $walletService->buildSellerSnapshot($seller, 12);

        $this->assertSame(600.0, (float) $snapshot['pending_withdrawals']);
        $this->assertSame(150.0, (float) $snapshot['approved_withdrawals_total']);
        $this->assertCount(5, $snapshot['recent_withdrawal_requests']);
    }
}
