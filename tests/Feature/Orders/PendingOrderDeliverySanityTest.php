<?php

namespace Tests\Feature\Orders;

use App\Actions\Consumer\CancelOrder;
use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Support\OrderWorkflowHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PendingOrderDeliverySanityTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;
    private User $buyer;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => ['orders' => true],
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Test Buyer',
        ]);

        $this->product = Product::factory()->create([
            'user_id' => $this->seller->id,
            'sku' => 'TEST-001',
            'name' => 'Handcrafted Vase',
            'category' => 'Pottery',
            'stock' => 10,
            'price' => 500,
            'status' => 'Active',
        ]);
    }

    public function test_serialize_delivery_returns_null_when_order_is_pending(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TEST-PENDING-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->seller->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 500,
            'total_amount' => 550,
            'status' => 'Pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        $delivery = OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_ON_GOING,
            'driver_name' => 'Driver Alex',
        ]);

        $serializedWithExplicitStatus = OrderWorkflowHelper::serializeDelivery($delivery, 'Pending');
        $this->assertNull($serializedWithExplicitStatus);

        $order->setRelation('delivery', $delivery);
        $serializedWithOrderRelation = OrderWorkflowHelper::serializeDelivery($delivery, $order->status);
        $this->assertNull($serializedWithOrderRelation);
    }

    public function test_order_model_booted_guard_purges_orphaned_delivery_on_pending_orders(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TEST-PURGE-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->seller->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 500,
            'total_amount' => 550,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_ON_GOING,
            'driver_name' => 'Driver Alex',
        ]);

        $this->assertDatabaseHas('order_deliveries', ['order_id' => $order->id]);

        // When order status is set/reverted to Pending and saved
        $order->status = 'Pending';
        $order->save();

        $this->assertDatabaseMissing('order_deliveries', ['order_id' => $order->id]);
    }

    public function test_cancelling_or_rejecting_order_cancels_attached_active_delivery(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TEST-CANCEL-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->seller->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 500,
            'total_amount' => 550,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'quantity' => 1,
            'price' => 500,
            'total' => 500,
        ]);

        $delivery = OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_ON_GOING,
            'driver_name' => 'Driver Alex',
        ]);

        app(UpdateOrderStatus::class)->execute($order, ['status' => 'Rejected'], $this->seller, null);

        $delivery->refresh();
        $this->assertSame(OrderDelivery::STATUS_CANCELED, $delivery->status);
        $this->assertSame('Order rejected by seller', $delivery->failure_reason);
    }
}
