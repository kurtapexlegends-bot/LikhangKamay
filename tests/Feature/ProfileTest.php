<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_profile_page_is_displayed_using_buyer_profile_shell(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page->component('Profile/Edit'));
    }

    public function test_artisan_owner_profile_page_uses_seller_profile_shell_in_owner_mode(): void
    {
        $user = User::factory()->artisanApproved()->createOne();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Profile/Edit')
            ->where('profileMode', 'owner')
        );
    }

    public function test_staff_profile_page_uses_seller_profile_shell_in_personal_mode(): void
    {
        $owner = User::factory()->artisanApproved()->createOne();
        $staff = User::factory()->staff($owner)->createOne([
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this
            ->actingAs($staff)
            ->get('/profile');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Profile/Edit')
            ->where('profileMode', 'personal')
        );
    }

    public function test_super_admin_profile_page_uses_admin_workspace_profile_shell(): void
    {
        $admin = User::factory()->createOne([
            'role' => 'super_admin',
        ]);

        $response = $this
            ->actingAs($admin)
            ->get('/profile');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Profile/Edit')
            ->where('profileMode', 'personal')
            ->where('workspaceShell', 'admin')
        );
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('Test', $user->first_name);
        $this->assertSame('User', $user->last_name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_update_keeps_existing_avatar_when_no_new_avatar_is_uploaded(): void
    {
        $user = User::factory()->createOne([
            'avatar' => 'avatars/existing-avatar.jpg',
        ]);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => $user->email,
                'avatar' => null,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertSame('avatars/existing-avatar.jpg', $user->refresh()->avatar);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_seller_can_update_primary_pickup_fallback_fields_from_profile(): void
    {
        $seller = User::factory()->artisanApproved()->createOne([
            'phone_number' => '09170000000',
            'street_address' => 'Old street',
            'city' => 'Dasmarinas City',
            'barangay' => null,
            'region' => null,
                'zip_code' => null,
        ]);

        $response = $this
            ->actingAs($seller)
            ->patch('/profile', [
                'name' => $seller->name,
                'email' => $seller->email,
                'shop_name' => $seller->shop_name,
                'phone_number' => '09922933689',
                'street_address' => 'Blk 35 Lot 18',
                'barangay' => 'Sampaloc 1',
                'city' => 'Dasmarinas City',
                'region' => 'Cavite',
                'zip_code' => '4114',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $seller->refresh();

        $this->assertSame('09922933689', $seller->phone_number);
        $this->assertSame('Blk 35 Lot 18', $seller->street_address);
        $this->assertSame('Sampaloc 1', $seller->barangay);
        $this->assertSame('Dasmarinas City', $seller->city);
        $this->assertSame('Cavite', $seller->region);
        $this->assertSame('4114', $seller->zip_code);
    }

    public function test_profile_information_can_still_be_updated_with_legacy_name_field(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Legacy Name',
                'email' => 'legacy@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Legacy Name', $user->name);
        $this->assertSame('Legacy', $user->first_name);
        $this->assertSame('Name', $user->last_name);
    }

    public function test_user_can_update_their_saved_address(): void
    {
        $user = User::factory()->createOne();
        $address = $user->addresses()->create([
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Old Name',
            'phone_number' => '09170000000',
            'full_address' => 'Old address',
            'city' => 'Old city',
            'is_default' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->patch(route('user-addresses.update', $address->id), [
                'label' => 'Office',
                'address_type' => 'office',
                'recipient_name' => 'New Name',
                'phone_number' => '09179999999',
                'full_address' => '123 New Street, Dasmarinas City, Cavite, Philippines',
                'city' => 'Dasmarinas City',
                'region' => 'Cavite',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $address->refresh();

        $this->assertSame('Office', $address->label);
        $this->assertSame('office', $address->address_type);
        $this->assertSame('New Name', $address->recipient_name);
        $this->assertSame('09179999999', $address->phone_number);
        $this->assertSame('123 New Street, Dasmarinas City, Cavite, Philippines', $address->full_address);
        $this->assertSame('Dasmarinas City', $address->city);
        $this->assertSame('Cavite', $address->region);
    }

    public function test_user_cannot_update_another_users_saved_address(): void
    {
        $user = User::factory()->createOne();
        $otherUser = User::factory()->createOne();
        $address = $otherUser->addresses()->create([
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Owner',
            'phone_number' => '09170000000',
            'full_address' => 'Original address',
            'is_default' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->patch(route('user-addresses.update', $address->id), [
                'label' => 'Tampered',
                'address_type' => 'other',
                'recipient_name' => 'Intruder',
                'phone_number' => '09171111111',
                'full_address' => 'Tampered address',
            ]);

        $response->assertNotFound();

        $address->refresh();

        $this->assertSame('Home', $address->label);
        $this->assertSame('Owner', $address->recipient_name);
        $this->assertSame('Original address', $address->full_address);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->createOne();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }
}
