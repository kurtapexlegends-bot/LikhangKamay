<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffAccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_staff_is_redirected_to_verification_notice_after_login(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->unverified()->create([
            'must_change_password' => true,
        ]);

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($staff);
        $response->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_verified_staff_with_default_password_is_redirected_to_forced_password_screen_after_login(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'must_change_password' => true,
        ]);

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($staff);
        $response->assertRedirect(route('staff.password.edit', absolute: false));
    }

    public function test_verified_staff_is_redirected_to_staff_dashboard_after_login(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'must_change_password' => false,
        ]);

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($staff);
        $response->assertRedirect(route('staff.dashboard', absolute: false));
    }

    public function test_unverified_staff_cannot_access_staff_home_or_dashboard(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);

        $this->actingAs($staff)
            ->get('/staff')
            ->assertRedirect(route('verification.notice', absolute: false));

        $this->actingAs($staff)
            ->get('/dashboard')
            ->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_verified_staff_with_default_password_is_redirected_to_forced_password_screen_from_protected_routes(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())->create([
            'must_change_password' => true,
        ]);

        $this->actingAs($staff)
            ->get('/staff')
            ->assertRedirect(route('staff.password.edit', absolute: false));

        $this->actingAs($staff)
            ->get('/dashboard')
            ->assertRedirect(route('staff.password.edit', absolute: false));
    }

    public function test_staff_forced_password_screen_can_be_rendered(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())->create([
            'must_change_password' => true,
        ]);

        $response = $this->actingAs($staff)->get(route('staff.password.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page->component('Auth/StaffForcePasswordChange'));
    }

    public function test_staff_can_complete_forced_password_change_through_dedicated_route(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())->create([
            'must_change_password' => true,
        ]);

        $response = $this
            ->actingAs($staff)
            ->put(route('staff.password.update'), [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response->assertRedirect(route('staff.dashboard', absolute: false));
        $this->assertTrue(Hash::check('new-password', $staff->fresh()->password));
        $this->assertFalse($staff->fresh()->must_change_password);
    }

    public function test_completed_staff_without_business_modules_lands_on_the_staff_dashboard_because_team_inbox_is_available(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay House',
            'premium_tier' => 'premium',
        ]);
        $staff = User::factory()->staff($owner)->create([
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
        ]);

        $response = $this->actingAs($staff)->get('/dashboard');

        $response->assertRedirect(route('staff.dashboard', absolute: false));
        $response = $this->actingAs($staff)->get(route('staff.dashboard'));
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Dashboard')
            ->where('hub.variant', 'crm')
            ->where('hub.sellerName', 'Clay House')
        );
    }

    public function test_staff_email_verification_redirects_to_forced_password_screen_when_required(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);
        [$code] = app(EmailVerificationCodeService::class)->issue($staff);

        Event::fake();

        $response = $this->actingAs($staff)->post(route('verification.code'), [
            'code' => $code,
        ]);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($staff->fresh()->hasVerifiedEmail());
        $response->assertRedirect(route('staff.password.edit', absolute: false).'?verified=1');
    }

    public function test_logged_out_guest_cannot_submit_staff_verification_code(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);
        [$code] = app(EmailVerificationCodeService::class)->issue($staff);

        $response = $this->post(route('verification.code'), [
            'code' => $code,
        ]);

        $response->assertRedirect(route('login', absolute: false));
        $this->assertFalse($staff->fresh()->hasVerifiedEmail());
    }

    public function test_staff_verification_code_only_applies_to_authenticated_account(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);
        [$code] = app(EmailVerificationCodeService::class)->issue($staff);

        $response = $this->actingAs($owner)
            ->from(route('verification.notice'))
            ->post(route('verification.code'), [
                'code' => $code,
            ]);

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertFalse($staff->fresh()->hasVerifiedEmail());
        $this->assertAuthenticatedAs($owner);
    }
}
