<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\OwnerApproval;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\OwnerApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
