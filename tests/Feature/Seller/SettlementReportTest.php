<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettlementReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_can_view_monthly_settlement_statement_json(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'email' => 'artisan@example.com',
            'email_verified_at' => now(),
            'shop_name' => 'Kalinga Pottery Studio',
            'premium_tier' => 'premium',
            'modules_enabled' => ['accounting' => true],
        ]);

        $buyer = User::factory()->create(['role' => 'buyer']);

        // Create completed order in current month
        Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-SETTLE-001',
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Pasig City, Metro Manila',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 2500,
            'shipping_fee_amount' => 150,
            'platform_commission_amount' => 0,
            'seller_net_amount' => 2500,
            'total_amount' => 2650,
        ]);

        // Create payout in current month
        Payout::create([
            'user_id' => $seller->id,
            'amount' => 1000.00,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Maria Santos',
            'payout_account_number' => '09171234567',
            'reference_number' => 'GCASH-REF-9988',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($seller)
            ->getJson(route('accounting.settlement', [
                'format' => 'json',
                'year' => now()->year,
                'month' => now()->month,
            ]));

        $response->assertOk()
            ->assertJsonStructure([
                'period' => ['year', 'month', 'month_name', 'start_date', 'end_date'],
                'artisan' => ['id', 'name', 'shop_name', 'email'],
                'summary' => [
                    'gross_sales',
                    'orders_count',
                    'cod_sales',
                    'online_sales',
                    'shipping_fees',
                    'platform_fees',
                    'net_earnings',
                    'supply_expenses',
                    'payroll_expenses',
                    'total_payouts',
                    'period_net_balance',
                ],
                'orders',
                'payouts',
            ])
            ->assertJsonPath('summary.gross_sales', 2500)
            ->assertJsonPath('summary.orders_count', 1)
            ->assertJsonPath('summary.total_payouts', 1000);
    }

    public function test_artisan_can_export_monthly_settlement_statement_csv(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'email' => 'artisan2@example.com',
            'email_verified_at' => now(),
            'shop_name' => 'Luzon Woodcrafts',
            'premium_tier' => 'premium',
            'modules_enabled' => ['accounting' => true],
        ]);

        $response = $this->actingAs($seller)
            ->get(route('accounting.settlement.export', [
                'year' => now()->year,
                'month' => now()->month,
            ]));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
    }

    public function test_artisan_can_view_monthly_settlement_statement_printable_html(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'email' => 'artisan3@example.com',
            'email_verified_at' => now(),
            'shop_name' => 'Mountain Loom Works',
            'premium_tier' => 'premium',
            'modules_enabled' => ['accounting' => true],
        ]);

        $response = $this->actingAs($seller)
            ->get(route('accounting.settlement', [
                'year' => now()->year,
                'month' => now()->month,
            ]));

        $response->assertOk()
            ->assertSee('Monthly Artisan Settlement')
            ->assertSee('Mountain Loom Works');
    }

    public function test_guest_cannot_access_settlement_statement(): void
    {
        $response = $this->get(route('accounting.settlement'));
        $response->assertRedirect(route('login'));
    }
}
