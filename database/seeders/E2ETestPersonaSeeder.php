<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Employee;
use App\Models\Product;
use App\Models\SellerPickupSchedule;
use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2ETestPersonaSeeder extends Seeder
{
    public const TEST_PASSWORD = 'LikhangKamayTest2026!';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $passwordHash = Hash::make(self::TEST_PASSWORD);

        // 1. Super Admin Persona
        $admin = User::withTrashed()->updateOrCreate(
            ['email' => 'test.admin@likhangkamay.local'],
            [
                'name' => 'Test Super Administrator',
                'first_name' => 'Test',
                'last_name' => 'Admin',
                'password' => $passwordHash,
                'role' => 'super_admin',
                'email_verified_at' => now(),
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        // 2. Artisan Persona (Cavite Workshop Studio)
        $artisan = User::withTrashed()->updateOrCreate(
            ['email' => 'test.artisan@likhangkamay.local'],
            [
                'name' => 'Test Master Artisan',
                'first_name' => 'Test',
                'last_name' => 'Artisan',
                'password' => $passwordHash,
                'role' => 'artisan',
                'shop_name' => 'Cavite Test Craft Workshop',
                'phone_number' => '09170000001',
                'street_address' => '101 Bayan Luma Street',
                'city' => 'Imus',
                'barangay' => 'Bucandala I',
                'region' => 'Region IV-A (CALABARZON)',
                'zip_code' => '4103',
                'artisan_status' => 'approved',
                'email_verified_at' => now(),
                'setup_completed_at' => now(),
                'premium_tier' => 'super_premium',
                'subscription_expires_at' => now()->addYears(10),
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        // Workshop Address
        UserAddress::updateOrCreate(
            ['user_id' => $artisan->id, 'address_type' => 'office'],
            [
                'label' => 'Workshop Studio',
                'recipient_name' => 'Cavite Test Craft Workshop',
                'phone_number' => '09170000001',
                'street_address' => '101 Bayan Luma Street',
                'city' => 'Imus',
                'barangay' => 'Bucandala I',
                'region' => 'Region IV-A (CALABARZON)',
                'postal_code' => '4103',
                'full_address' => '101 Bayan Luma Street, Bucandala I, Imus, Cavite 4103',
                'latitude' => 14.4296,
                'longitude' => 120.9367,
                'is_default' => true,
            ]
        );

        // Pickup Schedule
        SellerPickupSchedule::updateOrCreate(
            ['user_id' => $artisan->id],
            [
                'is_enabled' => true,
                'schedule_mode' => 'uniform',
                'operating_days' => SellerPickupSchedule::DEFAULT_OPERATING_DAYS,
                'time_slots' => SellerPickupSchedule::DEFAULT_TIME_SLOTS,
                'max_advance_days' => 14,
            ]
        );

        // Artisan Test Product
        $category = Category::first();
        Product::withTrashed()->updateOrCreate(
            ['sku' => 'TEST-BAMBOO-01'],
            [
                'user_id' => $artisan->id,
                'name' => 'E2E Synthetic Bamboo Cup',
                'category' => $category?->name ?? 'Pottery & Ceramics',
                'price' => 25.00,
                'cost_price' => 15.00,
                'stock' => 999,
                'status' => 'Active',
                'lead_time' => 1,
                'description' => 'Synthetic test product for automated E2E lifecycle and verification.',
                'deleted_at' => null,
            ]
        );

        // 3. Buyer Persona (Cavite Resident)
        $buyer = User::withTrashed()->updateOrCreate(
            ['email' => 'test.buyer@likhangkamay.local'],
            [
                'name' => 'Test Verified Buyer',
                'first_name' => 'Test',
                'last_name' => 'Buyer',
                'password' => $passwordHash,
                'role' => 'buyer',
                'phone_number' => '09170000002',
                'email_verified_at' => now(),
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        // Buyer Delivery Address (Imus Cavite)
        UserAddress::updateOrCreate(
            ['user_id' => $buyer->id, 'address_type' => 'home'],
            [
                'label' => 'Home',
                'recipient_name' => 'Test Verified Buyer',
                'phone_number' => '09170000002',
                'street_address' => 'Block 4 Lot 12 Buhay na Tubig',
                'city' => 'Imus',
                'barangay' => 'Buhay na Tubig',
                'region' => 'Region IV-A (CALABARZON)',
                'postal_code' => '4103',
                'full_address' => 'Block 4 Lot 12 Buhay na Tubig, Imus, Cavite 4103',
                'latitude' => 14.4180,
                'longitude' => 120.9520,
                'is_default' => true,
            ]
        );

        // 4. HR & Operations Staff Persona
        $hrEmployee = Employee::withTrashed()->updateOrCreate(
            ['user_id' => $artisan->id, 'name' => 'Test HR Operations Staff'],
            [
                'employee_id' => 'EMP-TEST-HR01',
                'role' => 'Operations Staff',
                'salary' => 25000.00,
                'status' => 'Active',
                'allow_remote_clock_in' => true,
                'enforce_strict_shift_window' => false,
                'join_date' => now()->subMonths(6)->toDateString(),
                'deleted_at' => null,
            ]
        );

        $staffPermissions = [
            'workspace_access' => true,
            'hr' => 'edit',
            'orders' => 'edit',
            'products' => 'edit',
            'team_messages' => 'edit',
            'reviews' => 'edit',
        ];

        User::withTrashed()->updateOrCreate(
            ['email' => 'test.staff@likhangkamay.local'],
            [
                'name' => 'Test HR Operations Staff',
                'first_name' => 'Test',
                'last_name' => 'Staff',
                'password' => $passwordHash,
                'role' => 'staff',
                'seller_owner_id' => $artisan->id,
                'employee_id' => $hrEmployee->id,
                'staff_role_preset_key' => 'custom',
                'staff_module_permissions' => $staffPermissions,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        // 5. In-House Driver Persona
        $driverEmployee = Employee::withTrashed()->updateOrCreate(
            ['user_id' => $artisan->id, 'name' => 'Test Logistics Rider'],
            [
                'employee_id' => 'EMP-TEST-DRV01',
                'role' => 'Driver',
                'salary' => 18000.00,
                'vehicle_type' => 'Motorcycle',
                'vehicle_plate_number' => 'CAV-9876',
                'driver_license_number' => 'N01-12-345678',
                'driver_license_photo_path' => 'driver_licenses/test_driver_license.jpg',
                'delivery_compensation_type' => 'per_delivery',
                'delivery_fee_rate' => 50.00,
                'allow_remote_clock_in' => true,
                'enforce_strict_shift_window' => false,
                'status' => 'Active',
                'join_date' => now()->subMonths(3)->toDateString(),
                'deleted_at' => null,
            ]
        );

        User::withTrashed()->updateOrCreate(
            ['email' => 'test.driver@likhangkamay.local'],
            [
                'name' => 'Test Logistics Rider',
                'first_name' => 'Test',
                'last_name' => 'Driver',
                'password' => $passwordHash,
                'role' => 'staff',
                'seller_owner_id' => $artisan->id,
                'employee_id' => $driverEmployee->id,
                'staff_role_preset_key' => 'driver',
                'staff_module_permissions' => ['workspace_access' => true, 'deliveries' => 'edit'],
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        $this->command?->info('E2E Test Personas successfully seeded (all flagged is_test=true):');
        $this->command?->info('- Admin:   test.admin@likhangkamay.local');
        $this->command?->info('- Artisan: test.artisan@likhangkamay.local');
        $this->command?->info('- Buyer:   test.buyer@likhangkamay.local');
        $this->command?->info('- Staff:   test.staff@likhangkamay.local');
        $this->command?->info('- Driver:  test.driver@likhangkamay.local');
    }
}
