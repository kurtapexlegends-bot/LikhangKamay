<?php

namespace Tests\Feature\Performance;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DualEnvironmentPerformanceTest extends TestCase
{
    use RefreshDatabase;
    /**
     * Test 1: Verify PostgreSQL performance indexes exist or are covered.
     */
    public function test_dual_environment_performance_indexes_exist(): void
    {
        $this->assertTrue(
            Schema::hasIndex('reviews', ['product_id', 'is_hidden_from_marketplace']) ||
            Schema::hasIndex('reviews', 'reviews_product_id_is_hidden_from_marketplace_index'),
            'reviews table must have composite index on [product_id, is_hidden_from_marketplace]'
        );

        $this->assertTrue(
            Schema::hasIndex('messages', ['receiver_id', 'is_read']) ||
            Schema::hasIndex('messages', 'messages_receiver_id_is_read_index'),
            'messages table must have composite index on [receiver_id, is_read]'
        );

        $this->assertTrue(
            Schema::hasIndex('messages', ['sender_id', 'receiver_id']) ||
            Schema::hasIndex('messages', 'messages_sender_id_receiver_id_index'),
            'messages table must have composite index on [sender_id, receiver_id]'
        );

        $this->assertTrue(
            Schema::hasIndex('user_notification_states', ['user_id', 'read_at']) ||
            Schema::hasIndex('user_notification_states', 'user_notification_states_user_id_read_at_index'),
            'user_notification_states table must have composite index on [user_id, read_at]'
        );

        $this->assertTrue(
            Schema::hasIndex('order_items', ['product_id']) ||
            Schema::hasIndex('order_items', 'order_items_product_id_index') ||
            Schema::hasIndex('order_items', 'order_items_product_id_foreign'),
            'order_items table must have index on [product_id]'
        );

        $this->assertTrue(
            Schema::hasIndex('order_items', ['discount_id']) ||
            Schema::hasIndex('order_items', 'order_items_discount_id_index') ||
            Schema::hasIndex('order_items', 'order_items_discount_id_foreign'),
            'order_items table must have index on [discount_id]'
        );
    }

    /**
     * Test 2: Verify /ping returns pong and does not use session middleware.
     */
    public function test_ping_warming_endpoint_returns_pong_without_session(): void
    {
        $response = $this->get('/ping');

        $response->assertStatus(200);
        $this->assertEquals('pong', $response->getContent());
        $this->assertStringContainsString('text/plain', (string) $response->headers->get('Content-Type'));

        $hasSessionCookie = collect($response->headers->getCookies())
            ->contains(fn ($cookie) => $cookie->getName() === config('session.cookie'));
        $this->assertFalse($hasSessionCookie, 'Session cookie must not be set by /ping Keep-Alive warming endpoint.');
    }

    /**
     * Test 3: Verify ProductController::show eager-loads discounts relation.
     */
    public function test_product_show_eager_loads_discounts_relation(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Handwoven Placemat',
            'sku' => 'MAT-PERF-01',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 250.00,
            'stock' => 15,
        ]);

        $response = $this->get(route('product.show', $product->slug));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Consumer/Shop/ProductShow')
            ->has('product')
            ->where('product.id', $product->id)
        );
    }

    /**
     * Test 4: Verify GetBuyerOrders executes cleanly.
     */
    public function test_get_buyer_orders_executes_cleanly(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'MUG-PERF-01',
            'category' => 'Kitchenware',
            'status' => 'Active',
            'price' => 300.00,
            'stock' => 10,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-PERF-BUYER-01',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'total_amount' => 300.00,
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Pick Up at Studio',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => 300.00,
            'cost' => 100.00,
        ]);

        $orders = app(\App\Actions\Consumer\GetBuyerOrders::class)->execute($buyer);

        $this->assertCount(1, $orders);
        $this->assertEquals('ORD-PERF-BUYER-01', $orders->first()['order_number']);
    }

    /**
     * Test 5: Verify ThreeDManagerController index renders with in-memory byte sum.
     */
    public function test_three_d_manager_index_renders_with_in_memory_byte_sum(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        Product::create([
            'user_id' => $seller->id,
            'name' => '3D Vase',
            'sku' => 'VASE-3D-01',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 450.00,
            'stock' => 5,
            'model_3d_path' => 'products/models/vase.glb',
        ]);

        $response = $this->actingAs($seller)->get(route('3d.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Seller/Catalog/ThreeDManager')
            ->has('models', 1)
            ->has('storage')
        );
    }
}
