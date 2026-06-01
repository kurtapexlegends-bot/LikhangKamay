<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StaffAuthorizationMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_access_all_product_endpoints(): void
    {
        $owner = $this->createOwner();

        // 1. Can view products
        $this->actingAs($owner)
            ->get(route('products.index'))
            ->assertOk();

        // 2. Can export products
        $this->actingAs($owner)
            ->get(route('products.export-csv'))
            ->assertOk();

        // 3. Can import products
        $csvFile = UploadedFile::fake()->createWithContent('products.csv', "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\nPROD-101,Vase,Finished Goods,250.00,100.00,10,2,Active");
        $this->actingAs($owner)
            ->post(route('products.import-csv'), ['file' => $csvFile])
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'user_id' => $owner->id,
            'sku' => 'PROD-101',
            'name' => 'Vase',
        ]);
    }

    public function test_unauthorized_staff_cannot_access_product_endpoints(): void
    {
        $owner = $this->createOwner();
        // Custom staff member without products permission
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        // 1. Blocked from index
        $this->actingAs($staff)
            ->get(route('products.index'))
            ->assertForbidden();

        // 2. Blocked from export
        $this->actingAs($staff)
            ->get(route('products.export-csv'))
            ->assertForbidden();

        // 3. Blocked from import
        $csvFile = UploadedFile::fake()->createWithContent('products.csv', "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\nPROD-101,Vase,Finished Goods,250.00,100.00,10,2,Active");
        $this->actingAs($staff)
            ->post(route('products.import-csv'), ['file' => $csvFile])
            ->assertForbidden();
    }

    public function test_read_only_staff_can_view_and_export_products_but_cannot_import_or_store(): void
    {
        $owner = $this->createOwner();
        // Staff member with read-only products permission
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_READ_ONLY,
            ], true),
        ]);

        // 1. Can view products
        $this->actingAs($staff)
            ->get(route('products.index'))
            ->assertOk();

        // 2. Can export products (GET request is safe)
        $this->actingAs($staff)
            ->get(route('products.export-csv'))
            ->assertOk();

        // 3. Cannot import products (POST request is not safe, requires edit permission)
        $csvFile = UploadedFile::fake()->createWithContent('products.csv', "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\nPROD-101,Vase,Finished Goods,250.00,100.00,10,2,Active");
        $this->actingAs($staff)
            ->post(route('products.import-csv'), ['file' => $csvFile])
            ->assertForbidden();

        // 4. Cannot create a new product
        $this->actingAs($staff)
            ->post(route('products.store'), [
                'name' => 'Failing Product',
                'sku' => 'FAIL-1',
                'price' => 150.00,
            ])
            ->assertForbidden();
    }

    public function test_write_access_staff_can_execute_all_product_endpoints(): void
    {
        $owner = $this->createOwner();
        // Staff member with write/edit products permission
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], true),
        ]);

        // 1. Can view products
        $this->actingAs($staff)
            ->get(route('products.index'))
            ->assertOk();

        // 2. Can export products
        $this->actingAs($staff)
            ->get(route('products.export-csv'))
            ->assertOk();

        // 3. Can import products
        $csvFile = UploadedFile::fake()->createWithContent('products.csv', "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\nPROD-102,Plate,Finished Goods,150.00,50.00,20,1,Active");
        $this->actingAs($staff)
            ->post(route('products.import-csv'), ['file' => $csvFile])
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'user_id' => $owner->id,
            'sku' => 'PROD-102',
            'name' => 'Plate',
        ]);
    }

    public function test_suspended_staff_cannot_access_any_seller_workspace_endpoints(): void
    {
        $owner = $this->createOwner();
        // Staff member with suspended workspace access
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], false),
        ]);

        // Blocked from all workspace routes (e.g., products list)
        $this->actingAs($staff)
            ->get(route('products.index'))
            ->assertForbidden();
    }

    private function createOwner(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        // The compliance agreement is checked by seller.compliance middleware
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
}
