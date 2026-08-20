<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerPayoutSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_can_update_gcash_settlement_details_with_unformatted_number(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'payout_method' => null,
            'payout_account_name' => null,
            'payout_account_number' => null,
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'gcash',
            'account_name' => 'Kurt Acosta',
            'account_number' => '+63 917-555-1234', // Unformatted input
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $artisan->refresh();
        $this->assertEquals('GCash', $artisan->payout_method);
        $this->assertEquals('Kurt Acosta', $artisan->payout_account_name);
        $this->assertEquals('09175551234', $artisan->payout_account_number);
    }

    public function test_artisan_can_update_bank_settlement_details(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'bank',
            'bank_name' => 'BDO Unibank',
            'account_name' => 'Kurt Enterprise',
            'account_number' => '1092 3847 5612',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $artisan->refresh();
        $this->assertEquals('BDO Unibank', $artisan->payout_method);
        $this->assertEquals('Kurt Enterprise', $artisan->payout_account_name);
        $this->assertEquals('109238475612', $artisan->payout_account_number);
    }

    public function test_invalid_mobile_number_fails_validation(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'gcash',
            'account_name' => 'Kurt Acosta',
            'account_number' => '12345', // Invalid length
        ]);

        $response->assertSessionHasErrors('account_number');
    }
}
