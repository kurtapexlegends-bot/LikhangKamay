<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Notifications\AccountingRejectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountingTransparencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_request_submission_tracks_requester_and_exposes_detailed_accounting_breakdown(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $requester = $this->createStaff($owner, 'procurement', [
            'procurement' => true,
            'stock_requests' => true,
        ]);
        $accountingStaff = $this->createStaff($owner, 'accounting', [
            'accounting' => true,
        ]);
        $supply = $this->createSupply($owner, [
            'quantity' => 12,
            'unit_cost' => 180,
        ]);

        $this->actingAs($requester)
            ->post(route('supplies.request', $supply), [
                'quantity' => 10,
            ])
            ->assertRedirect(route('stock-requests.index'));

        $request = StockRequest::firstOrFail();

        $this->assertSame($requester->id, $request->requested_by_user_id);
        Notification::assertSentTo([$owner, $accountingStaff], AccountingApprovalRequestedNotification::class);

        $this->actingAs($owner)
            ->get(route('accounting.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Accounting/FundRelease')
                ->where('pendingRequests.0.requester.name', $requester->name)
                ->where('pendingRequests.0.quantity', 10)
                ->where('pendingRequests.0.supply.name', $supply->name)
                ->where('pendingRequests.0.supply.category', $supply->category)
                ->where('pendingRequests.0.supply.supplier', $supply->supplier)
                ->where('pendingRequests.0.supply.current_stock', 12)
                ->where('pendingRequests.0.supply.max_stock', 500)
                ->where('pendingRequests.0.supply.available_capacity', 488)
                ->where('pendingRequests.0.supply.unit_cost', 180)
                ->where('pendingRequests.0.amount', 1800)
                ->where('pendingRequests.0.fund_snapshot.available_balance', 25000)
                ->where('pendingRequests.0.fund_snapshot.remaining_balance', 23200)
            );
    }

    public function test_payroll_generation_tracks_requester_and_exposes_detailed_accounting_breakdown(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $requester = $this->createStaff($owner, 'hr', [
            'hr' => true,
        ]);
        $accountingStaff = $this->createStaff($owner, 'accounting', [
            'accounting' => true,
        ]);
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Ana Potter',
            'role' => 'Potter',
            'salary' => 22000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $this->actingAs($requester)
            ->post(route('hr.generate'), [
                'month' => 'March 2026',
                'items' => [[
                    'employee_id' => $employee->id,
                    'absences_days' => 1,
                    'undertime_hours' => 2,
                    'overtime_hours' => 3,
                ]],
            ])
            ->assertSessionHas('success');

        $payroll = Payroll::firstOrFail();

        $this->assertSame($requester->id, $payroll->requested_by_user_id);
        Notification::assertSentTo([$owner, $accountingStaff], AccountingApprovalRequestedNotification::class);

        $this->actingAs($owner)
            ->get(route('accounting.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Accounting/FundRelease')
                ->where('pendingPayrolls.0.requester.name', $requester->name)
                ->where('pendingPayrolls.0.month', 'March 2026')
                ->where('pendingPayrolls.0.employee_count', 1)
                ->where('pendingPayrolls.0.line_items.0.employee_name', 'Ana Potter')
                ->where('pendingPayrolls.0.line_items.0.absences_days', 1)
                ->where('pendingPayrolls.0.line_items.0.absence_deduction', 1000)
                ->where('pendingPayrolls.0.line_items.0.undertime_hours', 2)
                ->where('pendingPayrolls.0.line_items.0.undertime_deduction', 250)
                ->where('pendingPayrolls.0.line_items.0.overtime_hours', 3)
                ->where('pendingPayrolls.0.line_items.0.overtime_pay', 150)
            );
    }

    public function test_stock_request_rejection_requires_reason_notifies_requester_and_surfaces_reason_in_requester_history(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $requester = $this->createStaff($owner, 'procurement', [
            'procurement' => true,
            'stock_requests' => true,
        ]);
        $request = $this->createPendingStockRequest($owner, $requester);

        $this->actingAs($owner)
            ->from(route('accounting.index'))
            ->post(route('accounting.reject', $request), [
                'reason' => '',
            ])
            ->assertSessionHasErrors('reason');

        $request->refresh();
        $this->assertSame(StockRequest::STATUS_PENDING, $request->status);

        $reason = 'Budget ceiling exceeded for this purchasing cycle.';

        $this->actingAs($owner)
            ->post(route('accounting.reject', $request), [
                'reason' => $reason,
            ])
            ->assertSessionHas('success');

        $request->refresh();

        $this->assertSame(StockRequest::STATUS_REJECTED, $request->status);
        $this->assertSame($reason, $request->rejection_reason);

        Notification::assertSentTo(
            $requester,
            AccountingRejectedNotification::class,
            function (AccountingRejectedNotification $notification, array $channels) use ($requester, $request, $reason) {
                $payload = $notification->toArray($requester);

                return in_array('database', $channels, true)
                    && $payload['reason'] === $reason
                    && $payload['request_type'] === 'stock_request'
                    && $payload['request_id'] === $request->id
                    && $payload['url'] === route('stock-requests.index');
            }
        );

        $this->actingAs($requester)
            ->get(route('stock-requests.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('requests.0.rejection_reason', $reason)
                ->where('requests.0.requester.name', $requester->name)
            );
    }

    public function test_payroll_rejection_requires_reason_notifies_requester_and_surfaces_reason_in_hr_history(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $requester = $this->createStaff($owner, 'hr', [
            'hr' => true,
        ]);
        $payroll = $this->createPendingPayroll($owner, $requester);

        $this->actingAs($owner)
            ->from(route('accounting.index'))
            ->post(route('accounting.rejectPayroll', $payroll), [
                'reason' => '',
            ])
            ->assertSessionHasErrors('reason');

        $payroll->refresh();
        $this->assertSame('Pending', $payroll->status);

        $reason = 'Attendance inputs need correction before release.';

        $this->actingAs($owner)
            ->post(route('accounting.rejectPayroll', $payroll), [
                'reason' => $reason,
            ])
            ->assertSessionHas('success');

        $payroll->refresh();

        $this->assertSame('Rejected', $payroll->status);
        $this->assertSame($reason, $payroll->rejection_reason);

        Notification::assertSentTo(
            $requester,
            AccountingRejectedNotification::class,
            function (AccountingRejectedNotification $notification, array $channels) use ($requester, $payroll, $reason) {
                $payload = $notification->toArray($requester);

                return in_array('database', $channels, true)
                    && $payload['reason'] === $reason
                    && $payload['request_type'] === 'payroll'
                    && $payload['request_id'] === $payroll->id
                    && $payload['url'] === route('hr.index');
            }
        );

        $this->actingAs($requester)
            ->get(route('hr.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('payrolls.data.0.rejection_reason', $reason)
                ->where('payrolls.data.0.requester.name', $requester->name)
            );
    }

    public function test_legacy_request_without_tracked_requester_falls_back_to_seller_owner_notification(): void
    {
        Notification::fake();

        $owner = $this->createSellerOwner();
        $request = $this->createPendingStockRequest($owner, null);

        $this->actingAs($owner)
            ->post(route('accounting.reject', $request), [
                'reason' => 'This legacy request needs to be recreated with corrected quantities.',
            ])
            ->assertSessionHas('success');

        Notification::assertSentTo($owner, AccountingRejectedNotification::class);
    }

    public function test_existing_valid_accounting_approval_flows_still_work(): void
    {
        $owner = $this->createSellerOwner();
        $stockRequest = $this->createPendingStockRequest($owner, null);
        $payroll = $this->createPendingPayroll($owner, null);

        $this->actingAs($owner)
            ->post(route('accounting.approve', $stockRequest))
            ->assertSessionHas('success');

        $this->actingAs($owner)
            ->post(route('accounting.approvePayroll', $payroll))
            ->assertSessionHas('success');

        $this->assertSame(StockRequest::STATUS_ACCOUNTING_APPROVED, $stockRequest->fresh()->status);
        $this->assertSame('Paid', $payroll->fresh()->status);
    }

    private function createSellerOwner(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'base_funds' => 25000,
            'payroll_working_days' => 22,
            'overtime_rate' => 50,
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ];
        $owner->save();

        return $owner;
    }

    private function createStaff(User $owner, string $presetKey, array $permissions): User
    {
        return User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => $presetKey,
            'staff_module_permissions' => User::withWorkspaceAccessFlag($permissions, true),
        ]);
    }

    private function createSupply(User $owner, array $overrides = []): Supply
    {
        return Supply::create(array_merge([
            'user_id' => $owner->id,
            'name' => 'White Clay',
            'category' => 'Other',
            'quantity' => 20,
            'unit' => 'kg',
            'min_stock' => 5,
            'unit_cost' => 120,
            'supplier' => 'Laguna Ceramics',
        ], $overrides));
    }

    private function createPendingStockRequest(User $owner, ?User $requester): StockRequest
    {
        $supply = $this->createSupply($owner);

        return StockRequest::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $requester?->id,
            'supply_id' => $supply->id,
            'quantity' => 8,
            'total_cost' => 960,
            'status' => StockRequest::STATUS_PENDING,
        ]);
    }

    private function createPendingPayroll(User $owner, ?User $requester): Payroll
    {
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Ben Weaver',
            'role' => 'Assistant',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $requester?->id,
            'month' => 'April 2026',
            'total_amount' => 17000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 18000,
            'days_worked' => 21,
            'absences_days' => 1,
            'undertime_hours' => 1.5,
            'overtime_hours' => 2,
            'overtime_pay' => 100,
            'net_pay' => 17000,
        ]);

        return $payroll;
    }
}
