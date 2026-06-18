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

    public function test_csv_import_enforces_active_limits_and_media_requirements(): void
    {
        \App\Models\Product::$bypassReview = true;
        $owner = $this->createOwner();
        $owner->update(['premium_tier' => 'free']); // Active limit is 3

        // 1. Missing Media validation (should be forced to Draft)
        $csvFileMissingMedia = UploadedFile::fake()->createWithContent('products_missing.csv', 
            "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\n" .
            "PROD-M1,Missing Media Vase,Finished Goods,250.00,100.00,10,2,Active"
        );

        $this->actingAs($owner)
            ->post(route('products.import-csv'), ['file' => $csvFileMissingMedia])
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'user_id' => $owner->id,
            'sku' => 'PROD-M1',
            'status' => 'Draft',
        ]);

        // 2. Active limit enforcement (import 4 valid products, limit is 3)
        $productA = \App\Models\Product::factory()->create([
            'user_id' => $owner->id,
            'sku' => 'PROD-A',
            'name' => 'Product A',
            'category' => 'Finished Goods',
            'price' => 100.0,
            'cover_photo_path' => 'photos/cover.jpg',
            'gallery_paths' => ['photos/g1.jpg', 'photos/g2.jpg', 'photos/g3.jpg'],
            'model_3d_path' => 'models/m1.glb',
            'status' => 'Draft',
        ]);
        $productB = \App\Models\Product::factory()->create([
            'user_id' => $owner->id,
            'sku' => 'PROD-B',
            'name' => 'Product B',
            'category' => 'Finished Goods',
            'price' => 100.0,
            'cover_photo_path' => 'photos/cover.jpg',
            'gallery_paths' => ['photos/g1.jpg', 'photos/g2.jpg', 'photos/g3.jpg'],
            'model_3d_path' => 'models/m1.glb',
            'status' => 'Draft',
        ]);
        $productC = \App\Models\Product::factory()->create([
            'user_id' => $owner->id,
            'sku' => 'PROD-C',
            'name' => 'Product C',
            'category' => 'Finished Goods',
            'price' => 100.0,
            'cover_photo_path' => 'photos/cover.jpg',
            'gallery_paths' => ['photos/g1.jpg', 'photos/g2.jpg', 'photos/g3.jpg'],
            'model_3d_path' => 'models/m1.glb',
            'status' => 'Draft',
        ]);
        $productD = \App\Models\Product::factory()->create([
            'user_id' => $owner->id,
            'sku' => 'PROD-D',
            'name' => 'Product D',
            'category' => 'Finished Goods',
            'price' => 100.0,
            'cover_photo_path' => 'photos/cover.jpg',
            'gallery_paths' => ['photos/g1.jpg', 'photos/g2.jpg', 'photos/g3.jpg'],
            'model_3d_path' => 'models/m1.glb',
            'status' => 'Draft',
        ]);

        $csvFileLimit = UploadedFile::fake()->createWithContent('products_limit.csv', 
            "SKU,Name,Category,Price,Cost Price,Stock,Lead Time,Status\n" .
            "PROD-A,Product A,Finished Goods,100,50,10,2,Active\n" .
            "PROD-B,Product B,Finished Goods,100,50,10,2,Active\n" .
            "PROD-C,Product C,Finished Goods,100,50,10,2,Active\n" .
            "PROD-D,Product D,Finished Goods,100,50,10,2,Active"
        );

        $this->actingAs($owner)
            ->post(route('products.import-csv'), ['file' => $csvFileLimit])
            ->assertRedirect();

        // The first 3 should be active
        $this->assertDatabaseHas('products', ['sku' => 'PROD-A', 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['sku' => 'PROD-B', 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['sku' => 'PROD-C', 'status' => 'Active']);

        // The 4th one should remain Draft since the active limit (3) was already reached
        $this->assertDatabaseHas('products', ['sku' => 'PROD-D', 'status' => 'Draft']);

        \App\Models\Product::$bypassReview = false;
    }

    public function test_staff_export_analytics_requires_revenue_view_capability(): void
    {
        $owner = $this->createOwner();
        $owner->update(['premium_tier' => 'premium']); // Premium tier is required to export analytics

        // 1. Staff with analytics access but NO accounting (view revenue) capability
        $staffNoRevenue = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'analytics' => true,
            ], true),
        ]);

        $this->actingAs($staffNoRevenue)
            ->get(route('analytics.export'))
            ->assertForbidden();

        // 2. Staff with BOTH analytics access and accounting (view revenue) capability
        $staffWithRevenue = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([
                'analytics' => true,
                'accounting' => true,
            ], true),
        ]);

        $this->actingAs($staffWithRevenue)
            ->get(route('analytics.export'))
            ->assertOk();
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
