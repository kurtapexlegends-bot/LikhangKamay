<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingWalletViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounting_page_exposes_seller_wallet_snapshot(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);
        app(WalletService::class)->credit($seller, 950, 'seed_wallet_balance', 'Seed seller wallet');

        $this->actingAs($seller)
            ->get(route('accounting.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Accounting/FundRelease')
                ->where('wallet.balance', 950)
                ->where('wallet.currency', 'PHP')
            );
    }
}
