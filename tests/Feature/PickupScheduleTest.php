<?php

namespace Tests\Feature;

use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerLocation;
use App\Models\SellerPickupSchedule;
use App\Models\User;
use App\Services\PickupScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PickupScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private User $buyer;
    private PickupScheduleService $pickupService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pickupService = app(PickupScheduleService::class);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Bulacan Heritage Clay',
            'street_address' => '123 Pottery Lane',
            'city' => 'San Jose del Monte',
            'barangay' => 'Graceville',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Clara',
            'email' => 'maria@example.com',
            'phone_number' => '09171234567',
        ]);
    }

    public function test_artisan_gets_default_pickup_schedule(): void
    {
        $schedule = $this->artisan->getPickupSchedule();

        $this->assertInstanceOf(SellerPickupSchedule::class, $schedule);
        $this->assertTrue($schedule->is_enabled);
        $this->assertEquals([1, 2, 3, 4, 5, 6], $schedule->getEffectiveOperatingDays());
        $this->assertCount(2, $schedule->getEffectiveTimeSlots());
    }

    public function test_artisan_can_update_pickup_schedule(): void
    {
        $newSlots = [
            [
                'id' => 'slot_custom_1',
                'start_time' => '10:00',
                'end_time' => '14:00',
                'max_capacity' => 8,
                'label' => '10:00 AM - 02:00 PM',
            ],
        ];

        $response = $this->actingAs($this->artisan)->post(route('shop.settings.pickup-schedule'), [
            'is_enabled' => true,
            'operating_days' => [1, 3, 5], // Mon, Wed, Fri
            'time_slots' => $newSlots,
            'pickup_location_id' => null,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $schedule = $this->artisan->getPickupSchedule()->fresh();
        $this->assertEquals([1, 3, 5], $schedule->operating_days);
        $this->assertEquals($newSlots, $schedule->time_slots);
    }

    public function test_lead_time_calculation_skips_closed_operating_days(): void
    {
        // Artisan open Mon-Fri (1-5)
        $schedule = $this->artisan->getPickupSchedule();
        $schedule->update(['operating_days' => [1, 2, 3, 4, 5]]);

        // Base date: Friday
        $friday = Carbon::parse('2026-10-09'); // Friday
        $earliest = $this->pickupService->calculateEarliestPickupDate($this->artisan, 2, $friday);

        // Advancing 2 business days from Friday skips Sat (6) and Sun (7) -> Tuesday (Oct 13)
        $this->assertEquals('2026-10-13', $earliest->toDateString());
    }

    public function test_pin_generation_and_verification(): void
    {
        $pin = $this->pickupService->generatePickupPin();
        $this->assertEquals(4, strlen($pin));
        $this->assertTrue(ctype_digit($pin));

        $order = new Order(['pickup_pin' => $pin]);

        $this->assertTrue($this->pickupService->verifyPickupPin($order, $pin));
        $this->assertFalse($this->pickupService->verifyPickupPin($order, '0000'));
    }

    public function test_checkout_validation_rejects_dates_before_lead_time_and_accepts_valid_slots(): void
    {
        $product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'stock' => 10,
            'price' => 250,
            'sku' => 'POT-001',
            'name' => 'Handmade Clay Pot',
            'category' => 'Pottery',
            'lead_time' => 3,
        ]);

        // 1. Attempting to pick up yesterday or today should fail due to lead_time = 3
        $invalidResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Pick Up',
            'pickup_date' => now()->toDateString(),
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'payment_method' => 'COD',
            'total' => 250,
        ]);

        $invalidResponse->assertSessionHasErrors(['pickup_time_slot']);

        // 2. Valid pickup date calculated by service should succeed and store pickup details
        $service = app(PickupScheduleService::class);
        $earliest = $service->calculateEarliestPickupDate($this->artisan, 3);

        $validResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Pick Up',
            'pickup_date' => $earliest->format('Y-m-d'),
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'payment_method' => 'COD',
            'total' => 250,
        ]);

        $validResponse->assertRedirect(route('my-orders.index'));

        $order = Order::where('user_id', $this->buyer->id)->latest()->first();
        $this->assertNotNull($order);
        $this->assertSame($earliest->format('Y-m-d'), $order->pickup_date->format('Y-m-d'));
        $this->assertSame('09:00 AM - 12:00 PM', $order->pickup_time_slot);
        $this->assertNotNull($order->pickup_pin);
        $this->assertSame(4, strlen($order->pickup_pin));
    }

    public function test_update_order_status_verifies_pickup_pin_on_delivery(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TEST1234',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'status' => 'Ready for Pickup',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Studio Workshop',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'pickup_date' => now()->toDateString(),
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'pickup_pin' => '7391',
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'shipping_fee_amount' => 0,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
            'total_amount' => 515,
        ]);

        $action = app(UpdateOrderStatus::class);

        // Case 1: Wrong PIN throws exception
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid 4-digit pickup PIN');

        $action->execute($order, [
            'status' => 'Delivered',
            'pickup_pin' => '9999', // Wrong
        ], $this->artisan, null);
    }

    public function test_update_order_status_succeeds_with_correct_pin_and_marks_cod_paid(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TEST5678',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'status' => 'Ready for Pickup',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Studio Workshop',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'pickup_date' => now()->toDateString(),
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'pickup_pin' => '4829',
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'shipping_fee_amount' => 0,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
            'total_amount' => 515,
        ]);

        $action = app(UpdateOrderStatus::class);

        $action->execute($order, [
            'status' => 'Delivered',
            'pickup_pin' => '4829', // Correct PIN
        ], $this->artisan, null);

        $order->refresh();
        $this->assertEquals('Delivered', $order->status);
        $this->assertEquals('paid', $order->payment_status);
        $this->assertNotNull($order->delivered_at);
    }

    public function test_artisan_can_update_max_advance_days_and_service_respects_it(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('shop.settings.pickup-schedule'), [
            'is_enabled' => true,
            'operating_days' => [1, 2, 3, 4, 5, 6],
            'time_slots' => [
                ['id' => 'slot_1', 'start_time' => '09:00', 'end_time' => '12:00', 'max_capacity' => 5, 'label' => '09:00 AM - 12:00 PM'],
            ],
            'pickup_location_id' => null,
            'max_advance_days' => 60,
        ]);

        $response->assertRedirect();
        $this->assertEquals(60, $this->artisan->getPickupSchedule()->max_advance_days);

        $overview = $this->pickupService->getScheduleOverviewForBuyer($this->artisan);
        $this->assertCount(60, $overview['days']);

        // Check that slot validation rejects date beyond 60 days
        $farFuture = Carbon::now('Asia/Manila')->addDays(65)->toDateString();
        $validation = $this->pickupService->validateSlotSelection($this->artisan, $farFuture, '09:00 AM - 12:00 PM');
        $this->assertFalse($validation['valid']);
        $this->assertStringContainsString('The latest available pickup date you can book is', $validation['error']);
    }

    public function test_cancelled_pickup_order_frees_up_slot_for_another_buyer(): void
    {
        $targetDate = Carbon::now('Asia/Manila')->addDays(2);
        while (!in_array($targetDate->dayOfWeekIso, [1, 2, 3, 4, 5, 6], true)) {
            $targetDate->addDay();
        }

        $order = Order::create([
            'order_number' => 'ORD-PICKUP-CANCEL',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'status' => 'Pending',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Studio Workshop',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'pickup_date' => $targetDate->toDateString(),
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'pickup_pin' => '1122',
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 15,
            'shipping_fee_amount' => 0,
            'platform_commission_amount' => 15,
            'seller_net_amount' => 285,
            'total_amount' => 315,
        ]);

        $slotsBeforeCancel = $this->pickupService->getAvailableSlotsForDate($this->artisan, $targetDate);
        $firstSlotBefore = collect($slotsBeforeCancel)->firstWhere('label', '09:00 AM - 12:00 PM');
        $this->assertEquals(1, $firstSlotBefore['booked_count']);
        $this->assertEquals(4, $firstSlotBefore['remaining_capacity']); // Default capacity is 5

        // Cancel order
        $order->update([
            'status' => 'Cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'reschedule_pickup: Need to change pickup schedule',
        ]);

        $slotsAfterCancel = $this->pickupService->getAvailableSlotsForDate($this->artisan, $targetDate);
        $firstSlotAfter = collect($slotsAfterCancel)->firstWhere('label', '09:00 AM - 12:00 PM');
        $this->assertEquals(0, $firstSlotAfter['booked_count']);
        $this->assertEquals(5, $firstSlotAfter['remaining_capacity']);
        $this->assertTrue($firstSlotAfter['is_available']);
    }
}
