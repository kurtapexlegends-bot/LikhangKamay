<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\PickupScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiWorkshopPickupCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $artisan1;
    private User $artisan2;
    private Product $product1;
    private Product $product2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Test Buyer',
            'phone_number' => '09171234567',
        ]);

        $this->artisan1 = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => "Kurt's Artisan Studio",
            'city' => 'Dasmariñas City',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->artisan2 = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => "Vigan Heritage Pottery",
            'city' => 'Vigan City',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->product1 = Product::factory()->create([
            'user_id' => $this->artisan1->id,
            'name' => 'Clay Mug',
            'sku' => 'MUG-001',
            'category' => 'Pottery',
            'price' => 300,
            'stock' => 10,
            'lead_time' => 0,
        ]);

        $this->product2 = Product::factory()->create([
            'user_id' => $this->artisan2->id,
            'name' => 'Ribbed Vase',
            'sku' => 'VASE-002',
            'category' => 'Pottery',
            'price' => 500,
            'stock' => 10,
            'lead_time' => 2,
        ]);
    }

    public function test_multi_workshop_pickup_checkout_creates_individual_scheduled_orders(): void
    {
        $pickupService = app(PickupScheduleService::class);
        $earliest1 = $pickupService->calculateEarliestPickupDate($this->artisan1, 0);
        $earliest2 = $pickupService->calculateEarliestPickupDate($this->artisan2, 2);

        $slots1 = $pickupService->getAvailableSlotsForDate($this->artisan1, $earliest1);
        $slot1Label = collect($slots1)->firstWhere('is_available', true)['label'] ?? '09:00 AM - 12:00 PM';

        $slots2 = $pickupService->getAvailableSlotsForDate($this->artisan2, $earliest2);
        $slot2Label = collect($slots2)->firstWhere('is_available', true)['label'] ?? '01:00 PM - 05:00 PM';

        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 800,
            'items' => [
                [
                    'id' => $this->product1->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                    'artisan_id' => $this->artisan1->id,
                ],
                [
                    'id' => $this->product2->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                    'artisan_id' => $this->artisan2->id,
                ],
            ],
            'pickup_schedules' => [
                (string) $this->artisan1->id => [
                    'date' => $earliest1->toDateString(),
                    'slot' => $slot1Label,
                ],
                (string) $this->artisan2->id => [
                    'date' => $earliest2->toDateString(),
                    'slot' => $slot2Label,
                ],
            ],
        ]);

        $response->assertRedirect(route('my-orders.index'));

        $order1 = Order::where('artisan_id', $this->artisan1->id)->where('user_id', $this->buyer->id)->first();
        $order2 = Order::where('artisan_id', $this->artisan2->id)->where('user_id', $this->buyer->id)->first();

        $this->assertNotNull($order1);
        $this->assertNotNull($order2);

        $this->assertEquals($earliest1->toDateString(), $order1->pickup_date->toDateString());
        $this->assertEquals($slot1Label, $order1->pickup_time_slot);
        $this->assertNotEmpty($order1->pickup_pin);

        $this->assertEquals($earliest2->toDateString(), $order2->pickup_date->toDateString());
        $this->assertEquals($slot2Label, $order2->pickup_time_slot);
        $this->assertNotEmpty($order2->pickup_pin);
    }

    public function test_multi_workshop_pickup_rejects_past_or_unprepared_date_for_specific_artisan(): void
    {
        $pickupService = app(PickupScheduleService::class);
        $earliest1 = $pickupService->calculateEarliestPickupDate($this->artisan1, 0);
        $slots1 = $pickupService->getAvailableSlotsForDate($this->artisan1, $earliest1);
        $slot1Label = collect($slots1)->firstWhere('is_available', true)['label'] ?? '09:00 AM - 12:00 PM';

        // Attempting to schedule artisan2 (lead_time = 2) for today (before earliest date) should fail
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 800,
            'items' => [
                [
                    'id' => $this->product1->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                    'artisan_id' => $this->artisan1->id,
                ],
                [
                    'id' => $this->product2->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                    'artisan_id' => $this->artisan2->id,
                ],
            ],
            'pickup_schedules' => [
                (string) $this->artisan1->id => [
                    'date' => $earliest1->toDateString(),
                    'slot' => $slot1Label,
                ],
                (string) $this->artisan2->id => [
                    'date' => Carbon::today()->toDateString(), // Too early! lead_time = 2
                    'slot' => '09:00 AM - 12:00 PM',
                ],
            ],
        ]);

        $response->assertSessionHasErrors(['pickup_schedules.' . $this->artisan2->id]);
    }
}
