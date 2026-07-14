<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSuspensionTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_can_toggle_user_suspension(): void
    {
        /** @var \App\Models\User $buyer */
        $buyer = User::factory()->create(['role' => 'buyer']);
        /** @var \App\Models\User $admin */
        $admin = User::factory()->superAdmin()->create();
        $targetUser = User::factory()->create(['role' => 'buyer']);

        // Buyer cannot toggle status
        $this->actingAs($buyer)
            ->post(route('admin.users.toggle-status', $targetUser->id))
            ->assertStatus(403); // Forbidden

        // Admin can toggle status successfully
        $this->actingAs($admin)
            ->post(route('admin.users.toggle-status', $targetUser->id))
            ->assertRedirect();

        $this->assertNotNull($targetUser->fresh()->banned_at);

        // Admin can reactivate the user
        $this->actingAs($admin)
            ->post(route('admin.users.toggle-status', $targetUser->id))
            ->assertRedirect();

        $this->assertNull($targetUser->fresh()->banned_at);
    }

    public function test_admin_cannot_suspend_admin_accounts(): void
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->superAdmin()->create();
        /** @var \App\Models\User $otherAdmin */
        $otherAdmin = User::factory()->superAdmin()->create();

        // Admin cannot suspend themselves
        $this->actingAs($admin)
            ->post(route('admin.users.toggle-status', $admin->id))
            ->assertSessionHasErrors(['error']);

        $this->assertNull($admin->fresh()->banned_at);

        // Admin cannot suspend another admin
        $this->actingAs($admin)
            ->post(route('admin.users.toggle-status', $otherAdmin->id))
            ->assertSessionHasErrors(['error']);

        $this->assertNull($otherAdmin->fresh()->banned_at);
    }

    public function test_suspended_user_is_automatically_logged_out(): void
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['role' => 'buyer']);

        $this->actingAs($user);
        $this->assertAuthenticatedAs($user);

        // Suspend user directly in DB
        $user->update(['banned_at' => now()]);

        // Next request should trigger EnsureNotBanned and log user out
        $response = $this->get(route('home'));
        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email']);
        $this->assertGuest();
    }

    public function test_staff_member_is_blocked_if_artisan_owner_is_suspended(): void
    {
        $artisan = User::factory()->artisanApproved()->create();
        /** @var \App\Models\User $staff */
        $staff = User::factory()->staff($artisan)->create();

        $this->actingAs($staff);
        $this->assertAuthenticatedAs($staff);

        // Suspend the artisan owner
        $artisan->update(['banned_at' => now()]);

        // Next request by staff member should log them out
        $response = $this->get(route('home'));
        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email']);
        $this->assertGuest();
    }
}
