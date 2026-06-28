<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_isolation_blocks_cross_shop_access(): void
    {
        // Setup Shop A and Shop B
        $ownerA = $this->createOwner();
        $ownerB = $this->createOwner();

        // Create category
        Category::create([
            'name' => 'Pottery',
            'slug' => 'pottery',
        ]);

        // 1. Stock Request
        $supplyB = $this->createSupply($ownerB);
        $stockRequestB = StockRequest::create([
            'user_id' => $ownerB->id,
            'supply_id' => $supplyB->id,
            'quantity' => 10,
            'total_cost' => 1000,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        // Owner A cannot approve Stock Request B
        $this->actingAs($ownerA)
            ->post(route('accounting.approve', $stockRequestB))
            ->assertForbidden();

        // 2. Payroll
        $payrollB = Payroll::create([
            'user_id' => $ownerB->id,
            'month' => 'June 2026',
            'total_amount' => 15000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        // Owner A cannot approve Payroll B
        $this->actingAs($ownerA)
            ->post(route('accounting.approvePayroll', $payrollB))
            ->assertForbidden();

        // 3. Product
        $productB = Product::create([
            'user_id' => $ownerB->id,
            'sku' => 'PROD-B',
            'name' => 'Shop B Product',
            'category' => 'Pottery',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 10,
            'status' => 'Active',
        ]);

        // Owner A cannot archive Product B
        $this->actingAs($ownerA)
            ->post(route('products.archive', $productB->id))
            ->assertForbidden();
    }

    public function test_staff_product_permissions_enforced_by_policy(): void
    {
        $owner = $this->createOwner();

        Category::create([
            'name' => 'Pottery',
            'slug' => 'pottery',
        ]);

        // Product
        $product = Product::create([
            'user_id' => $owner->id,
            'sku' => 'PROD-1',
            'name' => 'Shop A Product',
            'category' => 'Pottery',
            'price' => 500,
            'cost_price' => 200,
            'stock' => 10,
            'status' => 'Active',
        ]);

        // Staff without products module access
        $staffWithoutAccess = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);

        // Staff with read-only products module access
        $staffReadOnly = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_READ_ONLY,
            ], true),
        ]);

        // Staff with edit products module access
        $staffEdit = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        // Staff without access cannot view or edit
        $this->actingAs($staffWithoutAccess)
            ->get(route('products.index'))
            ->assertForbidden();

        $this->actingAs($staffWithoutAccess)
            ->post(route('products.archive', $product->id))
            ->assertForbidden();

        // Staff with read-only access can view but cannot edit/archive
        $this->actingAs($staffReadOnly)
            ->get(route('products.index'))
            ->assertOk();

        $this->actingAs($staffReadOnly)
            ->post(route('products.archive', $product->id))
            ->assertForbidden();

        // Staff with edit access can view and edit/archive
        $this->actingAs($staffEdit)
            ->get(route('products.index'))
            ->assertOk();

        $this->actingAs($staffEdit)
            ->post(route('products.archive', $product->id))
            ->assertRedirect();
    }

    public function test_staff_payroll_permissions_enforced_by_policy(): void
    {
        $owner = $this->createOwner();

        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'month' => 'June 2026',
            'total_amount' => 15000,
            'employee_count' => 1,
            'status' => 'Draft',
        ]);

        // Staff without HR module access
        $staffWithoutAccess = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);

        // Staff with edit/manage HR access
        $staffEdit = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'hr' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        // Staff without access cannot submit payroll
        $this->actingAs($staffWithoutAccess)
            ->post(route('hr.payroll.submit', $payroll))
            ->assertForbidden();

        // Staff with edit access can submit payroll
        $this->actingAs($staffEdit)
            ->post(route('hr.payroll.submit', $payroll))
            ->assertRedirect();
    }

    public function test_staff_stock_request_permissions_enforced_by_policy(): void
    {
        $owner = $this->createOwner();
        $supply = $this->createSupply($owner);

        // Staff without procurement access
        $staffWithoutAccess = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);

        // Staff with procurement and stock request edit access
        $staffProcurement = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'procurement' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'stock_requests' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        // Staff with accounting edit access
        $staffAccounting = $this->createClockedInStaff($owner, [
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'accounting' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        // Debug assertions
        $this->assertTrue($staffAccounting->isStaff());
        $this->assertTrue($staffAccounting->isWorkspaceAccessEnabled());
        $this->assertEquals(User::STAFF_ACCESS_PERMISSION_CAN_EDIT, $staffAccounting->getStaffModuleAccessLevel('accounting'));
        $this->assertTrue($staffAccounting->canEditSellerModule('accounting'));

        // Staff without access cannot request restock
        $this->actingAs($staffWithoutAccess)
            ->post(route('supplies.request', $supply), ['quantity' => 5])
            ->assertForbidden();

        // Staff with procurement access can request restock
        $this->actingAs($staffProcurement)
            ->post(route('supplies.request', $supply), ['quantity' => 5])
            ->assertRedirect();

        $stockRequest = StockRequest::firstOrFail();

        // Staff with procurement access cannot approve fund release
        $this->actingAs($staffProcurement)
            ->post(route('accounting.approve', $stockRequest))
            ->assertForbidden();

        $this->assertTrue($staffAccounting->can('approve', $stockRequest));

        // Staff with accounting access can approve fund release
        $this->actingAs($staffAccounting)
            ->post(route('accounting.approve', $stockRequest))
            ->assertRedirect();
    }

    public function test_super_admin_bypasses_all_policy_checks(): void
    {
        $owner = $this->createOwner();
        $admin = User::factory()->create(['role' => 'super_admin']);

        // Stock Request
        $supply = $this->createSupply($owner);
        $stockRequest = StockRequest::create([
            'user_id' => $owner->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 1000,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        // Admin can approve/reject Stock Request (direct policy checks)
        $this->assertTrue($admin->can('approve', $stockRequest));
        $this->assertTrue($admin->can('reject', $stockRequest));

        // Payroll
        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'month' => 'June 2026',
            'total_amount' => 15000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);
        $this->assertTrue($admin->can('approve', $payroll));
        $this->assertTrue($admin->can('reject', $payroll));
    }

    private function createOwner(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium', // unlocked all modules
            'base_funds' => 50000,
        ]);

        \App\Models\SellerComplianceAgreement::create([
            'user_id' => $owner->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        return $owner;
    }

    private function createClockedInStaff(User $owner, array $attributes = []): User
    {
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Staff Member',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $staff = User::factory()->staff($owner)->create(array_merge([
            'employee_id' => $employee->id,
            'name' => 'Staff Member',
        ], $attributes));

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        return $staff;
    }

    private function createSupply(User $owner): Supply
    {
        return Supply::create([
            'user_id' => $owner->id,
            'name' => 'White Clay',
            'category' => 'Other',
            'quantity' => 20,
            'unit' => 'kg',
            'min_stock' => 5,
            'unit_cost' => 100,
            'supplier' => 'Laguna Ceramics',
        ]);
    }
}
