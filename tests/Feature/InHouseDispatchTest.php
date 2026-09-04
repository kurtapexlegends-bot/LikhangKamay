<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\Logistics\InHouseDispatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class InHouseDispatchTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $premiumSeller;
    private User $freeSeller;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Mail::fake();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Santos',
            'phone_number' => '09171234567',
            'email_verified_at' => now(),
        ]);

        $this->premiumSeller = User::factory()->artisanApproved()->create([
            'name' => 'Master Potter Artisan',
            'shop_name' => 'Teresa Craft Studio',
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addMonth(),
        ]);

        $this->freeSeller = User::factory()->artisanApproved()->create([
            'name' => 'Solo Clay Artisan',
            'premium_tier' => 'free',
            'subscription_expires_at' => null,
        ]);

        $this->product = Product::create([
            'user_id' => $this->premiumSeller->id,
            'artisan_id' => $this->premiumSeller->id,
            'name' => 'Terracotta Handcrafted Mug',
            'sku' => 'THM-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 350.00,
            'cost_price' => 100.00,
            'stock' => 20,
            'lead_time' => '1 day',
        ]);
    }

    private function createDriver(User $seller, array $attributes = []): Employee
    {
        return Employee::create(array_merge([
            'user_id' => $seller->id,
            'name' => 'Driver Staff',
            'role' => 'Logistics / Driver',
            'status' => 'Active',
            'salary' => 15000,
            'join_date' => '2026-01-01',
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'MC-1234',
        ], $attributes));
    }

    private function createOrder(User $seller, array $attributes = []): Order
    {
        return Order::create(array_merge([
            'order_number' => 'ORD-' . strtoupper(Str::random(8)),
            'user_id' => $this->buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $this->buyer->name,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'shipping_recipient_name' => 'Maria Santos',
            'shipping_contact_phone' => '09171234567',
            'shipping_address' => '742 Evergreen St, Manila',
            'total_amount' => 500.00,
            'payment_status' => 'paid',
            'payment_method' => 'gcash',
        ], $attributes));
    }

    public function test_free_tier_seller_cannot_dispatch_in_house(): void
    {
        $driver = $this->createDriver($this->freeSeller, [
            'name' => 'Rider John',
            'vehicle_plate_number' => 'AB-1234',
        ]);

        $order = $this->createOrder($this->freeSeller, [
            'order_number' => 'ORD-FREE-001',
            'shipping_address' => '123 Rizal Ave, Manila',
            'total_amount' => 350.00,
        ]);

        $response = $this->actingAs($this->freeSeller)->post(route('orders.dispatch-in-house', $order->order_number), [
            'employee_id' => $driver->id,
            'dispatch_notes' => 'Deliver before 5pm',
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('order_deliveries', [
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
        ]);
    }

    public function test_premium_artisan_can_fetch_drivers_with_live_attendance_availability(): void
    {
        // Driver 1: Has linked user account and clocked in today -> Available
        $driverUser1 = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => $this->premiumSeller->id,
            'email_verified_at' => now(),
            'phone_number' => '09181112222',
        ]);

        $driver1 = $this->createDriver($this->premiumSeller, [
            'employee_id' => 'EMP-DRV-01',
            'name' => 'Carlo Driver',
            'vehicle_plate_number' => 'MC-9876',
        ]);
        $driverUser1->update(['employee_id' => $driver1->id]);

        StaffAttendanceSession::create([
            'staff_user_id' => $driverUser1->id,
            'seller_owner_id' => $this->premiumSeller->id,
            'employee_id' => $driver1->id,
            'attendance_date' => Carbon::today(),
            'clock_in_at' => now()->subHours(2),
            'clock_out_at' => null, // open session!
        ]);

        // Driver 2: Not clocked in -> Off Duty
        $driver2 = $this->createDriver($this->premiumSeller, [
            'employee_id' => 'EMP-DRV-02',
            'name' => 'Bob Van Driver',
            'vehicle_type' => 'Van',
            'vehicle_plate_number' => 'VAN-5432',
        ]);

        $response = $this->actingAs($this->premiumSeller)->getJson(route('orders.dispatch.drivers'));

        $response->assertStatus(200);
        $response->assertJson([
            'is_premium' => true,
        ]);

        $drivers = $response->json('drivers');
        $this->assertCount(2, $drivers);

        $driver1Data = collect($drivers)->firstWhere('id', $driver1->id);
        $driver2Data = collect($drivers)->firstWhere('id', $driver2->id);

        $this->assertEquals('available', $driver1Data['status']);
        $this->assertEquals('Available', $driver1Data['status_label']);
        $this->assertTrue($driver1Data['is_clocked_in']);

        $this->assertEquals('off_duty', $driver2Data['status']);
        $this->assertEquals('Off Duty', $driver2Data['status_label']);
        $this->assertFalse($driver2Data['is_clocked_in']);
    }

    public function test_driver_status_transitions_to_on_delivery_when_order_dispatched(): void
    {
        $driverUser = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => $this->premiumSeller->id,
            'email_verified_at' => now(),
            'phone_number' => '09170001111',
        ]);

        $driver = $this->createDriver($this->premiumSeller, [
            'name' => 'Kuya Mark Rider',
            'role' => 'Logistics / Driver',
            'status' => 'Active',
            'salary' => 15000,
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'MTO-4455',
        ]);
        $driverUser->update(['employee_id' => $driver->id]);

        StaffAttendanceSession::create([
            'staff_user_id' => $driverUser->id,
            'seller_owner_id' => $this->premiumSeller->id,
            'employee_id' => $driver->id,
            'attendance_date' => Carbon::today(),
            'clock_in_at' => now()->subHour(),
            'clock_out_at' => null,
        ]);

        $order = $this->createOrder($this->premiumSeller, [
            'order_number' => 'ORD-PREM-001',
            'shipping_address' => '742 Evergreen St, Quezon City',
            'total_amount' => 700.00,
            'payment_method' => 'card',
        ]);

        $response = $this->actingAs($this->premiumSeller)->post(route('orders.dispatch-in-house', $order->order_number), [
            'employee_id' => $driver->id,
            'dispatch_notes' => 'Fragile pottery. Handle with care.',
        ]);

        $response->assertSessionHas('success');

        // Order updated to Shipped
        $order->refresh();
        $this->assertEquals('Shipped', $order->status);
        $this->assertNotNull($order->shipped_at);
        $this->assertEquals('LK-INHOUSE-ORD-PREM-001', $order->tracking_number);

        // Order delivery created
        $delivery = OrderDelivery::where('order_id', $order->id)->first();
        $this->assertNotNull($delivery);
        $this->assertEquals(OrderDelivery::PROVIDER_IN_HOUSE, $delivery->provider);
        $this->assertEquals(OrderDelivery::STATUS_ON_GOING, $delivery->status);
        $this->assertEquals($driver->id, $delivery->driver_employee_id);
        $this->assertEquals($driverUser->id, $delivery->driver_user_id);
        $this->assertEquals('Fragile pottery. Handle with care.', $delivery->dispatch_notes);

        // Check availability: driver status is now on_delivery!
        $service = app(InHouseDispatchService::class);
        $driversWithAvail = $service->getDriversWithLiveAvailability($this->premiumSeller);
        $driverData = collect($driversWithAvail)->firstWhere('id', $driver->id);

        $this->assertEquals('on_delivery', $driverData['status']);
        $this->assertEquals(1, $driverData['active_deliveries_count']);
    }

    public function test_driver_can_view_deliveries_and_complete_with_proof_of_delivery(): void
    {
        $driverUser = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => $this->premiumSeller->id,
            'email_verified_at' => now(),
            'phone_number' => '09201234567',
        ]);

        $driver = $this->createDriver($this->premiumSeller, [
            'name' => 'Kuya Dennis',
            'role' => 'Logistics / Driver',
            'status' => 'Active',
            'salary' => 15000,
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'DEN-999',
        ]);
        $driverUser->update(['employee_id' => $driver->id]);

        StaffAttendanceSession::create([
            'staff_user_id' => $driverUser->id,
            'seller_owner_id' => $this->premiumSeller->id,
            'employee_id' => $driver->id,
            'attendance_date' => Carbon::today(),
            'clock_in_at' => now()->subMinutes(30),
            'clock_out_at' => null,
        ]);

        $order = $this->createOrder($this->premiumSeller, [
            'order_number' => 'ORD-DELIV-002',
            'shipping_address' => 'Unit 4B Acacia Tower, Makati City',
            'total_amount' => 500.00,
        ]);

        $service = app(InHouseDispatchService::class);
        $delivery = $service->dispatchOrderWithDriver($order, $driver->id, $this->premiumSeller, 'Ring buzzer 4B');

        // Driver accesses /staff/deliveries console
        $consoleResponse = $this->actingAs($driverUser)->get(route('staff.deliveries'));
        $consoleResponse->assertStatus(200);

        // Driver completes delivery with POD photo
        $fakePhoto = UploadedFile::fake()->image('pod_doorstep.jpg', 600, 600);

        $completeResponse = $this->actingAs($driverUser)->post(route('staff.deliveries.complete', $delivery->id), [
            'pod_photo' => $fakePhoto,
            'pod_notes' => 'Handed over directly to buyer. Parcel intact.',
        ]);

        $completeResponse->assertSessionHas('success');

        $delivery->refresh();
        $this->assertEquals(OrderDelivery::STATUS_COMPLETED, $delivery->status);
        $this->assertNotNull($delivery->delivered_at);
        $this->assertNotNull($delivery->pod_photo_path);
        $this->assertEquals('Handed over directly to buyer. Parcel intact.', $delivery->pod_notes);

        $order->refresh();
        $this->assertEquals('Delivered', $order->status);
        $this->assertNotNull($order->delivered_at);

        // Driver availability returns to Available
        $driversWithAvail = $service->getDriversWithLiveAvailability($this->premiumSeller);
        $driverData = collect($driversWithAvail)->firstWhere('id', $driver->id);
        $this->assertEquals('available', $driverData['status']);
        $this->assertEquals(0, $driverData['active_deliveries_count']);
    }

    public function test_bulk_dispatch_in_house(): void
    {
        $driver = $this->createDriver($this->premiumSeller, [
            'name' => 'Bulk Runner',
            'role' => 'Logistics / Driver',
            'status' => 'Active',
            'salary' => 18000,
            'vehicle_type' => 'Van',
            'vehicle_plate_number' => 'BLK-888',
        ]);

        $order1 = $this->createOrder($this->premiumSeller, [
            'order_number' => 'ORD-BLK-001',
            'shipping_address' => 'Pasig City',
            'total_amount' => 1000.00,
            'payment_method' => 'card',
        ]);

        $order2 = $this->createOrder($this->premiumSeller, [
            'order_number' => 'ORD-BLK-002',
            'status' => 'Processing',
            'shipping_address' => 'Taguig City',
            'total_amount' => 1200.00,
            'payment_method' => 'card',
        ]);

        $response = $this->actingAs($this->premiumSeller)->post(route('orders.bulk-dispatch-in-house'), [
            'order_ids' => [$order1->order_number, $order2->order_number],
            'employee_id' => $driver->id,
            'dispatch_notes' => 'Batch studio run',
        ]);

        $response->assertSessionHas('success');

        $order1->refresh();
        $order2->refresh();

        $this->assertEquals('Shipped', $order1->status);
        $this->assertEquals('Shipped', $order2->status);

        $this->assertDatabaseHas('order_deliveries', [
            'order_id' => $order1->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'driver_employee_id' => $driver->id,
        ]);
        $this->assertDatabaseHas('order_deliveries', [
            'order_id' => $order2->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'driver_employee_id' => $driver->id,
        ]);
    }
}
