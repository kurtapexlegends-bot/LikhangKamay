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
        /** @var \Illuminate\Contracts\Auth\Authenticatable $user */
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/seller/subscription');
        $response->assertStatus(200);
    }
}
