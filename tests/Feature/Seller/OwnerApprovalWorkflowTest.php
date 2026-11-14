<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Discount;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Actions\Seller\HR\ProvisionStaffAccount;
use App\Actions\Seller\HR\TerminateEmployeeAction;
use App\Notifications\OwnerApprovalDecisionNotification;
use App\Notifications\TeamRequestSubmittedNotification;
use App\Services\OwnerApprovalService;
use App\Services\Search\SellerSearchService;
use App\Support\NotificationPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
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

        $response->assertForbidden();

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

    public function test_standard_seller_and_restricted_staff_strictly_forbidden_from_all_approval_endpoints(): void
    {
        $standardSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $sampleApproval = OwnerApproval::create([
            'seller_id' => $this->owner->id,
            'requester_id' => $this->staff->id,
            'domain' => OwnerApproval::DOMAIN_PROCUREMENT,
            'title' => 'Sample Approval Item',
            'summary' => 'Sample approval item summary',
            'status' => OwnerApproval::STATUS_PENDING,
            'payload' => ['item' => 'test'],
        ]);

        // Standard seller (0 employees, standard plan) is completely forbidden
        $this->actingAs($standardSeller)
            ->get(route('seller.approvals.index'))
            ->assertForbidden();

        $this->actingAs($standardSeller)
            ->post(route('seller.approvals.approve', $sampleApproval->id))
            ->assertForbidden();

        $this->actingAs($standardSeller)
            ->post(route('seller.approvals.reject', $sampleApproval->id), ['reason' => 'Denied'])
            ->assertForbidden();

        $this->actingAs($standardSeller)
            ->post(route('seller.approvals.batch-approve'), ['approval_ids' => [$sampleApproval->id]])
            ->assertForbidden();

        $this->actingAs($standardSeller)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pendingApprovalsCount', 0)
            );

        // Restricted staff (non-manager without approvals/overview capability)
        $restrictedStaff = User::factory()->staff($this->owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => true], true),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $restrictedStaff->id,
            'seller_owner_id' => $this->owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $this->actingAs($restrictedStaff)
            ->get(route('seller.approvals.index'))
            ->assertForbidden();

        $this->actingAs($restrictedStaff)
            ->post(route('seller.approvals.approve', $sampleApproval->id))
            ->assertForbidden();

        $this->actingAs($restrictedStaff)
            ->post(route('seller.approvals.reject', $sampleApproval->id), ['reason' => 'Denied'])
            ->assertForbidden();

        $this->actingAs($restrictedStaff)
            ->post(route('seller.approvals.batch-approve'), ['approval_ids' => [$sampleApproval->id]])
            ->assertForbidden();

        $this->actingAs($restrictedStaff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pendingApprovalsCount', 0)
            );
    }

    public function test_submitting_team_request_notifies_owner_and_evicts_cache_instantly(): void
    {
        Notification::fake();
        $cacheKey = "seller_{$this->owner->id}_pending_approvals_count";
        Cache::put($cacheKey, 99, 60);

        $approval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_PROCUREMENT,
            'Restock Red Clay',
            'Staff requested 50kg clay'
        );

        $this->assertNull(Cache::get($cacheKey));
        Notification::assertSentTo(
            $this->owner,
            TeamRequestSubmittedNotification::class,
            function ($notification) use ($approval) {
                return $notification->approval->id === $approval->id
                    && $notification->requester->id === $this->staff->id;
            }
        );
    }

    public function test_approving_and_rejecting_request_evicts_cache_instantly(): void
    {
        $cacheKey = "seller_{$this->owner->id}_pending_approvals_count";

        $approval1 = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_DISCOUNT,
            '10% OFF Sale',
            'Summer promo'
        );

        Cache::put($cacheKey, 5, 60);
        $this->approvalService->approve($approval1, $this->owner);
        $this->assertNull(Cache::get($cacheKey));

        $approval2 = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_DISCOUNT,
            '20% OFF Sale',
            'Flash promo'
        );

        Cache::put($cacheKey, 5, 60);
        $this->approvalService->reject($approval2, $this->owner, 'Too high discount');
        $this->assertNull(Cache::get($cacheKey));
    }

    protected function createShopManagerForOwner(): User
    {
        $managerEmp = Employee::create([
            'user_id' => $this->owner->id,
            'name' => 'Shop Manager',
            'role' => 'Shop Manager',
            'salary' => 25000.00,
            'status' => 'active',
            'join_date' => now()->toDateString(),
        ]);

        $manager = User::factory()->staff($this->owner)->create([
            'employee_id' => $managerEmp->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'shop_manager',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(
                User::withStaffUserLevelFlag([
                    'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                    'orders' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                    'discounts' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                    'marketing' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                    'approvals' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                ], User::STAFF_MANAGER_USER_LEVEL),
                true
            ),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $manager->id,
            'seller_owner_id' => $this->owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        return $manager;
    }

    public function test_shop_manager_scoped_to_discount_and_product_draft_only_in_approvals_hub_notifications_and_search(): void
    {
        Notification::fake();
        $manager = $this->createShopManagerForOwner();

        $payrollApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_HR_PAYROLL,
            'November Payroll Run (1st Half)',
            'Payroll summary'
        );

        $procurementApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_PROCUREMENT,
            'Restock Clay Slip Batch',
            'Clay restock summary'
        );

        $rateApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_STAFF_RATE,
            'Salary Update: Juan',
            'Rate proposal'
        );

        $refundApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_REFUND,
            'Refund Order #ORD-9001',
            'Cash refund request'
        );

        $discountApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_DISCOUNT,
            'Ber-Months Flash Promo',
            '15% OFF stoneware'
        );

        Product::$bypassReview = true;
        $draftProduct = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'MGR-DRAFT-01',
            'name' => 'Draft Carved Vase',
            'category' => 'Pottery & Ceramics',
            'price' => 1200,
            'cost_price' => 500,
            'stock' => 10,
            'status' => 'Draft',
            'cover_photo_path' => 'products/covers/ready.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/ready.glb',
        ]);
        Product::$bypassReview = false;

        $productDraftApproval = $this->approvalService->queueProductDraftRequest(
            $this->owner,
            $this->staff,
            $draftProduct,
            ['status' => 'Active', 'price' => 1200, 'cost_price' => 500],
            'publish'
        );

        // Manager notifications ONLY sent for discount & product_draft
        Notification::assertSentTo($manager, TeamRequestSubmittedNotification::class, 2);
        Notification::assertNotSentTo($manager, TeamRequestSubmittedNotification::class, function ($n) use ($payrollApproval) {
            return $n->approval->id === $payrollApproval->id;
        });

        // /approvals hub only exposes discount + product_draft to Shop Manager
        $this->actingAs($manager)
            ->get(route('seller.approvals.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pendingCount', 2)
                ->where('pendingApprovalsCount', 2)
                ->where('isOwnerReviewer', false)
                ->where('allowedDomains', [OwnerApproval::DOMAIN_DISCOUNT, OwnerApproval::DOMAIN_PRODUCT_DRAFT])
                ->has('approvals.data', 2)
            );

        // Owner still sees all 6 pending
        $this->actingAs($this->owner)
            ->get(route('seller.approvals.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('pendingCount', 6)
                ->where('isOwnerReviewer', true)
            );

        // Global search scopes Shop Manager away from owner-only domains
        $searchResults = app(SellerSearchService::class)->search($manager, 'Payroll', 'like');
        $teamReqPayroll = array_values(array_filter($searchResults, fn ($item) => ($item['type'] ?? null) === 'Team Request'));
        $this->assertCount(0, $teamReqPayroll);

        $managerDiscountSearch = app(SellerSearchService::class)->search($manager, 'Ber-Months', 'like');
        $teamReqDiscount = array_values(array_filter($managerDiscountSearch, fn ($item) => ($item['type'] ?? null) === 'Team Request'));
        $this->assertCount(1, $teamReqDiscount);

        // Shop Manager blocked from owner-only actions (403)
        foreach ([$payrollApproval, $procurementApproval, $rateApproval, $refundApproval] as $restricted) {
            $this->actingAs($manager)
                ->post(route('seller.approvals.approve', $restricted->id))
                ->assertForbidden();

            $this->actingAs($manager)
                ->post(route('seller.approvals.reject', $restricted->id), ['reason' => 'No access'])
                ->assertForbidden();
        }

        // Batch approve cannot bypass owner-only domain guard
        $this->actingAs($manager)
            ->post(route('seller.approvals.batch-approve'), [
                'approval_ids' => [$payrollApproval->id, $discountApproval->id, $productDraftApproval->id],
            ])
            ->assertRedirect();

        $this->assertEquals(OwnerApproval::STATUS_PENDING, $payrollApproval->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $discountApproval->fresh()->status);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $productDraftApproval->fresh()->status);
        $this->assertEquals('pending_review', $draftProduct->fresh()->status);
    }

    public function test_accounting_payroll_and_release_decisions_sync_owner_approval_and_evict_both_caches(): void
    {
        $ownerCacheKey = "seller_{$this->owner->id}_pending_approvals_count";
        $managerCacheKey = "seller_{$this->owner->id}_manager_pending_approvals_count";

        $this->owner->update(['base_funds' => 500000]);

        $payroll1 = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-10-01',
            'total_amount' => 15000,
            'employee_count' => 2,
            'status' => 'Pending',
        ]);
        $approvalP1 = $this->approvalService->submitRequest($this->owner, $this->staff, OwnerApproval::DOMAIN_HR_PAYROLL, 'Payroll Oct 1', 'Summary', $payroll1);

        $payroll2 = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-10-15',
            'total_amount' => 15000,
            'employee_count' => 2,
            'status' => 'Pending',
        ]);
        $approvalP2 = $this->approvalService->submitRequest($this->owner, $this->staff, OwnerApproval::DOMAIN_HR_PAYROLL, 'Payroll Oct 15', 'Summary', $payroll2);

        $supply = Supply::create([
            'user_id' => $this->owner->id,
            'sku' => 'SUP-ACC-01',
            'name' => 'White Slip Clay',
            'category' => 'Raw Clay & Slips',
            'quantity' => 5,
            'unit' => 'bags',
            'min_stock' => 2,
            'unit_cost' => 300,
        ]);

        $req1 = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 3000,
            'status' => StockRequest::STATUS_PENDING,
        ]);
        $approvalS1 = $this->approvalService->submitRequest($this->owner, $this->staff, OwnerApproval::DOMAIN_PROCUREMENT, 'Restock S1', 'Summary', $req1);

        $req2 = StockRequest::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 3000,
            'status' => StockRequest::STATUS_PENDING,
        ]);
        $approvalS2 = $this->approvalService->submitRequest($this->owner, $this->staff, OwnerApproval::DOMAIN_PROCUREMENT, 'Restock S2', 'Summary', $req2);

        Cache::put($ownerCacheKey, 4, 60);
        Cache::put($managerCacheKey, 4, 60);
        $this->actingAs($this->owner)->post(route('accounting.approvePayroll', $payroll1->id))->assertRedirect();
        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertNull(Cache::get($managerCacheKey));
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approvalP1->fresh()->status);

        Cache::put($ownerCacheKey, 3, 60);
        Cache::put($managerCacheKey, 3, 60);
        $this->actingAs($this->owner)->post(route('accounting.rejectPayroll', $payroll2->id), ['reason' => 'Adjust OT'])->assertRedirect();
        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertNull(Cache::get($managerCacheKey));
        $this->assertEquals(OwnerApproval::STATUS_REJECTED, $approvalP2->fresh()->status);

        Cache::put($ownerCacheKey, 2, 60);
        Cache::put($managerCacheKey, 2, 60);
        $this->actingAs($this->owner)->post(route('accounting.approve', $req1->id))->assertRedirect();
        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertNull(Cache::get($managerCacheKey));
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approvalS1->fresh()->status);

        Cache::put($ownerCacheKey, 1, 60);
        Cache::put($managerCacheKey, 1, 60);
        $this->actingAs($this->owner)->post(route('accounting.reject', $req2->id), ['reason' => 'Over budget'])->assertRedirect();
        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertNull(Cache::get($managerCacheKey));
        $this->assertEquals(OwnerApproval::STATUS_REJECTED, $approvalS2->fresh()->status);
    }

    public function test_product_draft_smart_triggers_and_owner_or_manager_approval(): void
    {
        Category::firstOrCreate(['name' => 'Pottery & Ceramics'], ['slug' => 'pottery-ceramics']);
        $manager = $this->createShopManagerForOwner();

        $this->owner->modules_enabled = array_merge((array) $this->owner->modules_enabled, ['products' => true]);
        $this->owner->save();

        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT], true),
        ]);

        // 1. Junior staff creates Draft, attaches required media, then requests activation -> stays Draft + product_draft approval
        $this->actingAs($this->staff)->post(route('products.store'), [
            'sku' => 'STAFF-NEW-01',
            'name' => 'Handcrafted Stoneware Flower Vase',
            'category' => 'Pottery & Ceramics',
            'price' => 1400,
            'cost_price' => 600,
            'stock' => 15,
            'status' => 'Draft',
        ])->assertRedirect();

        $created = Product::where('sku', 'STAFF-NEW-01')->firstOrFail();
        $created->forceFill([
            'cover_photo_path' => 'products/covers/sample.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/vase.glb',
        ])->saveQuietly();

        $this->actingAs($this->staff)->post(route('products.activate', $created->id))->assertRedirect();
        $this->assertEquals('Draft', $created->fresh()->status);

        $publishApproval = OwnerApproval::where('approvable_type', Product::class)
            ->where('approvable_id', $created->id)
            ->where('domain', OwnerApproval::DOMAIN_PRODUCT_DRAFT)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->firstOrFail();

        // Owner approving publishes it to Active (which transitions to pending_review for platform review)
        $this->actingAs($this->owner)->post(route('seller.approvals.approve', $publishApproval->id))->assertRedirect();
        $this->assertEquals('pending_review', $created->fresh()->status);

        // Simulate platform admin approving it so it becomes an Active storefront product for live testing:
        $created->forceFill(['status' => 'Active'])->saveQuietly();

        // 2. Routine stock/description edit passes straight through WITHOUT creating an approval
        $countBefore = OwnerApproval::where('domain', OwnerApproval::DOMAIN_PRODUCT_DRAFT)->count();
        $this->actingAs($this->staff)->post(route('products.update', $created->id), [
            'sku' => $created->sku,
            'name' => $created->name,
            'category' => 'Pottery & Ceramics',
            'price' => 1400,
            'cost_price' => 600,
            'stock' => 22,
            'status' => 'Active',
            'retained_gallery' => $created->gallery_paths,
        ])->assertRedirect();

        $created->refresh();
        $this->assertEquals(22, $created->stock);
        $this->assertEquals($countBefore, OwnerApproval::where('domain', OwnerApproval::DOMAIN_PRODUCT_DRAFT)->count());

        // 3. Changing price holds old price (1400) and submits price_change approval; Shop Manager approves
        $this->actingAs($this->staff)->post(route('products.update', $created->id), [
            'sku' => $created->sku,
            'name' => $created->name,
            'category' => 'Pottery & Ceramics',
            'price' => 1750,
            'cost_price' => 650,
            'stock' => 22,
            'status' => 'Active',
            'retained_gallery' => $created->gallery_paths,
        ])->assertRedirect();

        $created->refresh();
        $this->assertEquals(1400.00, (float) $created->price);
        $this->assertEquals(600.00, (float) $created->cost_price);

        $priceApproval = OwnerApproval::where('approvable_type', Product::class)
            ->where('approvable_id', $created->id)
            ->where('domain', OwnerApproval::DOMAIN_PRODUCT_DRAFT)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->latest('id')
            ->firstOrFail();

        $this->actingAs($manager)->post(route('seller.approvals.approve', $priceApproval->id))->assertRedirect();
        $created->refresh();
        $this->assertEquals(1750.00, (float) $created->price);
        $this->assertEquals(650.00, (float) $created->cost_price);
        $this->assertEquals('Active', $created->status);
    }

    public function test_discount_multi_group_store_and_update_destroy_gating_for_junior_staff(): void
    {
        $this->owner->modules_enabled = array_merge((array) $this->owner->modules_enabled, ['products' => true]);
        $this->owner->save();

        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'discounts' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        Product::$bypassReview = true;
        $p1 = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'DISC-P1',
            'name' => 'Clay Bowl Alpha',
            'category' => 'Pottery & Ceramics',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 20,
            'status' => 'Active',
        ]);
        $p2 = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'DISC-P2',
            'name' => 'Clay Plate Beta',
            'category' => 'Pottery & Ceramics',
            'price' => 800,
            'cost_price' => 300,
            'stock' => 20,
            'status' => 'Active',
        ]);
        Product::$bypassReview = false;

        // 1. Multi-group store creates 2 inactive discounts and 1 approval holding both IDs
        $this->actingAs($this->staff)
            ->post(route('discounts.store'), [
                'name' => 'Grouped Clay Promo',
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(5)->toDateTimeString(),
                'items' => [
                    ['product_id' => $p1->id, 'type' => 'percentage', 'value' => 10],
                    ['product_id' => $p2->id, 'type' => 'fixed', 'value' => 100],
                ],
            ])
            ->assertRedirect();

        $discounts = Discount::where('user_id', $this->owner->id)->where('name', 'Grouped Clay Promo')->get();
        $this->assertCount(2, $discounts);
        $this->assertTrue($discounts->every(fn ($d) => !$d->is_active));

        $createApproval = OwnerApproval::where('seller_id', $this->owner->id)
            ->where('domain', OwnerApproval::DOMAIN_DISCOUNT)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->firstOrFail();
        $this->assertCount(2, $createApproval->changes_payload['discount_ids'] ?? []);

        $this->actingAs($this->owner)->post(route('seller.approvals.approve', $createApproval->id))->assertRedirect();
        $this->assertEquals(2, Discount::where('name', 'Grouped Clay Promo')->where('is_active', true)->count());

        // 2. Junior staff update is gated and preserves live discount until approved
        $primaryDiscount = $discounts->first();
        $this->actingAs($this->staff)
            ->put(route('discounts.update', $primaryDiscount->id), [
                'name' => 'Updated Clay Promo',
                'type' => 'percentage',
                'value' => 25,
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(6)->toDateTimeString(),
                'product_ids' => [$p1->id],
            ])
            ->assertRedirect();

        $this->assertEquals(10.0, (float) $primaryDiscount->fresh()->value);
        $updateApproval = OwnerApproval::where('domain', OwnerApproval::DOMAIN_DISCOUNT)
            ->where('approvable_id', $primaryDiscount->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->firstOrFail();

        $this->actingAs($this->owner)->post(route('seller.approvals.approve', $updateApproval->id))->assertRedirect();
        $this->assertEquals('Updated Clay Promo', $primaryDiscount->fresh()->name);
        $this->assertEquals(25.0, (float) $primaryDiscount->fresh()->value);

        // 3. Junior staff destroy submits deactivation approval instead of immediately disabling
        $this->actingAs($this->staff)
            ->delete(route('discounts.destroy', $primaryDiscount->id))
            ->assertRedirect();

        $this->assertTrue((bool) $primaryDiscount->fresh()->is_active);
        $deactivateApproval = OwnerApproval::where('domain', OwnerApproval::DOMAIN_DISCOUNT)
            ->where('approvable_id', $primaryDiscount->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->firstOrFail();

        $this->actingAs($this->owner)->post(route('seller.approvals.approve', $deactivateApproval->id))->assertRedirect();
        $this->assertFalse((bool) $primaryDiscount->fresh()->is_active);
    }

    public function test_order_return_duplicate_guard_and_manager_refund_vs_replacement_governance(): void
    {
        Mail::fake();
        $manager = $this->createShopManagerForOwner();
        $buyer = User::factory()->create(['role' => 'buyer']);

        Product::$bypassReview = true;
        $product = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'RET-PROD-01',
            'name' => 'Stoneware Tea Bowl',
            'category' => 'Pottery & Ceramics',
            'price' => 450,
            'cost_price' => 180,
            'stock' => 10,
            'status' => 'Active',
        ]);
        Product::$bypassReview = false;

        $this->staff->update([
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => 'can_edit'], true),
        ]);

        // 1. Junior staff double-click creates only ONE pending OwnerApproval
        $codOrder = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DUP-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Imus, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $this->actingAs($this->staff)->post(route('orders.approve-return', $codOrder->order_number), ['action_type' => 'refund'])->assertRedirect();
        $this->actingAs($this->staff)->post(route('orders.approve-return', $codOrder->order_number), ['action_type' => 'refund'])->assertRedirect();

        $this->assertEquals(
            1,
            OwnerApproval::where('approvable_type', Order::class)
                ->where('approvable_id', $codOrder->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->count()
        );

        // 2. Shop Manager cash refund MUST still route to Owner-only approval
        $managerRefundOrder = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-MGR-REF-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Imus, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $this->actingAs($manager)
            ->post(route('orders.approve-return', $managerRefundOrder->order_number), ['action_type' => 'refund'])
            ->assertRedirect();

        $this->assertEquals('Refund/Return', $managerRefundOrder->fresh()->status);
        $this->assertDatabaseHas('owner_approvals', [
            'approvable_type' => Order::class,
            'approvable_id' => $managerRefundOrder->id,
            'domain' => OwnerApproval::DOMAIN_REFUND,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);

        // 3. Shop Manager replacement executes inline
        $replacementOrder = Order::create([
            'artisan_id' => $this->owner->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-MGR-REP-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Imus, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        OrderItem::create([
            'order_id' => $replacementOrder->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 450,
            'cost' => 180,
            'quantity' => 1,
        ]);

        $this->actingAs($manager)
            ->post(route('orders.approve-return', $replacementOrder->order_number), [
                'action_type' => 'replace',
                'replacement_resolution_description' => 'Dispatching replacement stoneware tea bowl.',
            ])
            ->assertRedirect();

        $this->assertNotEquals('Refund/Return', $replacementOrder->fresh()->status);
        $this->assertDatabaseMissing('owner_approvals', [
            'approvable_type' => Order::class,
            'approvable_id' => $replacementOrder->id,
        ]);
    }

    public function test_terminating_employee_or_deleting_draft_payroll_cleans_up_pending_owner_approvals(): void
    {
        $ownerCacheKey = "seller_{$this->owner->id}_pending_approvals_count";

        $rateApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_STAFF_RATE,
            'Salary Bump',
            'Rate adjustment',
            $this->employee
        );

        Cache::put($ownerCacheKey, 5, 60);
        app(TerminateEmployeeAction::class)->execute($this->owner, $this->owner, $this->employee->id);
        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertDatabaseMissing('owner_approvals', ['id' => $rateApproval->id]);

        $payroll = Payroll::create([
            'user_id' => $this->owner->id,
            'requested_by_user_id' => $this->staff->id,
            'month' => '2026-11-01',
            'total_amount' => 12000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);
        $payrollApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_HR_PAYROLL,
            'Nov Payroll',
            'Draft run',
            $payroll
        );

        Cache::put($ownerCacheKey, 5, 60);
        $this->actingAs($this->owner)
            ->delete(route('hr.payroll.destroy', $payroll->id))
            ->assertRedirect();

        $this->assertNull(Cache::get($ownerCacheKey));
        $this->assertDatabaseMissing('owner_approvals', ['id' => $payrollApproval->id]);
    }

    public function test_archiving_product_cleans_up_pending_product_draft_approvals(): void
    {
        Product::$bypassReview = true;
        $product = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'MUG-001',
            'name' => 'Ceramic Mug',
            'category' => 'Pottery & Ceramics',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 15,
            'status' => 'Active',
            'cover_photo_path' => 'products/covers/ready.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/ready.glb',
        ]);
        Product::$bypassReview = false;

        $draftApproval = $this->approvalService->submitRequest(
            $this->owner,
            $this->staff,
            OwnerApproval::DOMAIN_PRODUCT_DRAFT,
            'Draft Update: Ceramic Mug',
            'Price modification proposal',
            $product,
            ['target_status' => 'Active', 'price' => 550]
        );

        $this->assertDatabaseHas('owner_approvals', ['id' => $draftApproval->id, 'status' => 'pending']);

        app(\App\Actions\Seller\Catalog\ArchiveProduct::class)->execute($product, $this->owner->id);

        $this->assertDatabaseMissing('owner_approvals', ['id' => $draftApproval->id]);
        $this->assertEquals('Archived', $product->fresh()->status);
    }

    public function test_manager_cannot_self_approve_via_batch_approve(): void
    {
        $manager = User::factory()->staff($this->owner)->create([
            'name' => 'Head Manager',
            'staff_role_preset_key' => 'manager',
            'staff_module_permissions' => ['products' => true],
        ]);

        Product::$bypassReview = true;
        $product = Product::create([
            'user_id' => $this->owner->id,
            'sku' => 'MUG-002',
            'name' => 'Draft Carved Pitcher',
            'category' => 'Pottery & Ceramics',
            'price' => 600,
            'cost_price' => 250,
            'stock' => 5,
            'status' => 'Draft',
            'cover_photo_path' => 'products/covers/ready.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/ready.glb',
        ]);
        Product::$bypassReview = false;

        // Manager submits a request
        $approval = $this->approvalService->submitRequest(
            $this->owner,
            $manager,
            OwnerApproval::DOMAIN_PRODUCT_DRAFT,
            'Manager Proposed Draft',
            'Draft submission',
            $product,
            ['target_status' => 'Active']
        );

        // Batch approval called by manager on their own request should not approve it
        $approvedCount = $this->approvalService->batchApprove($this->owner, $manager, [$approval->id]);

        $this->assertEquals(0, $approvedCount);
        $this->assertEquals('pending', $approval->fresh()->status);
    }
}
