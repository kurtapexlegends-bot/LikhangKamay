<?php

namespace Tests\Feature\Staff;

use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\Logistics\InHouseDispatchService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DriverDeliveryAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $premiumSeller;
    private User $driverUser;
    private Employee $driverEmployee;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Mail::fake();

        $this->premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'shop_name' => 'Artisan Leather Studio',
            'modules_enabled' => [
                'hr' => true,
                'accounting' => true,
                'procurement' => true,
            ],
        ]);

        $this->driverEmployee = Employee::create([
            'user_id' => $this->premiumSeller->id,
            'name' => 'Kuya Jomar',
            'role' => 'Logistics / Driver',
            'status' => 'Active',
            'salary' => 12000,
            'join_date' => now()->toDateString(),
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'MC-4567',
            'driver_license_number' => 'D02-12-345678',
            'delivery_compensation_type' => 'hybrid',
            'delivery_fee_rate' => 60.00,
        ]);

        $this->driverUser = User::factory()->staff($this->premiumSeller)->create([
            'name' => 'Kuya Jomar',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'employee_id' => $this->driverEmployee->id,
            'staff_role_preset_key' => 'driver',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);

        // Clock in the driver for today
        StaffAttendanceSession::create([
            'staff_user_id' => $this->driverUser->id,
            'seller_owner_id' => $this->premiumSeller->id,
            'employee_id' => $this->driverEmployee->id,
            'attendance_date' => Carbon::today(),
            'clock_in_at' => now()->subHours(2),
            'last_heartbeat_at' => now(),
            'worked_minutes' => 120,
        ]);
    }

    public function test_driver_cannot_access_store_order_manager(): void
    {
        // Driver tries to access the store order manager page
        $response = $this->actingAs($this->driverUser)->get(route('orders.index'));

        // Access should be forbidden because driver role preset does not grant orders module
        $response->assertForbidden();
    }

    public function test_driver_can_access_deliveries_console_with_vehicle_and_compensation_profile(): void
    {
        $response = $this->actingAs($this->driverUser)->get(route('staff.deliveries'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/DriverDeliveries')
                ->where('driverProfile.vehicle_type', 'Motorcycle')
                ->where('driverProfile.vehicle_plate_number', 'MC-4567')
                ->where('driverProfile.driver_license_number', 'D02-12-345678')
                ->where('driverProfile.compensation_type', 'hybrid')
                ->where('driverProfile.delivery_fee_rate', 60)
                ->where('driverProfile.today_completed_count', 0)
                ->where('driverProfile.today_drop_earnings', 0)
            );
    }

    public function test_driver_drop_earnings_tracked_after_completing_delivery(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $order = Order::create([
            'order_number' => 'ORD-DROP-101',
            'user_id' => $buyer->id,
            'artisan_id' => $this->premiumSeller->id,
            'customer_name' => $buyer->name,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'shipping_recipient_name' => 'Maria Clara',
            'shipping_contact_phone' => '09181112233',
            'shipping_address' => '123 Bonifacio St, Taguig',
            'total_amount' => 850.00,
            'payment_status' => 'paid',
            'payment_method' => 'gcash',
        ]);

        $dispatchService = app(InHouseDispatchService::class);
        $delivery = $dispatchService->dispatchOrderWithDriver(
            $order,
            $this->driverEmployee->id,
            $this->premiumSeller,
            'Deliver before 5 PM'
        );

        // Complete delivery
        $photo = UploadedFile::fake()->image('proof.jpg', 600, 600);
        $this->actingAs($this->driverUser)
            ->post(route('staff.deliveries.complete', $delivery->id), [
                'pod_photo' => $photo,
                'pod_notes' => 'Received by buyer.',
            ])
            ->assertSessionHas('success');

        // Check console reflects completed drop count and earnings
        $this->actingAs($this->driverUser)
            ->get(route('staff.deliveries'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/DriverDeliveries')
                ->where('driverProfile.today_completed_count', 1)
                ->where('driverProfile.today_drop_earnings', 60)
            );
    }

    public function test_driver_can_verify_vehicle_and_upload_license_photo(): void
    {
        $licensePhoto = UploadedFile::fake()->image('driver_license.jpg', 800, 600);

        $response = $this->actingAs($this->driverUser)
            ->post(route('staff.deliveries.verify-vehicle'), [
                'vehicle_type' => 'Motorcycle',
                'vehicle_plate_number' => 'xyz 9876',
                'driver_license_number' => 'n01-22-987654',
                'driver_license_photo' => $licensePhoto,
            ]);

        $response->assertSessionHas('success');

        $this->driverEmployee->refresh();
        $this->assertSame('XYZ 9876', $this->driverEmployee->vehicle_plate_number);
        $this->assertSame('N01-22-987654', $this->driverEmployee->driver_license_number);
        $this->assertNotNull($this->driverEmployee->driver_license_photo_path);
        Storage::disk('public')->assertExists($this->driverEmployee->driver_license_photo_path);

        // Verify driver profile console reflects verification status
        $this->actingAs($this->driverUser)
            ->get(route('staff.deliveries'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/DriverDeliveries')
                ->where('driverProfile.is_vehicle_verified', true)
                ->where('driverProfile.vehicle_plate_number', 'XYZ 9876')
                ->where('driverProfile.driver_license_number', 'N01-22-987654')
                ->has('driverProfile.driver_license_photo_url')
            );
    }

    public function test_driver_vehicle_verification_validates_required_fields(): void
    {
        $response = $this->actingAs($this->driverUser)
            ->post(route('staff.deliveries.verify-vehicle'), [
                'vehicle_type' => 'InvalidType',
                'vehicle_plate_number' => '',
                'driver_license_number' => '',
            ]);

        $response->assertSessionHasErrors([
            'vehicle_type',
            'vehicle_plate_number',
            'driver_license_number',
            'driver_license_photo',
        ]);
    }
}
