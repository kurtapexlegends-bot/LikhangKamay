<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
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

    public function test_verified_staff_with_overview_access_is_redirected_to_dashboard_after_login(): void
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
        $response->assertRedirect(route('dashboard', absolute: false));
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

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertTrue(Hash::check('new-password', $staff->fresh()->password));
        $this->assertFalse($staff->fresh()->must_change_password);
    }

    public function test_completed_staff_without_granted_modules_can_access_holding_page_and_is_redirected_there_from_dashboard(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay House',
        ]);
        $staff = User::factory()->staff($owner)->create([
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => [],
        ]);

        $this->actingAs($staff)
            ->get('/dashboard')
            ->assertRedirect(route('staff.home', absolute: false));

        $response = $this->actingAs($staff)->get(route('staff.home'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Holding')
            ->where('staffAccount.email', $staff->email)
            ->where('sellerOwner.id', $owner->id)
            ->where('sellerOwner.name', 'Clay House')
        );
    }

    public function test_staff_email_verification_redirects_to_forced_password_screen_when_required(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $staff->id, 'hash' => sha1($staff->email)]
        );

        $response = $this->actingAs($staff)->get($verificationUrl);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($staff->fresh()->hasVerifiedEmail());
        $response->assertRedirect(route('staff.password.edit', absolute: false).'?verified=1');
    }

    public function test_staff_email_verification_link_can_be_completed_while_logged_out(): void
    {
        $staff = User::factory()->staff(User::factory()->artisanApproved()->create())
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $staff->id, 'hash' => sha1($staff->email)]
        );

        $response = $this->get($verificationUrl);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($staff->fresh()->hasVerifiedEmail());
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/VerificationResult')
            ->where('status', 'Email verified successfully. Sign in with the staff account to continue.')
            ->where('loginEmail', $staff->email)
            ->where('signedInAsDifferentUser', false)
        );
    }

    public function test_staff_email_verification_link_keeps_a_different_authenticated_user_signed_in_instead_of_403ing(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)
            ->unverified()
            ->create([
                'must_change_password' => true,
            ]);

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $staff->id, 'hash' => sha1($staff->email)]
        );

        $response = $this->actingAs($owner)->get($verificationUrl);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($staff->fresh()->hasVerifiedEmail());
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/VerificationResult')
            ->where('status', 'Email verified successfully. Sign in with the staff account to continue.')
            ->where('loginEmail', $staff->email)
            ->where('signedInAsDifferentUser', true)
            ->where('currentUser.name', $owner->name)
        );
        $this->assertAuthenticatedAs($owner);
    }
}
