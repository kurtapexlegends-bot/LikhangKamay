<?php

namespace Tests\Feature\Admin;

use App\Models\Payout;
use App\Models\User;
use App\Services\AccountingLedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayoutManagementTest extends TestCase
{
    use RefreshDatabase;

    protected AccountingLedgerService $ledgerService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ledgerService = $this->app->make(AccountingLedgerService::class);
    }

    public function test_super_admin_can_access_payouts_manager(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.payouts.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Admin/Payouts/PayoutManager'));
    }

    public function test_non_admin_cannot_access_payouts_manager(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($user)
            ->get(route('admin.payouts.index'));

        $response->assertStatus(403);
    }

    public function test_super_admin_can_record_manual_payout_for_approved_artisan(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.payouts.store'), [
                'user_id' => $artisan->id,
                'amount' => 500.00,
                'payout_method' => 'GCash',
                'payout_account_name' => 'Jane Doe',
                'payout_account_number' => '09123456789',
                'reference_number' => 'REF998877',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success', 'Manual payout registered successfully.');

        $this->assertDatabaseHas('payouts', [
            'user_id' => $artisan->id,
            'amount' => 500.00,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
            'reference_number' => 'REF998877',
            'status' => 'Completed',
        ]);
    }

    public function test_payout_subtracts_from_ledger_balance(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'base_funds' => 1500.00,
        ]);

        // Prior to payout, balance should equal base_funds (1500)
        $snapshot = $this->ledgerService->buildFinancialSnapshot($artisan);
        $this->assertEquals(1500.00, $snapshot['balance']);

        // Log payout
        Payout::create([
            'user_id' => $artisan->id,
            'amount' => 600.00,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Test Name',
            'payout_account_number' => '09999999999',
            'reference_number' => 'TXN112233',
            'status' => 'Completed',
        ]);

        // After payout, balance should be 1500 - 600 = 900
        $snapshot = $this->ledgerService->buildFinancialSnapshot($artisan);
        $this->assertEquals(900.00, $snapshot['balance']);
    }

    public function test_cannot_record_payout_for_unapproved_artisan(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.payouts.store'), [
                'user_id' => $artisan->id,
                'amount' => 500.00,
                'payout_method' => 'GCash',
                'payout_account_name' => 'Jane Doe',
                'payout_account_number' => '09123456789',
            ]);

        $response->assertSessionHas('error', 'Cannot disburse payout to an unapproved artisan.');
        $this->assertDatabaseMissing('payouts', [
            'user_id' => $artisan->id,
        ]);
    }

    public function test_unpaid_balance_excludes_base_funds_and_expenses_in_controller(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'base_funds' => 20000.00,
        ]);

        // Access the payout index route
        $response = $this->actingAs($admin)
            ->get(route('admin.payouts.index'));

        $response->assertStatus(200);
        
        // Assert the unpaid balance is 0.00 (since revenue is 0 and payouts are 0, excluding the 20,000 base_funds)
        $response->assertInertia(fn ($page) => $page
            ->where('artisans.0.balance', 0)
            ->where('artisans.0.ledger_balance', 20000)
        );
    }
}
