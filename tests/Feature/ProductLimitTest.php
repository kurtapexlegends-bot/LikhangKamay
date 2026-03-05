<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_user_cannot_exceed_product_limit()
    {
        $user = User::factory()->create(['subscription_tier' => 'standard']);
        Product::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'active']);
        
        $response = $this->actingAs($user)->post('/products', ['name' => '4th product', 'status' => 'active']);
        $response->assertSessionHasErrors('limit');
    }
}
