<?php

namespace Tests\Feature\Orders;

use App\Mail\OrderAccepted;
use App\Mail\OrderCancelled;
use App\Mail\OrderDelivered;
use App\Mail\OrderPlaced;
use App\Mail\OrderShipped;
use App\Mail\RefundProcessed;
use App\Mail\ReturnRequested;
use App\Models\Discount;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\Review;
use App\Models\Supply;
use App\Models\User;
use App\Notifications\NewOrderNotification;
use App\Notifications\ReplacementResolutionNotification;
use App\Services\AddressGeocodingService;
use App\Services\LalamoveService;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class StrictOrderLifecycleFlowE2ETest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $sellerA;
    private User $sellerB;
    private Product $productA;
    private Product $productB;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Mail::fake();
        Notification::fake();
        Config::set('services.paymongo.webhook_secret', 'test_whsk_secret_123');

        $this->buyer = User::factory()->create([
            'name' => 'Juan Dela Cruz',
            'email' => 'buyer@example.com',
            'role' => 'buyer',
            'phone_number' => '09171234567',
            'email_verified_at' => now(),
        ]);

        $this->buyer->addresses()->create([
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'street_address' => 'Block 1 Lot 2 Acacia St.',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'full_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'is_default' => true,
        ]);

        $this->sellerA = User::factory()->artisanApproved()->create([
            'name' => 'Maria Artisan',
            'shop_name' => 'Maria Pottery Studio',
            'email' => 'maria@example.com',
            'phone_number' => '09181234567',
            'city' => 'Silang',
            'street_address' => 'Purok 3, Biga',
            'barangay' => 'Biga I',
            'region' => 'Cavite',
            'zip_code' => '4118',
        ]);

        $this->sellerA->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        $this->sellerB = User::factory()->artisanApproved()->create([
            'name' => 'Pedro Weaves',
            'shop_name' => 'Pedro Loom Crafts',
            'email' => 'pedro@example.com',
            'phone_number' => '09191234567',
            'city' => 'Tagaytay',
            'street_address' => 'Aguinaldo Highway',
            'barangay' => 'Mendez',
            'region' => 'Cavite',
            'zip_code' => '4120',
        ]);

        $this->sellerB->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        $this->productA = Product::create([
            'user_id' => $this->sellerA->id,
            'artisan_id' => $this->sellerA->id,
            'name' => 'Handmade Clay Mug',
            'sku' => 'MUG-001',
            'category' => 'Mugs',
            'status' => 'Active',
            'price' => 250.00,
            'cost_price' => 80.00,
            'stock' => 15,
            'sold' => 0,
            'rating' => 0,
            'reviews_count' => 0,
            'lead_time' => '2 days',
            'cover_photo_path' => 'products/mug.jpg',
            'production_method' => 'manufactured',
        ]);

        $this->productB = Product::create([
            'user_id' => $this->sellerB->id,
            'artisan_id' => $this->sellerB->id,
            'name' => 'Woven Abaca Coaster',
            'sku' => 'COAST-001',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 120.00,
            'cost_price' => 40.00,
            'stock' => 20,
            'sold' => 0,
            'rating' => 0,
            'reviews_count' => 0,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/coaster.jpg',
            'production_method' => 'ready_stock',
        ]);
    }

    /**
     * TEST 1: End-to-End COD with Delivery (Lalamove logistics quote, checkout, BOM deduction, proof uploads, receipt & reviews)
     */
    public function test_complete_cod_delivery_order_lifecycle(): void
    {
        // 1. Setup BOM recipes for Product A (Clay Supply)
        $claySupply = Supply::create([
            'user_id' => $this->sellerA->id,
            'name' => 'Terracotta Clay',
            'category' => 'Raw Clay',
            'unit' => 'kg',
            'quantity' => 50,
            'unit_cost' => 30.00,
        ]);

        ProductRecipe::create([
            'product_id' => $this->productA->id,
            'supply_id' => $claySupply->id,
            'quantity_required' => 2,
        ]);

        // 2. Add to Cart (Qty: 2)
        $cart = [
            $this->productA->id . ':standard' => [
                'id' => $this->productA->id,
                'cart_key' => $this->productA->id . ':standard',
                'name' => $this->productA->name,
                'variant' => 'Standard',
                'sku' => $this->productA->sku,
                'price' => $this->productA->price,
                'qty' => 2,
                'artisan_id' => $this->sellerA->id,
                'seller' => $this->sellerA->shop_name,
            ]
        ];
        Session::put('cart', $cart);

        // 3. Shipping Quote Calculation
        $quoteResponse = $this->actingAs($this->buyer)->postJson(route('checkout.shipping-quote'), [
            'items' => [['id' => $this->productA->id, 'qty' => 2, 'variant' => 'Standard']],
            'shipping_method' => 'Delivery',
            'shipping_street_address' => 'Block 1 Lot 2 Acacia St.',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'shipping_address_type' => 'home',
        ]);

        $quoteResponse->assertOk();
        $this->assertArrayHasKey('total_shipping_fee', $quoteResponse->json());

        // 4. Place Order via Checkout
        $checkoutResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 2, 'variant' => 'Standard']],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => 'Block 1 Lot 2 Acacia St.',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'shipping_address_type' => 'home',
            'total' => 565.00,
        ]);

        $checkoutResponse->assertRedirect(route('my-orders.index'));
        $checkoutResponse->assertSessionHas('success');

        // Verify stock deducted
        $this->assertSame(13, $this->productA->fresh()->stock);

        // Verify Order Created
        $order = Order::where('user_id', $this->buyer->id)->first();
        $this->assertNotNull($order);
        $this->assertSame('Pending', $order->status);
        $this->assertSame('COD', $order->payment_method);
        $this->assertSame('pending', $order->payment_status);
        $this->assertEquals(500.00, $order->merchandise_subtotal);
        $this->assertEquals(15.00, $order->convenience_fee_amount); // 3% fee

        // Verify notifications sent
        Mail::assertSent(OrderPlaced::class);
        Notification::assertSentTo($this->sellerA, NewOrderNotification::class);

        // 5. Seller Accepts Order
        $acceptResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Accepted',
        ]);
        $acceptResponse->assertRedirect();
        $this->assertSame('Accepted', $order->fresh()->status);
        Mail::assertSent(OrderAccepted::class);

        // 6. Seller Moves to Processing -> BOM Supplies Deducted (2 items * 2kg = 4kg deducted)
        $processResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Processing',
        ]);
        $processResponse->assertRedirect();
        $this->assertSame('Processing', $order->fresh()->status);
        $this->assertSame(46, (int) $claySupply->fresh()->quantity);

        // 7. Seller Ships Order with Proof of Delivery
        $shipResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Shipped',
            'tracking_number' => 'TRACK-COD-999',
            'proof_of_delivery' => UploadedFile::fake()->image('package_packed.jpg'),
        ]);
        $shipResponse->assertRedirect();
        $this->assertSame('Shipped', $order->fresh()->status);
        $this->assertSame('TRACK-COD-999', $order->fresh()->tracking_number);
        Mail::assertSent(OrderShipped::class);

        // 8. Seller Marks as Delivered with Delivery Proof
        $deliverResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Delivered',
            'proof_of_delivery' => UploadedFile::fake()->image('doorstep_dropoff.jpg'),
        ]);
        $deliverResponse->assertRedirect();
        $this->assertSame('Delivered', $order->fresh()->status);
        $this->assertNotNull($order->fresh()->warranty_expires_at);

        // 9. Buyer Confirms Order Received
        $receiveResponse = $this->actingAs($this->buyer)->post(route('my-orders.receive', $order->id));
        $receiveResponse->assertRedirect();
        $this->assertSame('Completed', $order->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNotNull($order->fresh()->received_at);
        $this->assertSame(2, (int) $this->productA->fresh()->sold);
        Mail::assertSent(OrderDelivered::class);

        // 10. Buyer Submits Review
        $reviewResponse = $this->actingAs($this->buyer)->post(route('reviews.store'), [
            'product_id' => $this->productA->id,
            'order_id' => $order->id,
            'rating' => 5,
            'comment' => 'Exceptional handcrafted quality!',
        ]);
        $reviewResponse->assertRedirect();

        $this->assertDatabaseHas('reviews', [
            'product_id' => $this->productA->id,
            'user_id' => $this->buyer->id,
            'rating' => 5,
        ]);
        $this->assertEquals(5.00, $this->productA->fresh()->rating);
        $this->assertSame(1, (int) $this->productA->fresh()->reviews_count);
    }

    /**
     * TEST 2: End-to-End Store Pick-Up (Self-Pickup) Order Lifecycle
     */
    public function test_complete_pickup_order_lifecycle(): void
    {
        // Place Pickup Order
        $checkoutResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productB->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 120.00,
        ]);

        $checkoutResponse->assertRedirect(route('my-orders.index'));

        $order = Order::where('user_id', $this->buyer->id)->where('shipping_method', 'Pick Up')->first();
        $this->assertNotNull($order);
        $this->assertSame('Pick Up', $order->shipping_method);
        $this->assertEquals(0.00, (float) $order->convenience_fee_amount);
        $this->assertEquals(0.00, (float) $order->shipping_fee_amount);
        $this->assertEquals(120.00, (float) $order->total_amount);

        // Seller Accepts
        $this->actingAs($this->sellerB)->post(route('orders.update', $order->order_number), [
            'status' => 'Accepted',
        ]);

        // Seller moves to Processing
        $this->actingAs($this->sellerB)->post(route('orders.update', $order->order_number), [
            'status' => 'Processing',
        ]);

        // Seller marks Ready for Pickup (Requires readiness proof photo)
        $readyResponse = $this->actingAs($this->sellerB)->post(route('orders.update', $order->order_number), [
            'status' => 'Ready for Pickup',
            'proof_of_delivery' => UploadedFile::fake()->image('ready_on_counter.jpg'),
        ]);
        $readyResponse->assertRedirect();
        $this->assertSame('Ready for Pickup', $order->fresh()->status);

        // Seller marks Delivered upon in-person handover
        $deliverResponse = $this->actingAs($this->sellerB)->post(route('orders.update', $order->order_number), [
            'status' => 'Delivered',
            'proof_of_delivery' => UploadedFile::fake()->image('handover_photo.jpg'),
        ]);
        $deliverResponse->assertRedirect();
        $this->assertSame('Delivered', $order->fresh()->status);

        // Buyer Confirms Pickup Receipt
        $receiveResponse = $this->actingAs($this->buyer)->post(route('my-orders.receive', $order->id));
        $receiveResponse->assertRedirect();
        $this->assertSame('Completed', $order->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame(1, (int) $this->productB->fresh()->sold);
    }

    /**
     * TEST 3: End-to-End Online Payment (GCash / PayMongo) with Webhook Verification & Shipping Guards
     */
    public function test_complete_gcash_paymongo_online_payment_lifecycle(): void
    {
        // 1. Buyer places GCash Delivery order
        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Delivery',
            'payment_method' => 'GCash',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => 'Block 1 Lot 2 Acacia St.',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'shipping_address_type' => 'home',
            'total' => 307.50,
        ]);

        $order = Order::where('user_id', $this->buyer->id)->where('payment_method', 'GCash')->first();
        $this->assertNotNull($order);
        $this->assertSame('pending', $order->payment_status);

        // 2. Mock PayMongo Service to create checkout session
        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function ($data) use ($order) {
                return $data['reference_number'] === $order->order_number
                    && in_array('gcash', $data['payment_method_types'], true);
            }))
            ->andReturn([
                'id' => 'cs_test_session_abc123',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.com/cs_test_session_abc123',
                ]
            ]);
        $this->app->instance(PayMongoService::class, $paymongoMock);

        // 3. Initiate payment (Inertia external location redirect)
        $payResponse = $this->actingAs($this->buyer)->get(route('payment.pay', $order->order_number));
        $payResponse->assertRedirect('https://checkout.paymongo.com/cs_test_session_abc123');
        $this->assertSame('cs_test_session_abc123', $order->fresh()->paymongo_session_id);

        // 4. Seller accepts order
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Accepted',
        ]);
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Processing',
        ]);

        // 5. GUARD CHECK: Seller attempts to ship UNPAID online order -> MUST BE REJECTED
        $illegalShipResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Shipped',
            'proof_of_delivery' => UploadedFile::fake()->image('shipped.jpg'),
        ]);
        $illegalShipResponse->assertSessionHas('error');
        $this->assertSame('Processing', $order->fresh()->status); // Not allowed to ship!

        // 6. PayMongo Webhook arrives with valid signature
        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_test_session_abc123',
                        'attributes' => [
                            'payment_status' => 'paid',
                        ]
                    ]
                ]
            ]
        ];
        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'test_whsk_secret_123');

        $webhookResponse = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $webhookResponse->assertOk();
        $this->assertSame('paid', $order->fresh()->payment_status);

        // 7. Now seller can successfully ship the paid order
        $validShipResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Shipped',
            'proof_of_delivery' => UploadedFile::fake()->image('shipped.jpg'),
        ]);
        $validShipResponse->assertRedirect();
        $this->assertSame('Shipped', $order->fresh()->status);
    }

    /**
     * TEST 4: Buyer Cancellation Before Acceptance (Restores Finished Stock & Linked Supply)
     */
    public function test_buyer_cancellation_restores_inventory(): void
    {
        $initialStock = $this->productA->stock;

        // Place order (Qty: 3)
        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 3, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 750.00,
        ]);

        $this->assertSame($initialStock - 3, $this->productA->fresh()->stock);
        $order = Order::where('user_id', $this->buyer->id)->first();

        // Buyer Cancels
        $cancelResponse = $this->actingAs($this->buyer)->post(route('my-orders.cancel', $order->id));
        $cancelResponse->assertRedirect();
        $cancelResponse->assertSessionHas('success');

        $this->assertSame('Cancelled', $order->fresh()->status);
        $this->assertSame('buyer_cancelled', $order->fresh()->cancellation_reason);
        // Stock restored!
        $this->assertSame($initialStock, $this->productA->fresh()->stock);
        Mail::assertSent(OrderCancelled::class);
    }

    /**
     * TEST 5: Return, Refund & Replacement Lifecycle
     */
    public function test_return_refund_and_replacement_flows(): void
    {
        // 1. Create a Completed Order
        $order = Order::create([
            'order_number' => 'ORD-RETURN-TEST',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->sellerA->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 250.00,
            'convenience_fee_amount' => 7.50,
            'total_amount' => 257.50,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22), // Within 1-day warranty window
        ]);

        $order->items()->create([
            'product_id' => $this->productA->id,
            'product_name' => $this->productA->name,
            'variant' => 'Standard',
            'price' => 250.00,
            'cost' => 80.00,
            'quantity' => 1,
            'product_img' => 'products/mug.jpg',
        ]);

        // 2. Buyer Requests Return
        $returnResponse = $this->actingAs($this->buyer)->post(route('my-orders.return', $order->id), [
            'return_reason' => 'Handle was chipped on delivery',
            'return_proof_image' => UploadedFile::fake()->image('broken_handle.jpg'),
        ]);
        $returnResponse->assertRedirect();
        $this->assertSame('Refund/Return', $order->fresh()->status);
        Mail::assertSent(ReturnRequested::class);

        // 3. Option A: Seller Approves Replacement
        $initialStock = $this->productA->fresh()->stock;
        $replaceResponse = $this->actingAs($this->sellerA)->post(route('orders.approve-return', $order->order_number), [
            'action_type' => 'replace',
            'replacement_resolution_description' => 'We will send a fresh newly-glazed replacement item.',
        ]);
        $replaceResponse->assertRedirect();
        
        $order->refresh();
        $this->assertSame('Accepted', $order->status);
        $this->assertNotNull($order->replacement_started_at);
        // Replacement stock deducted
        $this->assertSame($initialStock - 1, $this->productA->fresh()->stock);
        Notification::assertSentTo($this->buyer, ReplacementResolutionNotification::class);
    }

    /**
     * TEST 6: Multi-Seller Cart Split Checkout (Orders split per artisan cleanly)
     */
    public function test_multi_seller_cart_split_creates_independent_orders(): void
    {
        $checkoutResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $this->productA->id, 'qty' => 1, 'variant' => 'Standard'],
                ['id' => $this->productB->id, 'qty' => 2, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 490.00, // 250 + (120*2)
        ]);

        $checkoutResponse->assertRedirect(route('my-orders.index'));

        $orders = Order::where('user_id', $this->buyer->id)->get();
        $this->assertCount(2, $orders);

        $orderA = $orders->firstWhere('artisan_id', $this->sellerA->id);
        $orderB = $orders->firstWhere('artisan_id', $this->sellerB->id);

        $this->assertNotNull($orderA);
        $this->assertNotNull($orderB);
        $this->assertEquals(250.00, (float) $orderA->merchandise_subtotal);
        $this->assertEquals(240.00, (float) $orderB->merchandise_subtotal);
        $this->assertSame('Pick Up', $orderA->shipping_method);
        $this->assertSame('Pick Up', $orderB->shipping_method);
    }

    /**
     * TEST 7: Admin Purchase Gating
     */
    public function test_admin_is_strictly_forbidden_from_checking_out(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $checkoutResponse = $this->actingAs($admin)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 250.00,
        ]);

        $checkoutResponse->assertStatus(403);
    }

    /**
     * TEST 8: Seller Rejection during Processing restores Product Stock AND BOM Supplies
     */
    public function test_seller_rejection_during_processing_restores_product_stock_and_bom_supplies(): void
    {
        $claySupply = Supply::create([
            'user_id' => $this->sellerA->id,
            'name' => 'Stoneware Clay',
            'category' => 'Raw Clay',
            'unit' => 'kg',
            'quantity' => 100,
            'unit_cost' => 45.00,
        ]);

        ProductRecipe::create([
            'product_id' => $this->productA->id,
            'supply_id' => $claySupply->id,
            'quantity_required' => 5,
        ]);

        $initialProductStock = $this->productA->stock; // 15

        // Buyer orders 2 items
        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 2, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 500.00,
        ]);

        $this->assertSame($initialProductStock - 2, $this->productA->fresh()->stock); // 13
        $order = Order::where('user_id', $this->buyer->id)->first();

        // Seller Accepts & Moves to Processing (Deducts 2 * 5 = 10kg)
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), ['status' => 'Accepted']);
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), ['status' => 'Processing']);

        $this->assertSame(90, (int) $claySupply->fresh()->quantity);

        // Seller Rejects/Cancels from Processing
        $rejectResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Rejected',
        ]);
        $rejectResponse->assertRedirect();

        $this->assertSame('Rejected', $order->fresh()->status);
        $this->assertSame('seller_rejected', $order->fresh()->cancellation_reason);
        // Product stock restored
        $this->assertSame($initialProductStock, $this->productA->fresh()->stock);
        // BOM raw material restored
        $this->assertSame(100, (int) $claySupply->fresh()->quantity);
        Mail::assertSent(OrderCancelled::class);
    }

    /**
     * TEST 9: Seller Approving Refund on Return Request
     */
    public function test_seller_approving_refund_marks_order_as_refunded(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-REFUND-APPROVE',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->sellerA->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 250.00,
            'convenience_fee_amount' => 7.50,
            'total_amount' => 257.50,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'received_at' => now()->subHours(1),
            'warranty_expires_at' => now()->addHours(23),
        ]);

        $order->items()->create([
            'product_id' => $this->productA->id,
            'product_name' => $this->productA->name,
            'variant' => 'Standard',
            'price' => 250.00,
            'quantity' => 1,
        ]);

        // Buyer Requests Return
        $this->actingAs($this->buyer)->post(route('my-orders.return', $order->id), [
            'return_reason' => 'Defective glaze texture',
            'return_proof_image' => UploadedFile::fake()->image('defect.jpg'),
        ]);

        // Seller Approves Refund
        $refundResponse = $this->actingAs($this->sellerA)->post(route('orders.approve-return', $order->order_number), [
            'action_type' => 'refund',
        ]);
        $refundResponse->assertRedirect();

        $this->assertSame('Refunded', $order->fresh()->status);
        $this->assertSame('refunded', $order->fresh()->payment_status);
        Mail::assertSent(RefundProcessed::class);
    }

    /**
     * TEST 10: Buyer cannot cancel order after seller acceptance
     */
    public function test_buyer_cannot_cancel_order_after_seller_acceptance(): void
    {
        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 250.00,
        ]);

        $order = Order::where('user_id', $this->buyer->id)->first();
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), ['status' => 'Accepted']);

        // Buyer tries to cancel accepted order
        $cancelResponse = $this->actingAs($this->buyer)->post(route('my-orders.cancel', $order->id));
        $cancelResponse->assertRedirect();
        $cancelResponse->assertSessionHas('error');

        $this->assertSame('Accepted', $order->fresh()->status);
    }

    /**
     * TEST 11: Insufficient stock prevents checkout
     */
    public function test_insufficient_stock_prevents_order_placement(): void
    {
        $this->productA->update(['stock' => 1]);

        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 5, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 1250.00,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('orders', ['user_id' => $this->buyer->id]);
        $this->assertSame(1, $this->productA->fresh()->stock); // Stock unchanged
    }

    /**
     * TEST 12: PayMongo minimum amount guard (< PHP 100)
     */
    public function test_paymongo_online_payment_minimum_amount_guard(): void
    {
        $cheapProduct = Product::create([
            'user_id' => $this->sellerA->id,
            'artisan_id' => $this->sellerA->id,
            'name' => 'Mini Sticker',
            'sku' => 'STK-001',
            'category' => 'Art',
            'status' => 'Active',
            'price' => 50.00,
            'stock' => 10,
        ]);

        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $cheapProduct->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'GCash',
            'total' => 50.00,
        ]);

        $order = Order::where('user_id', $this->buyer->id)->first();

        // Attempting to initiate PayMongo payment for < 100 PHP should be blocked
        $payResponse = $this->actingAs($this->buyer)->get(route('payment.pay', $order->order_number));
        $payResponse->assertRedirect();
        $payResponse->assertSessionHas('error');
    }

    /**
     * TEST 13: Discount coupon sales tracking and promotion limit during checkout
     */
    public function test_discount_promo_sales_tracking_and_application_during_checkout(): void
    {
        $discount = Discount::create([
            'user_id' => $this->sellerA->id,
            'name' => 'Holiday Sale',
            'type' => 'percentage',
            'value' => 20, // 20% off
            'is_active' => true,
            'start_at' => now()->subDay(),
            'end_at' => now()->addWeek(),
            'promo_sold' => 0,
            'max_purchase_limit' => 5,
        ]);

        $discount->products()->attach($this->productA->id);

        $checkoutResponse = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 3, 'variant' => 'Standard']],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'total' => 600.00, // 3 * 200 (250 - 20%)
        ]);

        $checkoutResponse->assertRedirect(route('my-orders.index'));
        $this->assertSame(3, (int) $discount->fresh()->promo_sold);
    }

    /**
     * TEST 14: Seller can book Lalamove from Processing state (after raw materials deducted)
     */
    public function test_seller_can_book_lalamove_from_processing_state(): void
    {
        $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->productA->id, 'qty' => 1, 'variant' => 'Standard']],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => 'Block 1 Lot 2 Acacia St.',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address' => 'Block 1 Lot 2 Acacia St., Burol I, Dasmariñas, Cavite, 4114',
            'shipping_address_type' => 'home',
            'total' => 307.50,
        ]);

        $order = Order::where('user_id', $this->buyer->id)->first();

        // Seller accepts and moves to Processing
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), ['status' => 'Accepted']);
        $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), ['status' => 'Processing']);
        $this->assertSame('Processing', $order->fresh()->status);

        // Mock Geocoding and Lalamove
        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::any(), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller Studio, Silang, Cavite',
                'matched_query' => 'Silang, Cavite',
            ]);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::any(), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer Home, Dasmariñas, Cavite',
                'matched_query' => 'Dasmariñas, Cavite',
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')->once()->andReturn([
            'quotationId' => 'qt_proc_123',
            'serviceType' => 'MOTORCYCLE',
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 150.00],
            'stops' => [
                ['stopId' => 'stop_p'],
                ['stopId' => 'stop_d'],
            ],
        ]);
        $lalamove->shouldReceive('normalizePhone')->times(2)->andReturn('+639171234567');
        $lalamove->shouldReceive('createOrder')->once()->andReturn([
            'orderId' => 'llm_proc_order_456',
            'status' => 'ASSIGNING_DRIVER',
            'shareLink' => 'https://track.lalamove.test/llm_proc_order_456',
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 150.00],
        ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        // Book Lalamove while in Processing!
        $lalamoveResponse = $this->actingAs($this->sellerA)->post(route('orders.lalamove.store', $order->order_number));
        $lalamoveResponse->assertRedirect();
        $lalamoveResponse->assertSessionHas('success');

        $this->assertSame('Shipped', $order->fresh()->status);
        $this->assertSame('llm_proc_order_456', $order->fresh()->tracking_number);

        // Now test manual Mark as Delivered with proof
        $deliverResponse = $this->actingAs($this->sellerA)->post(route('orders.update', $order->order_number), [
            'status' => 'Delivered',
            'proof_of_delivery' => UploadedFile::fake()->image('lalamove_received_proof.jpg'),
        ]);
        $deliverResponse->assertRedirect();
        $deliverResponse->assertSessionHas('success');
        $this->assertSame('Delivered', $order->fresh()->status);
    }
}

