<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SponsorshipSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_sponsorship_request()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['subscription_tier' => 'super_premium', 'sponsorship_credits' => 5]);
        $product = Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        $request = SponsorshipRequest::create([
            'seller_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'pending',
            'requested_duration_days' => 7,
        ]);

        $this->assertEquals('pending', $request->status);
        $this->assertEquals($user->id, $request->seller_id);
        $this->assertEquals($product->id, $request->product_id);
        $this->assertEquals(7, $request->requested_duration_days);
    }

    public function test_product_has_sponsorship_fields()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $user->id,
            'is_sponsored' => true,
            'sponsored_until' => now()->addDays(7),
        ]);

        $this->assertTrue($product->is_sponsored);
        $this->assertNotNull($product->sponsored_until);
    }

    public function test_sponsorship_request_belongs_to_seller_and_product()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create(['subscription_tier' => 'super_premium', 'sponsorship_credits' => 5]);
        $product = Product::factory()->create(['user_id' => $user->id, 'status' => 'Active']);

        $sr = SponsorshipRequest::create([
            'seller_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'pending',
            'requested_duration_days' => 7,
        ]);

        $this->assertEquals($user->id, $sr->seller->id);
        $this->assertEquals($product->id, $sr->product->id);
    }
}
