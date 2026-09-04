<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\Payout;
use App\Models\Payroll;
use App\Models\StockRequest;
use App\Models\Supply;
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
        /** @var User $admin */
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.payouts.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Admin/Payouts/PayoutManager'));
    }

    public function test_non_admin_cannot_access_payouts_manager(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($user)
            ->get(route('admin.payouts.index'));

        $response->assertStatus(403);
    }

    public function test_super_admin_can_record_manual_payout_for_approved_artisan(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
            'base_funds' => 0.00,
        ]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        Order::create([
            'order_number' => 'ORD-PAYOUT-VALID-01',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 1000.00,
            'seller_net_amount' => 1000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
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

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $artisan,
            \App\Notifications\PayoutDisbursedNotification::class,
            function ($notification) {
                return (float) $notification->payout->amount === 500.00 &&
                       $notification->payout->reference_number === 'REF998877';
            }
        );
    }

    public function test_cannot_record_payout_exceeding_artisan_balance(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
            'base_funds' => 0.00,
        ]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        Order::create([
            'order_number' => 'ORD-PAYOUT-EXCEED-01',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 200.00,
            'seller_net_amount' => 200.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
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

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('payouts', [
            'user_id' => $artisan->id,
            'amount' => 500.00,
        ]);
    }

    public function test_cannot_record_payout_when_balance_is_only_from_cod_collections(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
            'base_funds' => 0.00,
        ]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Artisan only has COD completed order: direct cash collection, not in platform escrow
        Order::create([
            'order_number' => 'ORD-PAYOUT-COD-01',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'total_amount' => 20000.00,
            'seller_net_amount' => 20000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.payouts.store'), [
                'user_id' => $artisan->id,
                'amount' => 5000.00,
                'payout_method' => 'GCash',
                'payout_account_name' => 'Jane Doe',
                'payout_account_number' => '09123456789',
                'reference_number' => 'REFCOD999',
            ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('payouts', [
            'user_id' => $artisan->id,
            'amount' => 5000.00,
        ]);
    }

    public function test_cannot_record_payout_when_expenses_absorb_online_sales(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Jane Doe',
            'payout_account_number' => '09123456789',
            'base_funds' => 0.00,
        ]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Online sales: 10,000
        Order::create([
            'order_number' => 'ORD-PAYOUT-ONL-01',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 10000.00,
            'seller_net_amount' => 10000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        // Stock request expense: 15,000 (exceeds online revenue)
        $supply = Supply::create([
            'user_id' => $artisan->id,
            'name' => 'Glaze',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'liters',
            'unit_price' => 1500,
        ]);
        StockRequest::create([
            'user_id' => $artisan->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 15000.00,
            'status' => StockRequest::STATUS_ACCOUNTING_APPROVED,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.payouts.store'), [
                'user_id' => $artisan->id,
                'amount' => 2000.00,
                'payout_method' => 'GCash',
                'payout_account_name' => 'Jane Doe',
                'payout_account_number' => '09123456789',
                'reference_number' => 'REFEXP999',
            ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('payouts', [
            'user_id' => $artisan->id,
            'amount' => 2000.00,
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
            ->where('artisans.0.ready_for_payout', 0)
            ->where('artisans.0.gross_sales', 0)
        );
    }

    public function test_super_admin_can_export_payouts_csv(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Kultura Craft Shop',
        ]);

        Payout::create([
            'user_id' => $artisan->id,
            'amount' => 1500.00,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Maria Santos',
            'payout_account_number' => '09171234567',
            'reference_number' => 'GCASH987654',
            'status' => 'Completed',
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.payouts.export'));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
        
        $content = $response->streamedContent();
        $this->assertStringContainsString('Disbursement ID', $content);
        $this->assertStringContainsString('Kultura Craft Shop', $content);
        $this->assertStringContainsString('GCASH987654', $content);
        $this->assertStringContainsString('1500.00', $content);
    }

    public function test_ready_for_payout_deducts_expenses_and_excludes_cod_collections(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'base_funds' => 0.00,
        ]);

        $buyer = User::factory()->create(['role' => 'buyer']);

        // Online completed order: 50,000 net revenue
        Order::create([
            'order_number' => 'ORD-NET-001',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 50000.00,
            'seller_net_amount' => 50000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        // COD completed order: 20,000 net revenue (direct collection, not platform escrow)
        Order::create([
            'order_number' => 'ORD-NET-002',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'total_amount' => 20000.00,
            'seller_net_amount' => 20000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        // Stock expense: 15,000
        $supply = Supply::create([
            'user_id' => $artisan->id,
            'name' => 'Clay Raw Material',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'kg',
            'unit_price' => 100,
        ]);

        StockRequest::create([
            'user_id' => $artisan->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 15000.00,
            'status' => StockRequest::STATUS_ACCOUNTING_APPROVED,
        ]);

        // Payroll expense: 10,000
        Payroll::create([
            'user_id' => $artisan->id,
            'month' => 'April 2026',
            'employee_count' => 1,
            'total_amount' => 10000.00,
            'status' => 'Paid',
        ]);

        $snapshot = $this->ledgerService->buildFinancialSnapshot($artisan);

        // Total revenue = 50,000 + 20,000 = 70,000
        $this->assertEquals(70000.00, $snapshot['revenue']);
        // Total expenses = 15,000 + 10,000 = 25,000
        $this->assertEquals(25000.00, $snapshot['expenses']);
        // Balance = 70,000 - 25,000 = 45,000
        $this->assertEquals(45000.00, $snapshot['balance']);
        // Ready for payout = 50,000 (online only) - 25,000 (expenses) = 25,000
        $this->assertEquals(25000.00, $snapshot['ready_for_payout']);
    }
}
