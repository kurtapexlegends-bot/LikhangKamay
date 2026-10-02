<?php

namespace Tests\Feature;

use App\Models\SellerPickupSchedule;
use App\Models\User;
use App\Services\PickupScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PickupDailyScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private PickupScheduleService $pickupService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pickupService = app(PickupScheduleService::class);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Bulacan Heritage Clay',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);
    }

    public function test_artisan_can_save_per_day_pickup_schedule(): void
    {
        $dailySlots = [
            '1' => [
                'is_open' => true,
                'slots' => [
                    ['id' => 'mon_1', 'start_time' => '09:00', 'end_time' => '12:00', 'max_capacity' => 5, 'label' => '09:00 AM - 12:00 PM'],
                    ['id' => 'mon_2', 'start_time' => '13:00', 'end_time' => '17:00', 'max_capacity' => 5, 'label' => '01:00 PM - 05:00 PM'],
                ],
            ],
            '6' => [
                'is_open' => true,
                'slots' => [
                    ['id' => 'sat_1', 'start_time' => '10:00', 'end_time' => '14:00', 'max_capacity' => 8, 'label' => '10:00 AM - 02:00 PM'],
                ],
            ],
            '7' => [
                'is_open' => false,
                'slots' => [],
            ],
        ];

        $response = $this->actingAs($this->artisan)->post(route('shop.settings.pickup-schedule'), [
            'is_enabled' => true,
            'schedule_mode' => 'per_day',
            'operating_days' => [1, 6],
            'time_slots' => [
                ['id' => 'slot_def', 'start_time' => '09:00', 'end_time' => '17:00', 'max_capacity' => 5, 'label' => '09:00 AM - 05:00 PM'],
            ],
            'daily_time_slots' => $dailySlots,
            'max_advance_days' => 30,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $schedule = SellerPickupSchedule::where('user_id', $this->artisan->id)->first();
        $this->assertNotNull($schedule);
        $this->assertEquals('per_day', $schedule->schedule_mode);
        $this->assertTrue($schedule->isPerDayMode());
        $this->assertEquals([1, 6], $schedule->getEffectiveOperatingDays());

        // Check Monday slots
        $monSlots = $schedule->getEffectiveTimeSlotsForDay(1);
        $this->assertCount(2, $monSlots);
        $this->assertEquals('09:00', $monSlots[0]['start_time']);

        // Check Saturday slots
        $satSlots = $schedule->getEffectiveTimeSlotsForDay(6);
        $this->assertCount(1, $satSlots);
        $this->assertEquals('10:00', $satSlots[0]['start_time']);
        $this->assertEquals('14:00', $satSlots[0]['end_time']);

        // Check Sunday is closed
        $this->assertFalse($schedule->isOperatingOnDay(7));
        $this->assertEmpty($schedule->getEffectiveTimeSlotsForDay(7));
    }

    public function test_pickup_schedule_service_resolves_slots_for_specific_dates(): void
    {
        $schedule = SellerPickupSchedule::create([
            'user_id' => $this->artisan->id,
            'is_enabled' => true,
            'schedule_mode' => 'per_day',
            'operating_days' => [1, 6],
            'time_slots' => [
                ['id' => 'def', 'start_time' => '08:00', 'end_time' => '17:00', 'max_capacity' => 3, 'label' => '08:00 AM - 05:00 PM'],
            ],
            'daily_time_slots' => [
                '1' => [
                    'is_open' => true,
                    'slots' => [
                        ['id' => 'mon_1', 'start_time' => '09:00', 'end_time' => '12:00', 'max_capacity' => 4, 'label' => '09:00 AM - 12:00 PM'],
                    ],
                ],
                '6' => [
                    'is_open' => true,
                    'slots' => [
                        ['id' => 'sat_1', 'start_time' => '10:00', 'end_time' => '14:00', 'max_capacity' => 6, 'label' => '10:00 AM - 02:00 PM'],
                    ],
                ],
                '7' => [
                    'is_open' => false,
                    'slots' => [],
                ],
            ],
            'max_advance_days' => 30,
        ]);

        // Find a future Monday and Saturday
        $nextMonday = Carbon::now()->next(Carbon::MONDAY)->toDateString();
        $nextSaturday = Carbon::now()->next(Carbon::SATURDAY)->toDateString();
        $nextSunday = Carbon::now()->next(Carbon::SUNDAY)->toDateString();

        $monSlots = $this->pickupService->getAvailableSlotsForDate($this->artisan, $nextMonday);
        $this->assertCount(1, $monSlots);
        $this->assertEquals('09:00 AM - 12:00 PM', $monSlots[0]['label']);

        $satSlots = $this->pickupService->getAvailableSlotsForDate($this->artisan, $nextSaturday);
        $this->assertCount(1, $satSlots);
        $this->assertEquals('10:00 AM - 02:00 PM', $satSlots[0]['label']);

        $sunSlots = $this->pickupService->getAvailableSlotsForDate($this->artisan, $nextSunday);
        $this->assertEmpty($sunSlots);
    }
}
