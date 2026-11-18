<?php

namespace Tests\Feature;

use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DefenseReadinessFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_storage_url_safely_falls_back_for_synthetic_or_orphaned_assets(): void
    {
        $url1 = StorageUrl::url('products/cover/synthetic_bamboo.jpg');
        $this->assertEquals('/images/demo/products/espresso-cup-cover.jpg', $url1);

        $url2 = StorageUrl::url('products/covers/bTidkz3NCqLS0e1m3bAP8wjljgo6RiwCOIfCU8sV.jpg');
        $this->assertEquals('/images/demo/products/espresso-cup-cover.jpg', $url2);
    }

    public function test_payment_controller_builds_absolute_image_urls_for_paymongo(): void
    {
        $seller = User::factory()->create(['role' => 'artisan']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Demo Artisan Mug',
            'category' => 'Drinkware',
            'sku' => 'TEST-DEFENSE-SKU-001',
            'price' => 150,
            'stock' => 10,
            'status' => 'Active',
            'cover_photo_path' => '/images/demo/products/espresso-cup-cover.jpg',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-DEFENSE-PAY-001',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.com',
            'customer_phone' => '09123456789',
            'shipping_address' => 'Blk 1 Lot 2, Imus, Cavite',
            'city' => 'Imus',
            'postal_code' => '4103',
            'total_amount' => 150,
            'shipping_method' => 'Delivery',
            'status' => 'Accepted',
            'payment_status' => 'pending',
            'payment_method' => 'GCash',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => 150,
            'product_img' => '/images/demo/products/espresso-cup-cover.jpg',
        ]);

        $controller = app(\App\Http\Controllers\Consumer\PaymentController::class);
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('buildCheckoutLineItems');
        $method->setAccessible(true);

        [$lineItems, $total] = $method->invoke($controller, $order);

        $this->assertNotEmpty($lineItems);
        $this->assertArrayHasKey('images', $lineItems[0]);
        $this->assertNotEmpty($lineItems[0]['images']);
        $this->assertStringStartsWith('http', $lineItems[0]['images'][0]);
        $this->assertTrue((bool) filter_var($lineItems[0]['images'][0], FILTER_VALIDATE_URL));
    }

    public function test_b2b_wholesale_in_house_dispatched_order_can_be_marked_delivered_by_seller(): void
    {
        $seller = User::factory()->create(['role' => 'artisan']);
        $buyer = User::factory()->create(['role' => 'artisan']);

        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'B2B Terracotta Clay Sack',
            'category' => 'Clay Bodies',
            'sku' => 'TEST-DEFENSE-SKU-002',
            'price' => 500,
            'stock' => 50,
            'status' => 'Active',
            'is_b2b_supply' => true,
        ]);

        $order = Order::create([
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'order_number' => 'B2B-TEST-ORDER-001',
            'customer_name' => 'Buyer Artisan Studio',
            'customer_email' => 'artisan@example.com',
            'customer_phone' => '09123456789',
            'shipping_address' => 'Silang, Cavite',
            'city' => 'Silang',
            'postal_code' => '4118',
            'total_amount' => 500,
            'shipping_method' => 'Delivery',
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => 500,
            'is_b2b_supply' => true,
        ]);

        $delivery = OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_ON_GOING,
        ]);

        $updateOrderStatus = app(UpdateOrderStatus::class);

        // This action should NOT throw "Wait for the courier to confirm delivery."
        $updateOrderStatus->execute(
            $order,
            ['status' => 'Delivered'],
            $seller
        );

        $order->refresh();
        $delivery->refresh();

        $this->assertEquals('Delivered', $order->status);
        $this->assertEquals(OrderDelivery::STATUS_COMPLETED, $delivery->status);
    }
}
