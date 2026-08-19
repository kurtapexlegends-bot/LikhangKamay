<?php

namespace Tests\Feature\Seller;

use App\Models\Discount;
use App\Models\Employee;
use App\Models\OwnerApproval;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffDiscountApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $staffManager;
    protected User $standardStaff;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->owner->modules_enabled = [
            'products' => true,
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ];
        $this->owner->save();

        SellerComplianceAgreement::create([
            'user_id' => $this->owner->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        $managerEmp = Employee::create([
            'user_id' => $this->owner->id,
            'name' => 'Manager Staff',
            'role' => 'Shop Manager',
            'salary' => 25000.00,
            'status' => 'active',
            'join_date' => now()->toDateString(),
        ]);

        $this->staffManager = User::factory()->staff($this->owner)->create([
            'employee_id' => $managerEmp->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'shop_manager',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(
                User::withStaffUserLevelFlag([
                    'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                ], User::STAFF_MANAGER_USER_LEVEL),
                true
            ),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $this->staffManager->id,
            'seller_owner_id' => $this->owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $clerkEmp = Employee::create([
            'user_id' => $this->owner->id,
            'name' => 'Clerk Staff',
            'role' => 'Stock Clerk',
            'salary' => 18000.00,
            'status' => 'active',
            'join_date' => now()->toDateString(),
        ]);

        $this->standardStaff = User::factory()->staff($this->owner)->create([
            'employee_id' => $clerkEmp->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'stock_clerk',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(
                User::withStaffUserLevelFlag([
                    'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                ], User::DEFAULT_STAFF_USER_LEVEL),
                true
            ),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $this->standardStaff->id,
            'seller_owner_id' => $this->owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $this->product = Product::create([
            'user_id' => $this->owner->id,
            'name' => 'Handmade Clay Pot',
            'slug' => 'handmade-clay-pot-' . uniqid(),
            'sku' => 'POT-001',
            'category' => 'Pottery',
            'price' => 500.00,
            'stock' => 20,
            'status' => 'Active',
        ]);
    }

    public function test_owner_can_create_and_directly_activate_discount(): void
    {
        $response = $this->actingAs($this->owner)
            ->from(route('discounts.index'))
            ->post(route('discounts.store'), [
                'name' => 'Flash Weekend Sale',
                'type' => 'percentage',
                'value' => 20,
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(3)->toDateTimeString(),
                'product_ids' => [$this->product->id],
            ]);

        $response->assertRedirect(route('discounts.index'));
        $response->assertSessionHas('success', 'Discount created and applied successfully.');

        $this->assertDatabaseHas('discounts', [
            'user_id' => $this->owner->id,
            'name' => 'Flash Weekend Sale',
            'type' => 'percentage',
            'value' => 20,
            'is_active' => true,
        ]);

        $this->assertDatabaseMissing('owner_approvals', [
            'domain' => OwnerApproval::DOMAIN_DISCOUNT,
        ]);
    }

    public function test_staff_manager_can_create_and_directly_activate_discount(): void
    {
        $response = $this->actingAs($this->staffManager)
            ->from(route('discounts.index'))
            ->post(route('discounts.store'), [
                'name' => 'Manager Special',
                'type' => 'percentage',
                'value' => 15,
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(5)->toDateTimeString(),
                'product_ids' => [$this->product->id],
            ]);

        $response->assertRedirect(route('discounts.index'));
        $response->assertSessionHas('success', 'Discount created and applied successfully.');

        $this->assertDatabaseHas('discounts', [
            'user_id' => $this->owner->id,
            'name' => 'Manager Special',
            'type' => 'percentage',
            'value' => 15,
            'is_active' => true,
        ]);

        $this->assertDatabaseMissing('owner_approvals', [
            'domain' => OwnerApproval::DOMAIN_DISCOUNT,
        ]);
    }

    public function test_standard_staff_submits_discount_to_owner_approval_queue(): void
    {
        $response = $this->actingAs($this->standardStaff)
            ->from(route('discounts.index'))
            ->post(route('discounts.store'), [
                'name' => 'Clearance 30%',
                'type' => 'percentage',
                'value' => 30,
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(7)->toDateTimeString(),
                'product_ids' => [$this->product->id],
            ]);

        $response->assertRedirect(route('discounts.index'));
        $response->assertSessionHas('success', 'Discount campaign submitted to shop owner for review.');

        // Discount is created as inactive (draft)
        $discount = Discount::where('user_id', $this->owner->id)
            ->where('name', 'Clearance 30%')
            ->first();

        $this->assertNotNull($discount);
        $this->assertFalse((bool) $discount->is_active);

        // Approval record is created in owner queue
        $this->assertDatabaseHas('owner_approvals', [
            'seller_id' => $this->owner->id,
            'requester_id' => $this->standardStaff->id,
            'domain' => OwnerApproval::DOMAIN_DISCOUNT,
            'status' => OwnerApproval::STATUS_PENDING,
            'approvable_type' => Discount::class,
            'approvable_id' => $discount->id,
        ]);
    }

    public function test_owner_can_approve_staff_discount_and_it_becomes_active(): void
    {
        // Standard staff creates draft
        $this->actingAs($this->standardStaff)
            ->from(route('discounts.index'))
            ->post(route('discounts.store'), [
                'name' => 'Staff Markdown',
                'type' => 'percentage',
                'value' => 25,
                'start_at' => now()->toDateTimeString(),
                'end_at' => now()->addDays(4)->toDateTimeString(),
                'product_ids' => [$this->product->id],
            ]);

        $discount = Discount::where('name', 'Staff Markdown')->firstOrFail();
        $approval = OwnerApproval::where('approvable_id', $discount->id)->firstOrFail();

        $this->assertFalse((bool) $discount->is_active);

        // Owner approves
        $response = $this->actingAs($this->owner)->post(route('seller.approvals.approve', $approval->id));
        $response->assertRedirect();

        $discount->refresh();
        $approval->refresh();

        $this->assertTrue((bool) $discount->is_active);
        $this->assertEquals(OwnerApproval::STATUS_APPROVED, $approval->status);
    }
}
