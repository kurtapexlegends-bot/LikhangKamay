<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerOrderTimelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_orders_page_includes_compact_order_timeline_entries(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => [
                'orders' => true,
            ],
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Buyer Timeline',
        ]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'sku' => 'TL-001',
            'name' => 'Timeline Vase',
            'category' => 'Vase',
            'price' => 1200,
            'stock' => 10,
            'status' => 'Active',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-TIMELINE-001',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 1200,
            'convenience_fee_amount' => 36,
            'shipping_fee_amount' => 50,
            'platform_commission_amount' => 120,
            'seller_net_amount' => 1130,
            'total_amount' => 1286,
            'status' => 'Shipped',
            'payment_method' => 'Wallet',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Buyer Street, Dasmarinas City, Cavite',
            'accepted_at' => now()->subHours(4),
            'shipped_at' => now()->subHours(2),
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 1200,
            'cost' => 600,
            'quantity' => 1,
            'product_img' => 'products/timeline.jpg',
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_ON_GOING,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_timeline_001',
            'last_webhook_received_at' => now(),
        ]);

        OrderDeliveryEvent::create([
            'order_delivery_id' => $delivery->id,
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'event_key' => 'timeline-driver-assigned',
            'event_type' => 'DRIVER_ASSIGNED',
            'external_order_id' => 'llm_timeline_001',
            'payload' => [
                'eventType' => 'DRIVER_ASSIGNED',
                'data' => [
                    'orderId' => 'llm_timeline_001',
                ],
            ],
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($seller)->get(route('orders.index'));

        $response->assertOk();
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Seller/OrderManager')
                ->where('orders.0.timeline', function ($timeline) {
                    $labels = collect($timeline)->pluck('label')->all();

                    return in_array('Order placed', $labels, true)
                        && in_array('Order accepted', $labels, true)
                        && in_array('Order shipped', $labels, true)
                        && in_array('Courier assigned', $labels, true);
                })
        );
    }
}
