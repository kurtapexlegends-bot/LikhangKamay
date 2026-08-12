<?php

namespace Tests\Feature\Security;

use App\Models\SellerLocation;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SingleDeviceSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_logging_in_on_new_device_invalidates_previous_session(): void
    {
        $user = User::factory()->artisanApproved()->create([
            'email' => 'artisan@test.com',
            'password' => bcrypt('password123'),
        ]);

        // Device 1 login
        $this->post('/login', [
            'email' => 'artisan@test.com',
            'password' => 'password123',
        ])->assertRedirect();

        $session1Id = $user->fresh()->current_session_id;
        $this->assertNotNull($session1Id);

        // Device 2 takeover simulation: user's current_session_id is updated to new device session ID
        $user->update(['current_session_id' => 'device-2-session-id']);

        // Device 1 attempts to access workspace with old session ID: middleware intercepts and returns 423
        $response = $this->actingAs($user)->getJson('/staff/dashboard');
        $response->assertStatus(423);
    }

    public function test_workplace_daily_pin_clock_in_validation(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $location = SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Main Workshop',
            'address' => '123 Main St',
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius_meters' => 200,
            'daily_workplace_pin' => '5432',
            'daily_pin_updated_at' => now(),
            'is_active' => true,
        ]);

        // Invalid PIN should fail
        $response = $this->actingAs($staff)->post('/staff/attendance/resume', [
            'workplace_pin' => '9999',
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);

        $response->assertSessionHasErrors('workplace_pin');

        // Valid PIN should succeed
        $validResponse = $this->actingAs($staff)->post('/staff/attendance/resume', [
            'workplace_pin' => '5432',
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);

        $validResponse->assertRedirect();
    }
}
