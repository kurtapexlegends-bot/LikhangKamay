<?php

namespace Tests\Feature\Audit;

use App\Actions\Consumer\PlaceOrder;
use App\Actions\Consumer\ReceiveOrder;
use App\Http\Requests\CheckoutRequest;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\Logistics\InHouseDispatchService;
use Carbon\Carbon;
use Database\Seeders\E2ETestPersonaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LiveTransactionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_live_transaction_pipeline_lifecycle(): void
    {
        Storage::fake('public');

        // 1. Seed E2E personas
        $seeder = new E2ETestPersonaSeeder();
        $seeder->run();

        $artisan = User::where('email', 'test.artisan@likhangkamay.local')->firstOrFail();
        $buyer = User::where('email', 'test.buyer@likhangkamay.local')->firstOrFail();
        $driverUser = User::where('email', 'test.driver@likhangkamay.local')->firstOrFail();
        $driverEmployee = Employee::where('user_id', $artisan->id)->where('role', 'Driver')->firstOrFail();
        $product = Product::where('sku', 'TEST-BAMBOO-01')->firstOrFail();

        $stockBefore = (int) $product->stock;
        $this->assertEquals(999, $stockBefore);
        $this->assertEquals(1.00, (float) $product->price);

        // 2. Buyer Checkout of ₱1 synthetic item (COD, Cavite Address)
        $buyerAddress = UserAddress::where('user_id', $buyer->id)->firstOrFail();

        $orderPayload = [
            'items' => [
                [
                    'id' => $product->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                    'price' => 1.00,
                    'name' => $product->name,
                    'artisan_id' => $artisan->id,
                ],
            ],
            'shipping_method' => 'Delivery',
            'shipping_address_type' => 'home',
            'payment_method' => 'COD',
            'shipping_address' => $buyerAddress->full_address,
            'shipping_street_address' => $buyerAddress->street_address,
            'shipping_barangay' => $buyerAddress->barangay,
            'shipping_city' => $buyerAddress->city,
            'shipping_region' => $buyerAddress->region,
            'shipping_postal_code' => $buyerAddress->postal_code,
            'shipping_latitude' => $buyerAddress->latitude,
            'shipping_longitude' => $buyerAddress->longitude,
            'recipient_name' => $buyerAddress->recipient_name,
            'phone_number' => $buyerAddress->phone_number,
            'total' => 1.00,
        ];

        $response = $this->actingAs($buyer)->post(route('checkout.store'), $orderPayload);
        $response->assertRedirect(route('my-orders.index'));

        // Assert Stock Decremented
        $stockAfter = (int) $product->fresh()->stock;
        $this->assertEquals($stockBefore - 1, $stockAfter, 'Database stock must decrement by exactly the purchased quantity');

        // Assert Order Created with is_test = true
        $order = Order::where('user_id', $buyer->id)->latest('id')->firstOrFail();
        $this->assertTrue((bool) $order->is_test, 'Order must inherit is_test=true from buyer persona');
        $this->assertEquals('Pending', $order->status);
        $this->assertEquals(1.00, (float) $order->merchandise_subtotal);
        $this->assertEquals(70.03, (float) $order->total_amount);

        // 3. Seller Order Acceptance and In-House Driver Dispatch
        // Seller accepts order
        $acceptResponse = $this->actingAs($artisan)->post(route('orders.update', $order->order_number), [
            'status' => 'Accepted',
        ]);
        $acceptResponse->assertSessionHas('success');
        $this->assertEquals('Accepted', $order->fresh()->status);

        // Open driver attendance session
        StaffAttendanceSession::create([
            'staff_user_id' => $driverUser->id,
            'seller_owner_id' => $artisan->id,
            'employee_id' => $driverEmployee->id,
            'attendance_date' => Carbon::today(),
            'clock_in_at' => now()->subMinutes(10),
            'clock_out_at' => null,
        ]);

        // Seller dispatches order with in-house driver
        $dispatchResponse = $this->actingAs($artisan)->post(route('orders.dispatch-in-house', $order->order_number), [
            'employee_id' => $driverEmployee->id,
            'dispatch_notes' => 'E2E Live Transaction Pipeline Test Run',
        ]);
        $dispatchResponse->assertSessionHas('success');

        $order->refresh();
        $this->assertEquals('Shipped', $order->status);
        $this->assertStringStartsWith('LK-INHOUSE-', $order->tracking_number);

        $delivery = OrderDelivery::where('order_id', $order->id)->firstOrFail();
        $this->assertEquals(OrderDelivery::PROVIDER_IN_HOUSE, $delivery->provider);
        $this->assertEquals(OrderDelivery::STATUS_ON_GOING, $delivery->status);
        $this->assertTrue((bool) $delivery->is_test, 'OrderDelivery must have is_test=true');

        // 4. Driver Telemetry & POD Submission
        // Driver posts GPS telemetry
        $telemetryResponse = $this->actingAs($driverUser)->putJson(route('staff.deliveries.telemetry', $delivery->id), [
            'latitude' => 14.4258,
            'longitude' => 120.9385,
            'heading' => 45,
            'speed_kph' => 28.5,
        ]);
        $telemetryResponse->assertOk();
        $this->assertTrue($telemetryResponse->json('success'));

        // Driver completes delivery with POD photo
        $fakePhoto = UploadedFile::fake()->image('proof_of_delivery.jpg', 800, 600);
        $completeResponse = $this->actingAs($driverUser)->post(route('staff.deliveries.complete', $delivery->id), [
            'pod_photo' => $fakePhoto,
            'pod_notes' => 'Delivered to recipient doorstep at Buhay na Tubig.',
        ]);
        $completeResponse->assertSessionHas('success');

        $delivery->refresh();
        $order->refresh();
        $this->assertEquals(OrderDelivery::STATUS_COMPLETED, $delivery->status);
        $this->assertEquals('Delivered', $order->status);

        // 5. Buyer Verifies Delivery and Fetches BIR Invoice
        $receiveResponse = $this->actingAs($buyer)->post(route('my-orders.receive', $order->order_number));
        $receiveResponse->assertSessionHas('success');

        $order->refresh();
        $this->assertEquals('Completed', $order->status);
        $this->assertEquals('paid', $order->payment_status);

        // Fetch BIR Sales Invoice
        $receiptResponse = $this->actingAs($buyer)->get(route('my-orders.receipt', $order->order_number));
        $receiptResponse->assertOk();
        $content = $receiptResponse->getContent();
        $this->assertNotEmpty($content);
        $this->assertStringContainsString('INVOICE', strtoupper($content));

        // Calculate cryptographic hash
        $invoiceHash = hash('sha256', $content);
        $this->assertNotEmpty($invoiceHash);
        $this->assertEquals(64, strlen($invoiceHash));
    }
}
