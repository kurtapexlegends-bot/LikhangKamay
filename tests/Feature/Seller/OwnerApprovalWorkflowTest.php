<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\StaffAttendanceSession;
use App\Models\StockRequest;
use App\Models\Order;
use App\Models\Supply;
use App\Models\User;
use App\Actions\Seller\HR\ProvisionStaffAccount;
use App\Notifications\OwnerApprovalDecisionNotification;
use App\Services\OwnerApprovalService;
use App\Support\NotificationPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OwnerApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $staff;
    protected Employee $employee;
    protected OwnerApprovalService $approvalService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->approvalService = app(OwnerApprovalService::class);

        $this->owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium', // Elite
        ]);

        $this->staff = User::factory()->staff($this->owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $this->staff->id,
            'seller_owner_id' => $this->owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $this->employee = Employee::create([
            'user_id' => $this->owner->id,
            'name' => 'Juan Dela Cruz',
            'role' => 'Master Potter',
            'salary' => 500.00,
            'status' => 'active',
            'join_date' => now()->toDateString(),
        ]);
    }

    public function test_owner_can_view_approvals_hub(): void
    {
        $this->actingAs($this->owner)
            ->get(route('seller.approvals.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Approvals/ApprovalManager')
                ->has('approvals')
                ->has('pendingCount')
            );
    }

    public function test_staff_submission_creates_pending_approval(): void
    {
        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱500 to ₱550',
            approvable: $this->employee,
            payload: [
                'employee_id' => $this->employee->id,
                'employee_name' => 'Juan Dela Cruz',
                'old_rate' => 500,
                'new_rate' => 550,
                'notes' => '6-month review appraisal passed.',
            ]
        );

        $this->assertDatabaseHas('owner_approvals', [
            'id' => $approval->id,
            'seller_id' => $this->owner->id,
            'requester_id' => $this->staff->id,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);

        $this->assertEquals(1, $this->approvalService->getPendingCount($this->owner));
    }

    public function test_owner_can_approve_staff_salary_rate_change(): void
    {
        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱500 to ₱550',
            approvable: $this->employee,
            payload: [
                'employee_id' => $this->employee->id,
                'employee_name' => 'Juan Dela Cruz',
                'old_rate' => 500,
                'new_rate' => 550,
            ]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('success');

        $approval->refresh();
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->status);
        $this->assertEquals($this->owner->id, $approval->reviewer_id);

        // Verify side effect applied to employee record
        $this->employee->refresh();
        $this->assertEquals(550.00, (float) $this->employee->salary);
    }

    public function test_owner_can_reject_staff_request_with_reason(): void
    {
        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱500 to ₱550',
            approvable: $this->employee,
            payload: [
                'employee_id' => $this->employee->id,
                'new_rate' => 550,
            ]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.reject', $approval->id), [
                'reason' => 'Rate increase pending Q4 review.',
            ]);

        $response->assertSessionHas('success');

        $approval->refresh();
        $this->assertEquals(OwnerApproval::STATUS_REJECTED, $approval->status);
        $this->assertEquals('Rate increase pending Q4 review.', $approval->rejection_reason);

        // Verify employee rate remained unchanged
        $this->employee->refresh();
        $this->assertEquals(500.00, (float) $this->employee->salary);
    }

    public function test_staff_cannot_approve_their_own_request(): void
    {
        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱500 to ₱550',
            approvable: $this->employee,
            payload: [
                'employee_id' => $this->employee->id,
                'new_rate' => 550,
            ]
        );

        $response = $this->actingAs($this->staff)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertRedirect(route('staff.home'));

        $approval->refresh();
        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval->status);
    }

    public function test_elite_owner_can_batch_approve(): void
    {
        $approval1 = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Purchase Clay Batch 1',
            summary: '10kg Red Clay',
            approvable: null,
            payload: ['estimated_cost' => 2500]
        );

        $approval2 = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Purchase Clay Batch 2',
            summary: '10kg White Clay',
            approvable: null,
            payload: ['estimated_cost' => 3000]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.batch-approve'), [
                'approval_ids' => [$approval1->id, $approval2->id],
            ]);

        $response->assertSessionHas('success');

        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval1->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval2->fresh()->status);
    }

    public function test_standard_seller_cannot_batch_approve(): void
    {
        $standardOwner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $this->actingAs($standardOwner)
            ->post(route('seller.approvals.batch-approve'), [
                'approval_ids' => [1, 2],
            ])
            ->assertForbidden();
    }

    public function test_owner_can_filter_approval_history(): void
    {
        $pending = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Pending Purchase',
            summary: 'Pending summary',
            approvable: null
        );

        $approved = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Approved Rate',
            summary: 'Approved summary',
            approvable: null
        );
        $this->approvalService->approve($approved, $this->owner);

        $this->actingAs($this->owner)
            ->get(route('seller.approvals.index', ['status' => 'reviewed']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Approvals/ApprovalManager')
                ->where('approvals.data.0.id', $approved->id)
                ->where('approvals.total', 1)
            );
    }

    public function test_staff_salary_rate_adjustment_intercepted_and_submits_owner_approval(): void
    {
        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => 'can_edit'], true),
        ]);

        $response = $this->actingAs($this->staff)->patch(route('hr.update', $this->employee->id), [
            'name' => 'Juan Dela Cruz Updated',
            'role' => 'Master Potter',
            'salary' => 750.00,
            'justification' => 'Annual performance merit increase.',
        ]);

        $response->assertSessionHas('success');

        // Employee salary should NOT have updated directly
        $this->employee->refresh();
        $this->assertEquals(500.00, (float) $this->employee->salary);
        $this->assertEquals('Juan Dela Cruz Updated', $this->employee->name);

        // An approval should have been submitted
        $approval = OwnerApproval::where('domain', OwnerApproval::DOMAIN_STAFF_RATE)
            ->where('seller_id', $this->owner->id)
            ->where('requester_id', $this->staff->id)
            ->first();

        $this->assertNotNull($approval);
        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval->status);
        $this->assertEquals(750.00, (float) $approval->changes_payload['new_rate']);
        $this->assertEquals(500.00, (float) $approval->changes_payload['old_rate']);

        // Now owner approves the request
        $approveResponse = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $approveResponse->assertSessionHas('success');

        // Now employee salary should be updated
        $this->employee->refresh();
        $this->assertEquals(750.00, (float) $this->employee->salary);
    }

    public function test_owner_can_approve_payroll_and_release_funds(): void
    {
        $this->owner->update(['base_funds' => 20000]);

        $payroll = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-09',
            'total_amount' => 5000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_HR_PAYROLL,
            title: 'Payroll Run: 2026-09',
            summary: 'Payroll run for September 2026',
            approvable: $payroll,
            payload: [
                'total_payout' => 5000,
                'period' => '2026-09',
            ]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('success');

        $this->assertEquals('Paid', $payroll->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->fresh()->status);
    }

    public function test_owner_cannot_approve_payroll_when_funds_are_insufficient(): void
    {
        $this->owner->update(['base_funds' => 0]);

        $payroll = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-09',
            'total_amount' => 10000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_HR_PAYROLL,
            title: 'Payroll Run: 2026-09',
            summary: 'Payroll run for September 2026',
            approvable: $payroll,
            payload: ['total_payout' => 10000]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('error');

        $this->assertEquals('Pending', $payroll->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval->fresh()->status);
    }

    public function test_owner_can_approve_stock_request_and_update_to_accounting_approved(): void
    {
        $this->owner->update(['base_funds' => 15000]);

        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'name' => 'Stoneware Clay',
            'sku' => 'SUP-CLAY-001',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'min_stock' => 5,
            'max_stock' => 100,
            'unit_cost' => 100,
        ]);

        $stockRequest = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 20,
            'total_cost' => 2000,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Procurement Restock: Stoneware Clay',
            summary: 'Restock 20kg Stoneware Clay',
            approvable: $stockRequest,
            payload: $this->approvalService->buildProcurementPayload($supply, 20)
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('success');

        $this->assertEquals(StockRequest::STATUS_ACCOUNTING_APPROVED, $stockRequest->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->fresh()->status);
    }

    public function test_staff_stock_restock_request_submits_owner_approval(): void
    {
        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'name' => 'Terracotta Glaze',
            'sku' => 'SUP-GLZ-001',
            'category' => 'Raw Materials',
            'unit' => 'liter',
            'quantity' => 5,
            'min_stock' => 2,
            'max_stock' => 50,
            'unit_cost' => 250,
        ]);

        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'stock_requests' => 'can_edit',
                'procurement' => 'can_edit',
                'accounting' => true,
            ], true),
        ]);

        $response = $this->actingAs($this->staff)
            ->post(route('supplies.request', $supply->id), [
                'quantity' => 10,
            ]);

        $response->assertRedirect(route('stock-requests.index'));

        $this->assertDatabaseHas('owner_approvals', [
            'seller_id' => $this->owner->id,
            'requester_id' => $this->staff->id,
            'domain' => OwnerApproval::DOMAIN_PROCUREMENT,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);
    }

    public function test_requester_receives_notification_upon_approval_and_rejection(): void
    {
        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱500 to ₱550',
            approvable: $this->employee,
            payload: ['employee_id' => $this->employee->id, 'new_rate' => 550]
        );

        // Owner approves
        $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        // Staff should have received database notification
        $notification = $this->staff->notifications()
            ->where('data->approval_id', (string) $approval->id)
            ->first()
            ?? $this->staff->notifications()->get()->first(
                fn ($n) => (string) ($n->data['approval_id'] ?? null) === (string) $approval->id
            );
        $this->assertNotNull($notification);
        $this->assertEquals('owner_approval_decision', $notification->data['type']);
        $this->assertEquals('approved', $notification->data['status']);

        // Now submit another approval to test rejection notification
        $approval2 = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase 2: Juan Dela Cruz',
            summary: 'Increase daily rate from ₱550 to ₱600',
            approvable: $this->employee,
            payload: ['employee_id' => $this->employee->id, 'new_rate' => 600]
        );

        $this->actingAs($this->owner)
            ->post(route('seller.approvals.reject', $approval2->id), [
                'reason' => 'Budget review pending.',
            ]);

        $notification2 = $this->staff->notifications()
            ->where('data->approval_id', (string) $approval2->id)
            ->first()
            ?? $this->staff->notifications()->get()->first(
                fn ($n) => (string) ($n->data['approval_id'] ?? null) === (string) $approval2->id
            );
        $this->assertNotNull($notification2);
        $this->assertEquals('owner_approval_decision', $notification2->data['type']);
        $this->assertEquals('rejected', $notification2->data['status']);
        $this->assertEquals('Budget review pending.', $notification2->data['reason']);
    }

    public function test_accounting_approval_synchronizes_pending_owner_approval(): void
    {
        $this->owner->update(['base_funds' => 20000]);

        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'name' => 'Sync Test Material',
            'sku' => 'SUP-SYNC-001',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'min_stock' => 5,
            'max_stock' => 100,
            'unit_cost' => 100,
        ]);

        $stockRequest = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 1000,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Procurement Restock: Sync Test Material',
            summary: 'Restock 10kg Sync Test Material',
            approvable: $stockRequest,
            payload: $this->approvalService->buildProcurementPayload($supply, 10)
        );

        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval->status);

        // Accounting approves fund release
        $response = $this->actingAs($this->owner)
            ->post(route('accounting.approve', $stockRequest->id));

        $response->assertSessionHas('success');

        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->fresh()->status);
        $this->assertEquals(StockRequest::STATUS_ACCOUNTING_APPROVED, $stockRequest->fresh()->status);
    }

    public function test_pending_approvals_count_shared_in_inertia(): void
    {
        $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Pending Rate Item',
            summary: 'Pending summary',
            approvable: $this->employee
        );

        $this->actingAs($this->owner)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pendingApprovalsCount', 1)
            );
    }

    public function test_owner_can_approve_payroll_with_exact_cent_solvency_threshold(): void
    {
        // Balance is exact cent match for payroll amount
        $this->owner->update(['base_funds' => 5000.00]);

        $payroll = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-09',
            'total_amount' => 5000.00,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_HR_PAYROLL,
            title: 'Exact Cent Payroll',
            summary: 'Exact cent match',
            approvable: $payroll,
            payload: ['total_payout' => 5000.00]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('success');
        $this->assertEquals('Paid', $payroll->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->fresh()->status);
    }

    public function test_cannot_approve_stock_request_when_underlying_item_is_not_pending(): void
    {
        $this->owner->update(['base_funds' => 10000]);

        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'name' => 'Glaze Chemical',
            'sku' => 'SUP-GLZ-999',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'min_stock' => 5,
            'max_stock' => 100,
            'unit_cost' => 50,
        ]);

        // Underlying request is already rejected
        $stockRequest = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 500,
            'status' => StockRequest::STATUS_REJECTED,
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Stale Procurement',
            summary: 'Stale request',
            approvable: $stockRequest,
            payload: ['estimated_cost' => 500]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('error');
        $this->assertEquals(StockRequest::STATUS_REJECTED, $stockRequest->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval->fresh()->status);
    }

    public function test_consecutive_staff_salary_rate_updates_supersede_pending_approval(): void
    {
        $this->staff->update([
            'staff_module_permissions' => User::withStaffAccessPermissionLevelFlag(
                ['hr' => true],
                User::STAFF_ACCESS_PERMISSION_UPDATE
            ),
        ]);

        $response1 = $this->actingAs($this->staff)->patch(route('hr.update', $this->employee->id), [
            'name' => $this->employee->name,
            'role' => $this->employee->role,
            'salary' => 600.00,
            'justification' => 'First raise proposal',
        ]);
        $response1->assertRedirect();

        $this->assertEquals(500.00, (float) $this->employee->fresh()->salary);

        $pendingApprovals = OwnerApproval::where('seller_id', $this->owner->id)
            ->where('domain', OwnerApproval::DOMAIN_STAFF_RATE)
            ->where('approvable_id', $this->employee->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->get();

        $this->assertCount(1, $pendingApprovals);
        $this->assertEquals(600.00, (float) $pendingApprovals->first()->changes_payload['new_rate']);

        // Now submit another adjustment before owner reviews first
        $response2 = $this->actingAs($this->staff)->patch(route('hr.update', $this->employee->id), [
            'name' => $this->employee->name,
            'role' => $this->employee->role,
            'salary' => 650.00,
            'justification' => 'Updated appraisal raise proposal',
        ]);
        $response2->assertRedirect();

        // Must STILL be only 1 pending approval, updated with new rate
        $pendingApprovalsAfter = OwnerApproval::where('seller_id', $this->owner->id)
            ->where('domain', OwnerApproval::DOMAIN_STAFF_RATE)
            ->where('approvable_id', $this->employee->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->get();

        $this->assertCount(1, $pendingApprovalsAfter);
        $this->assertEquals(650.00, (float) $pendingApprovalsAfter->first()->changes_payload['new_rate']);
        $this->assertEquals('Updated appraisal raise proposal', $pendingApprovalsAfter->first()->changes_payload['justification']);

        // Owner approves
        $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $pendingApprovalsAfter->first()->id));

        $this->assertEquals(650.00, (float) $this->employee->fresh()->salary);
    }

    public function test_batch_approve_handles_solvency_failure_without_aborting_other_requests(): void
    {
        // Owner has 3000 funds
        $this->owner->update(['base_funds' => 3000]);

        $payrollOk = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-08',
            'total_amount' => 2000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        $payrollTooExpensive = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-09',
            'total_amount' => 50000,
            'employee_count' => 5,
            'status' => 'Pending',
        ]);

        $approval1 = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_HR_PAYROLL,
            title: 'Payroll 1 (Feasible)',
            approvable: $payrollOk,
            payload: ['total_payout' => 2000]
        );

        $approval2 = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_HR_PAYROLL,
            title: 'Payroll 2 (Too Expensive)',
            approvable: $payrollTooExpensive,
            payload: ['total_payout' => 50000]
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.batch-approve'), [
                'approval_ids' => [$approval1->id, $approval2->id],
            ]);

        // Controller should not crash with 500, but report partial success
        $response->assertSessionHas('success');

        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval1->fresh()->status);
        $this->assertEquals('Paid', $payrollOk->fresh()->status);

        $this->assertEquals(OwnerApproval::STATUS_PENDING, $approval2->fresh()->status);
        $this->assertEquals('Pending', $payrollTooExpensive->fresh()->status);
    }

    public function test_notification_target_url_routes_restricted_staff_to_accessible_module(): void
    {
        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'name' => 'White Clay',
            'sku' => 'SUP-WHT-001',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'min_stock' => 5,
            'max_stock' => 100,
            'unit_cost' => 100,
        ]);

        $stockRequest = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 5,
            'total_cost' => 500,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_PROCUREMENT,
            title: 'Procurement Restock: White Clay',
            summary: 'Restock 5kg White Clay',
            approvable: $stockRequest,
            payload: $this->approvalService->buildProcurementPayload($supply, 5)
        );

        // Staff without overview access but with stock requests access
        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'stock_requests' => 'can_edit',
                'procurement' => 'can_edit',
            ], true),
        ]);
        $this->assertFalse($this->staff->canEditSellerModule('overview'));

        // Owner approves
        $this->owner->update(['base_funds' => 10000]);
        $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $notification = $this->staff->notifications()
            ->where('data->approval_id', (string) $approval->id)
            ->first()
            ?? $this->staff->notifications()->get()->first(
                fn ($n) => (string) ($n->data['approval_id'] ?? null) === (string) $approval->id
            );
        $this->assertNotNull($notification);

        // NotificationPresenter should resolve to stock-requests.index, NOT seller.approvals.index
        $resolvedUrl = NotificationPresenter::resolveUrl($notification->data, $this->staff);
        $this->assertEquals(route('stock-requests.index'), $resolvedUrl);

        // Staff can safely access this resolved URL without a 403 Forbidden
        $this->actingAs($this->staff)
            ->get($resolvedUrl)
            ->assertOk();
    }

    public function test_direct_action_provision_staff_account_intercepts_salary_and_creates_approval(): void
    {
        $provisioner = app(ProvisionStaffAccount::class);

        $result = $provisioner->update(
            employee: $this->employee,
            validated: [
                'name' => $this->employee->name,
                'role' => $this->employee->role,
                'salary' => 800.00,
                'justification' => 'Direct action salary change test',
                'effective_date' => '2026-10-01',
            ],
            supportedModules: ['hr'],
            seller: $this->owner,
            actor: $this->staff,
            linkedLogin: null,
            shouldManageLoginSettings: false,
            wantsLoginAccount: false,
            employeeId: $this->employee->employee_id
        );

        // Employee salary is kept
        $this->assertEquals(500.00, (float) $this->employee->fresh()->salary);
        $this->assertNotNull($result['pendingRateApproval']);

        $this->assertDatabaseHas('owner_approvals', [
            'seller_id' => $this->owner->id,
            'requester_id' => $this->staff->id,
            'domain' => OwnerApproval::DOMAIN_STAFF_RATE,
            'approvable_id' => $this->employee->id,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);
    }

    public function test_staff_order_refund_approval_intercepted_and_creates_owner_approval(): void
    {
        Mail::fake();

        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => 'can_edit'], true),
        ]);

        $buyer = User::factory()->create(['role' => 'buyer']);

        $order = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REFUND-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'total_amount' => 515,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Blk 1 Lot 2, General Trias, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $response = $this->actingAs($this->staff)
            ->post(route('orders.approve-return', $order->order_number), [
                'action_type' => 'refund',
            ]);

        $response->assertSessionHas('success');

        // Order status remains Refund/Return pending owner approval
        $this->assertEquals('Refund/Return', $order->fresh()->status);

        $this->assertDatabaseHas('owner_approvals', [
            'seller_id' => $this->owner->id,
            'requester_id' => $this->staff->id,
            'domain' => OwnerApproval::DOMAIN_REFUND,
            'approvable_id' => $order->id,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);
    }

    public function test_owner_approving_refund_approval_executes_refund_and_updates_order(): void
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer']);

        $order = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-EXEC-REFUND-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 10,
            'total_amount' => 310,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Blk 1 Lot 2, General Trias, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_REFUND,
            title: "Approve Order Refund #{$order->order_number}",
            summary: "Refund ₱310.00 for order #{$order->order_number}",
            approvable: $order,
            payload: $this->approvalService->buildRefundPayload($order, 'refund')
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.approve', $approval->id));

        $response->assertSessionHas('success');
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->fresh()->status);
        $this->assertEquals('Refunded', $order->fresh()->status);
    }

    public function test_owner_rejecting_refund_approval_reverts_order_to_completed(): void
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => 'buyer']);

        $order = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REJ-REFUND-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 200,
            'convenience_fee_amount' => 6,
            'total_amount' => 206,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Blk 1 Lot 2, General Trias, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $approval = $this->approvalService->submitRequest(
            seller: $this->owner,
            requester: $this->staff,
            domain: OwnerApproval::DOMAIN_REFUND,
            title: "Approve Order Refund #{$order->order_number}",
            summary: "Refund ₱206.00 for order #{$order->order_number}",
            approvable: $order,
            payload: $this->approvalService->buildRefundPayload($order, 'refund')
        );

        $response = $this->actingAs($this->owner)
            ->post(route('seller.approvals.reject', $approval->id), [
                'rejection_reason' => 'Item was damaged by customer, not eligible.',
            ]);

        $response->assertSessionHas('success');
        $this->assertEquals(OwnerApproval::STATUS_REJECTED, $approval->fresh()->status);
        $this->assertEquals('Completed', $order->fresh()->status);
    }
}
