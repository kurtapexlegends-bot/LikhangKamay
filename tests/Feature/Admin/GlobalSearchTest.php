<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_search(): void
    {
        $this->get(route('api.global-search', ['query' => 'testing']))
            ->assertRedirect(route('login'));
    }

    public function test_admin_gets_admin_search_results(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Johnathan Ceramic Maker',
            'email' => 'johnathan.maker@example.com'
        ]);

        $category = Category::create([
            'name' => 'Vases & Jars',
            'slug' => 'vases-jars'
        ]);

        $response = $this->actingAs($admin)
            ->getJson(route('api.global-search', ['query' => 'Johnathan']))
            ->assertOk();

        $results = $response->json('results');
        $this->assertNotEmpty($results);

        // Should find the user Johnathan
        $userResult = collect($results)->firstWhere('type', 'User');
        $this->assertNotNull($userResult);
        $this->assertEquals('Johnathan Ceramic Maker', $userResult['title']);

        // Should NOT run sellerSearch logic
        $this->assertEmpty(collect($results)->where('type', 'Product'));
    }

    public function test_seller_cannot_access_admin_search_results(): void
    {
        $artisan = User::factory()->artisanApproved()->create();
        $admin = User::factory()->superAdmin()->create([
            'name' => 'Super Administrator'
        ]);

        $response = $this->actingAs($artisan)
            ->getJson(route('api.global-search', ['query' => 'Super']))
            ->assertOk();

        $results = $response->json('results');
        
        // Seller should not see admin user in global search
        $adminUserResult = collect($results)->firstWhere('title', 'Super Administrator');
        $this->assertNull($adminUserResult);
    }

    public function test_restricted_staff_search_results_filtered_by_module_permissions(): void
    {
        $artisan = User::factory()->artisanApproved()->create();
        
        // Create staff user with products permission ONLY
        $staff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['products' => true]
        ]);

        // Create product belonging to this artisan
        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Staff Product Search Item',
            'sku' => 'STAFF-PROD-1',
            'status' => 'Active',
            'category' => 'Stoneware',
            'price' => 150.00
        ]);

        // Create order belonging to this artisan
        $order = Order::create([
            'artisan_id' => $artisan->id,
            'user_id' => User::factory()->create()->id,
            'order_number' => 'ORDER-STAFF-1',
            'customer_name' => 'Staff Customer',
            'total_amount' => 100,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'unpaid',
            'shipping_address' => 'Test Address',
            'shipping_method' => 'Delivery'
        ]);

        // Search for "Staff"
        $response = $this->actingAs($staff)
            ->getJson(route('api.global-search', ['query' => 'Staff']))
            ->assertOk();

        $results = $response->json('results');

        // Should find the product
        $productResult = collect($results)->firstWhere('type', 'Product');
        $this->assertNotNull($productResult);
        $this->assertEquals('Staff Product Search Item', $productResult['title']);

        // Should NOT find the order (staff does not have orders permission)
        $orderResult = collect($results)->firstWhere('type', 'Order');
        $this->assertNull($orderResult);
    }
}
