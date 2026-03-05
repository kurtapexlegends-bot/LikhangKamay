<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PremiumSubscriptionSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_subscription_fields()
    {
        $user = User::factory()->create([
            'subscription_tier' => 'super_premium',
            'sponsorship_credits' => 5,
        ]);
        
        $this->assertEquals('super_premium', $user->subscription_tier);
        $this->assertEquals(5, $user->sponsorship_credits);
    }
}
