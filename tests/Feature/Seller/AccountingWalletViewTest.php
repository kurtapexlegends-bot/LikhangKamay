<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingWalletViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounting_page_no_longer_exposes_seller_wallet_snapshot(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $response = $this->actingAs($seller)
            ->get(route('accounting.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Accounting/FundRelease')
                ->has('finances')
            );

        $page = $response->viewData('page');

        $this->assertArrayNotHasKey('wallet', $page['props']);
    }
}
