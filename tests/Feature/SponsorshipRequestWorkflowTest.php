<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SponsorshipRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_with_credits_can_submit_request()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create([
            'subscription_tier' => 'super_premium',
            'sponsorship_credits' => 5,
        ]);
        $product = Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        $response = $this->actingAs($user)->post(route('seller.sponsorships.store'), [
            'product_id' => $product->id,
            'requested_duration_days' => 7,
        ]);

        $response->assertRedirect(route('seller.sponsorships'));
        $this->assertEquals(4, $user->fresh()->sponsorship_credits);
        $this->assertDatabaseHas('sponsorship_requests', [
            'seller_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);
    }

    public function test_seller_without_credits_cannot_submit_request()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create([
            'subscription_tier' => 'super_premium',
            'sponsorship_credits' => 0,
        ]);
        $product = Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        $response = $this->actingAs($user)->post(route('seller.sponsorships.store'), [
            'product_id' => $product->id,
            'requested_duration_days' => 7,
        ]);

        $response->assertSessionHasErrors('credits');
        $this->assertEquals(0, $user->fresh()->sponsorship_credits);
    }

    public function test_admin_can_approve_sponsorship_request()
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var \App\Models\User $seller */
        $seller = User::factory()->create(['subscription_tier' => 'super_premium', 'sponsorship_credits' => 4]);
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'Active']);
        $sr = SponsorshipRequest::create([
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
            'requested_duration_days' => 7,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.sponsorships.approve', $sr->id), [
            'admin_notes' => 'Looks good!',
        ]);

        $response->assertRedirect();
        $sr->refresh();
        $product->refresh();
        $this->assertEquals('approved', $sr->status);
        $this->assertNotNull($sr->approved_at);
        $this->assertTrue($product->is_sponsored);
        $this->assertNotNull($product->sponsored_until);
    }

    public function test_admin_can_reject_and_refund_credit()
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var \App\Models\User $seller */
        $seller = User::factory()->create(['subscription_tier' => 'super_premium', 'sponsorship_credits' => 4]);
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'Active']);
        $sr = SponsorshipRequest::create([
            'seller_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
            'requested_duration_days' => 7,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.sponsorships.reject', $sr->id), [
            'admin_notes' => 'Not suitable.',
        ]);

        $response->assertRedirect();
        $sr->refresh();
        $this->assertEquals('rejected', $sr->status);
        $this->assertNotNull($sr->rejected_at);
        $this->assertEquals(5, $seller->fresh()->sponsorship_credits); // refunded
    }
}
