<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SubscriptionRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_view_subscription_page()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/seller/subscription');
        $response->assertStatus(200);
    }

    public function test_seller_can_upgrade_tier()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['subscription_tier' => 'standard']);
        $response = $this->actingAs($user)->post(route('seller.subscription.update-tier'), [
            'new_tier' => 'premium',
            'keep_product_ids' => []
        ]);
        $response->assertRedirect(route('seller.subscription'));
        $this->assertEquals('premium', $user->fresh()->subscription_tier);
    }

    public function test_seller_can_downgrade_and_select_products_to_keep()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['subscription_tier' => 'premium']);
        $p1 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p2 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p3 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p4 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        // Downgrade to standard (limit 3), keep p1, p2, p3
        $response = $this->actingAs($user)->post(route('seller.subscription.update-tier'), [
            'new_tier' => 'standard',
            'keep_product_ids' => [$p1->id, $p2->id, $p3->id]
        ]);
        
        $response->assertRedirect(route('seller.subscription'));
        $this->assertEquals('standard', $user->fresh()->subscription_tier);
        $this->assertEquals('Active', $p1->fresh()->status);
        $this->assertEquals('Archived', $p4->fresh()->status);
    }

    public function test_seller_cannot_keep_more_products_than_new_limit()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['subscription_tier' => 'premium']);
        $p1 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p2 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p3 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);
        $p4 = \App\Models\Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        // Downgrade to standard (limit 3), but try to keep 4 products
        $response = $this->actingAs($user)->post(route('seller.subscription.update-tier'), [
            'new_tier' => 'standard',
            'keep_product_ids' => [$p1->id, $p2->id, $p3->id, $p4->id]
        ]);
        
        $response->assertSessionHas('error');
        $this->assertEquals('premium', $user->fresh()->subscription_tier); // Must remain unchanged
    }
}
