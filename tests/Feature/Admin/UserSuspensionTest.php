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

    public function test_suspended_seller_products_hidden_from_marketplace(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'sku' => 'TEST-PROD-001',
            'name' => 'Test Product',
            'category' => 'Vase',
            'price' => 500,
            'stock' => 5,
            'status' => 'Active',
        ]);

        // Initially approved products show up
        $this->assertCount(1, Product::approved()->get());

        // Suspend the seller
        $seller->update(['banned_at' => now()]);

        // The products should no longer appear in approved scope
        $this->assertCount(0, Product::approved()->get());
    }

    public function test_suspended_seller_shop_profile_returns_404(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        // Create compliance agreement so they can pass the other checks
        \App\Models\SellerComplianceAgreement::create([
            'user_id' => $seller->id,
            'document_type' => 'seller_terms',
            'version' => '1.0',
            'accepted_at' => now(),
        ]);

        // Ensure the shop is accessible initially
        $response = $this->get(route('shop.seller', $seller->shop_slug));
        $response->assertStatus(200);

        // Suspend the seller
        $seller->update(['banned_at' => now()]);

        // Ensure accessing the shop profile now returns a 404
        $response = $this->get(route('shop.seller', $seller->shop_slug));
        $response->assertStatus(404);
    }

    public function test_chat_restricted_with_suspended_user_unless_active_order(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $service = app(\App\Services\Chat\DirectMessageService::class);

        // Create an existing conversation message so the base canAccess check succeeds
        \App\Models\Message::create([
            'sender_id' => $buyer->id,
            'receiver_id' => $seller->id,
            'message' => 'Hello',
        ]);

        // Buyer checks if they can chat with seller (sellerPerspective = false)
        $this->assertTrue($service->canAccessConversationForPerspective($buyer, $seller, false));

        // Suspend the seller
        $seller->update(['banned_at' => now()]);

        // Now blocked because there is no active order
        $this->assertFalse($service->canAccessConversationForPerspective($buyer, $seller, false));

        // Create an inactive order (Completed)
        $order = \App\Models\Order::create([
            'order_number' => 'ORD-TEST-001',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 1000,
            'convenience_fee_amount' => 30,
            'shipping_fee_amount' => 50,
            'platform_commission_amount' => 100,
            'seller_net_amount' => 900,
            'total_amount' => 1080,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Pickup',
            'shipping_address' => 'Test Address',
        ]);

        // Still blocked since the order is Completed (not active)
        $this->assertFalse($service->canAccessConversationForPerspective($buyer, $seller, false));

        // Change order status to Shipped (active)
        $order->update(['status' => 'Shipped']);

        // Now allowed because there is an active/uncompleted order relationship
        $this->assertTrue($service->canAccessConversationForPerspective($buyer, $seller, false));
    }
}
