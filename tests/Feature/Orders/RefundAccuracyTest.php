<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\User;
use App\Services\PayMongoService;
use App\Services\OrderLogisticsService;
use App\Actions\Consumer\CancelOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class RefundAccuracyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Notification::fake();
    }

    private function createProduct(User $seller, int $stock = 10, float $price = 450): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'REF-' . fake()->unique()->numerify('####'),
            'name' => 'Refund Test Product',
            'description' => 'Test item for refund testing.',
            'category' => 'Tableware',
            'status' => 'Active',
            'price' => $price,
            'cost_price' => round($price * 0.6, 2),
            'stock' => $stock,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }

    public function test_delivery_auto_cancel_executes_paymongo_refund_and_sets_refunded_on_success(): void
    {
        $seller = User::factory()->create(['role' => 'artisan', 'artisan_status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = $this->createProduct($seller, stock: 10, price: 450);

        $order = Order::create([
            'order_number' => 'ORD-REF-TEST-001',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500.00,
            'merchandise_subtotal' => 450.00,
            'shipping_fee_amount' => 50.00,
            'status' => 'Shipped',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'pay_12345678',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Test St, Dasmarinas City',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 450.00,
            'quantity' => 1,
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_test_order_1',
            'quotation_id' => 'qt_test_1',
            'terminal_failed_at' => now()->subHours(25),
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createRefund')
            ->once()
            ->with('pay_12345678', 50000, 'requested_by_customer', Mockery::any())
            ->andReturn(['id' => 'ref_successful_123', 'status' => 'succeeded']);

        $this->app->instance(PayMongoService::class, $paymongoMock);

        $logisticsService = app(OrderLogisticsService::class);
        $result = $logisticsService->autoCancelFailedDelivery($delivery);

        $this->assertTrue($result);
        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refunded', $order->payment_status);
    }

    public function test_delivery_auto_cancel_sets_refund_pending_when_gateway_refund_fails(): void
    {
        $seller = User::factory()->create(['role' => 'artisan', 'artisan_status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = $this->createProduct($seller, stock: 10, price: 700);

        $order = Order::create([
            'order_number' => 'ORD-REF-TEST-002',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 750.00,
            'merchandise_subtotal' => 700.00,
            'shipping_fee_amount' => 50.00,
            'status' => 'Shipped',
            'payment_method' => 'Card',
            'payment_status' => 'paid',
            'payment_id' => 'pay_failed_gateway',
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Test Ave, Dasmarinas City',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 700.00,
            'quantity' => 1,
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_test_order_2',
            'quotation_id' => 'qt_test_2',
            'terminal_failed_at' => now()->subHours(25),
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createRefund')
            ->once()
            ->andReturn(null); // Gateway failure

        $this->app->instance(PayMongoService::class, $paymongoMock);

        $logisticsService = app(OrderLogisticsService::class);
        $result = $logisticsService->autoCancelFailedDelivery($delivery);

        $this->assertTrue($result);
        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refund_pending', $order->payment_status);
    }

    public function test_buyer_cancel_sets_refund_pending_when_gateway_refund_fails(): void
    {
        $seller = User::factory()->create(['role' => 'artisan', 'artisan_status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = $this->createProduct($seller, stock: 10, price: 300);

        $order = Order::create([
            'order_number' => 'ORD-REF-TEST-003',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 300.00,
            'merchandise_subtotal' => 300.00,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'pay_cancel_order_fail',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 300.00,
            'quantity' => 1,
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createRefund')
            ->once()
            ->andReturn(null);

        $cancelOrderAction = new CancelOrder($paymongoMock);
        $cancelOrderAction->execute((string) $order->id, $buyer, 'ordered_by_mistake', 'Cancelled accidentally');

        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refund_pending', $order->payment_status);
    }

    public function test_buyer_cancel_executes_paymongo_refund_and_sets_refunded_on_success(): void
    {
        $seller = User::factory()->create(['role' => 'artisan', 'artisan_status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = $this->createProduct($seller, stock: 10, price: 500);

        $order = Order::create([
            'order_number' => 'ORD-REF-TEST-004',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500.00,
            'merchandise_subtotal' => 500.00,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'pay_cancel_order_success',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Store Pick-up',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 500.00,
            'quantity' => 1,
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createRefund')
            ->once()
            ->with('pay_cancel_order_success', 50000, 'requested_by_customer', Mockery::any())
            ->andReturn(['id' => 'ref_buyer_cancel_123', 'status' => 'succeeded']);

        $cancelOrderAction = new CancelOrder($paymongoMock);
        $cancelOrderAction->execute((string) $order->id, $buyer, 'ordered_by_mistake', 'Cancelled accidentally');

        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refunded', $order->payment_status);
    }

    public function test_buyer_cancel_cod_order_skips_paymongo_refund(): void
    {
        $seller = User::factory()->create(['role' => 'artisan', 'artisan_status' => 'approved']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = $this->createProduct($seller, stock: 10, price: 350);

        $order = Order::create([
            'order_number' => 'ORD-REF-TEST-005',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 350.00,
            'merchandise_subtotal' => 350.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 350.00,
            'quantity' => 1,
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldNotReceive('createRefund');

        $cancelOrderAction = new CancelOrder($paymongoMock);
        $cancelOrderAction->execute((string) $order->id, $buyer, 'found_better_price', 'Found better deal');

        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('pending', $order->payment_status);
    }
}
