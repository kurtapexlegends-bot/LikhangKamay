<?php

namespace Tests\Feature\Staff;

use App\Mail\StaffClockInOtpMail;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\StaffAttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaffClockInOtpTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => ['hr' => true, 'procurement' => true],
        ]);

        $this->staff = User::factory()->staff($this->owner)->create([
            'email' => 'artisanstaff@example.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'general_staff',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);
    }

    public function test_staff_can_request_clock_in_otp(): void
    {
        Mail::fake();

        $response = $this->actingAs($this->staff)->postJson(route('staff.attendance.otp'));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'masked_email' => 'ar*********f@example.com',
                'expires_in_minutes' => 10,
                'cooldown_seconds' => 60,
            ]);

        Mail::assertSent(StaffClockInOtpMail::class, function ($mail) {
            return $mail->hasTo('artisanstaff@example.com')
                && strlen($mail->code) === 6;
        });

        $cachedOtp = Cache::get('staff_clockin_otp:' . $this->staff->id);
        $this->assertNotNull($cachedOtp);
        $this->assertEquals('artisanstaff@example.com', $cachedOtp['email']);
        $this->assertEquals(6, strlen($cachedOtp['code']));
    }

    public function test_staff_cannot_request_otp_during_cooldown(): void
    {
        Mail::fake();

        // First request succeeds
        $this->actingAs($this->staff)->postJson(route('staff.attendance.otp'))->assertOk();

        // Immediate second request triggers cooldown validation error
        $secondResponse = $this->actingAs($this->staff)->postJson(route('staff.attendance.otp'));
        $secondResponse->assertStatus(422)
            ->assertJsonValidationErrors(['otp']);
    }

    public function test_staff_can_clock_in_with_valid_otp(): void
    {
        // Preset OTP in Cache
        $otp = '582910';
        Cache::put('staff_clockin_otp:' . $this->staff->id, [
            'code' => $otp,
            'email' => $this->staff->email,
            'created_at' => now()->timestamp,
        ], now()->addMinutes(10));

        $response = $this->actingAs($this->staff)->post(route('staff.attendance.resume'), [
            'otp_code' => $otp,
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertRedirect(route('staff.dashboard'));

        $this->assertDatabaseHas('staff_attendance_sessions', [
            'staff_user_id' => $this->staff->id,
            'seller_owner_id' => $this->owner->id,
            'clock_out_at' => null,
        ]);

        // Verify OTP is consumed and deleted
        $this->assertNull(Cache::get('staff_clockin_otp:' . $this->staff->id));
    }

    public function test_staff_cannot_clock_in_with_invalid_otp(): void
    {
        // Preset OTP in Cache
        Cache::put('staff_clockin_otp:' . $this->staff->id, [
            'code' => '999999',
            'email' => $this->staff->email,
            'created_at' => now()->timestamp,
        ], now()->addMinutes(10));

        $response = $this->actingAs($this->staff)->post(route('staff.attendance.resume'), [
            'otp_code' => '123456',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertSessionHasErrors(['otp_code']);
        $this->assertDatabaseCount('staff_attendance_sessions', 0);
    }

    public function test_staff_cannot_clock_in_with_expired_otp(): void
    {
        // No cache entry exists (expired)
        $response = $this->actingAs($this->staff)->post(route('staff.attendance.resume'), [
            'otp_code' => '582910',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertSessionHasErrors(['otp_code']);
        $this->assertDatabaseCount('staff_attendance_sessions', 0);
    }
}
