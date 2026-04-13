<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\SellerWalletWithdrawalRequest;
use App\Models\StaffAttendanceSession;
use App\Models\StaffAccessAudit;
use App\Models\StockRequest;
use App\Models\SubscriptionTransaction;
use App\Models\Supply;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuditLogCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_owner_can_view_aggregated_audit_log_center(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay Ledger',
        ]);

        $staffUser = User::factory()->staff($seller)->create([
            'name' => 'Lia Staff',
            'email_verified_at' => now(),
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Lia Staff',
            'role' => 'HR',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        StaffAccessAudit::create([
            'seller_owner_id' => $seller->id,
            'actor_user_id' => $seller->id,
            'staff_user_id' => $staffUser->id,
            'employee_id' => $employee->id,
            'event' => 'login_created',
            'summary' => 'Owner created seller portal access for Lia Staff.',
            'details' => [
                'changes' => [
                    'Created seller portal login',
                ],
            ],
            'created_at' => now()->subMinutes(4),
            'updated_at' => now()->subMinutes(4),
        ]);

        $wallet = app(WalletService::class)->getOrCreateWallet($seller);

        SellerWalletWithdrawalRequest::create([
            'user_id' => $seller->id,
            'wallet_id' => $wallet->id,
            'amount' => 1250,
            'currency' => 'PHP',
            'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
            'note' => 'Weekly payout',
            'created_at' => now()->subMinutes(3),
            'updated_at' => now()->subMinutes(3),
        ]);

        Payroll::create([
            'user_id' => $seller->id,
            'requested_by_user_id' => $seller->id,
            'month' => 'April 2026',
            'total_amount' => 15500,
            'employee_count' => 1,
            'status' => 'Pending',
            'created_at' => now()->subMinutes(2),
            'updated_at' => now()->subMinutes(2),
        ]);

        $supply = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Stoneware Clay',
            'category' => 'Clay',
            'quantity' => 20,
            'unit' => 'kg',
            'unit_cost' => 95,
            'supplier' => 'North Supplier',
            'min_stock' => 5,
            'max_stock' => 100,
        ]);

        StockRequest::create([
            'user_id' => $seller->id,
            'requested_by_user_id' => $seller->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 950,
            'status' => StockRequest::STATUS_ACCOUNTING_APPROVED,
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ]);

        SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PAID,
            'reference_number' => 'SUB-TEST-100',
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($seller)
            ->get(route('audit-log.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/AuditLog')
                ->where('auditLog.summary.staff_events', 1)
                ->where('auditLog.summary.finance_events', 3)
                ->where('auditLog.summary.billing_events', 1)
                ->has('auditLog.entries', 5)
            );

        $entries = collect($response->viewData('page')['props']['auditLog']['entries'] ?? []);

        $this->assertSame([
            'billing' => 1,
            'finance' => 3,
            'staff' => 1,
        ], $entries->groupBy('category')->map->count()->sortKeys()->all());
    }

    public function test_staff_cannot_access_owner_only_audit_log_center(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
        ]);
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $seller->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $this->actingAs($staff)
            ->get(route('audit-log.index'))
            ->assertForbidden();
    }
}
