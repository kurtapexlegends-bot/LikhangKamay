<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftPolicySettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_update_shift_schedule_and_break_policies(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => ['hr' => true],
        ]);

        $response = $this->actingAs($seller)->post(route('hr.settings'), [
            'payroll_factor_method' => 'custom',
            'payroll_working_days' => 22,
            'standard_workday_hours' => 8.0,
            'overtime_multiplier' => 1.25,
            'rest_day_ot_multiplier' => 1.69,
            'holiday_ot_multiplier' => 2.60,
            'shift_start_time' => '09:00',
            'shift_end_time' => '18:00',
            'grace_period_minutes' => 20,
            'break_window_start' => '12:00',
            'break_window_end' => '14:00',
            'break_allowance_minutes' => 45,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'People & Payroll settings updated successfully.');

        $seller->refresh();
        $this->assertSame('09:00', $seller->shift_start_time);
        $this->assertSame('18:00', $seller->shift_end_time);
        $this->assertSame(20, $seller->grace_period_minutes);
        $this->assertSame('12:00', $seller->break_window_start);
        $this->assertSame('14:00', $seller->break_window_end);
        $this->assertSame(45, $seller->break_allowance_minutes);
    }

    public function test_shift_policies_are_validated_strictly(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => ['hr' => true],
        ]);

        $response = $this->actingAs($seller)->post(route('hr.settings'), [
            'payroll_factor_method' => 'custom',
            'payroll_working_days' => 22,
            'standard_workday_hours' => 8.0,
            'shift_start_time' => 'invalid-time',
            'grace_period_minutes' => 500, // exceeds max 120
            'break_allowance_minutes' => 300, // exceeds max 180
        ]);

        $response->assertSessionHasErrors(['shift_start_time', 'grace_period_minutes', 'break_allowance_minutes']);
    }
}
