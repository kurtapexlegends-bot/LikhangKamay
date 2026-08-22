<?php

namespace Tests\Feature\Audit;

use App\Actions\Consumer\CancelOrder;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\HR\PayrollCalculatorService;
use App\Services\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuditBugFixesRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_storage_url_resolves_without_crashing_when_config_cached(): void
    {
        $url = StorageUrl::url('products/test_image.jpg');
        $this->assertNotEmpty($url);
        $this->assertStringContainsString('products/test_image.jpg', $url);
    }

    public function test_paymongo_webhook_marks_all_orders_in_session_as_paid(): void
    {
        $sellerA = User::factory()->artisanApproved()->create();
        $sellerB = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $orderA = Order::create([
            'order_number' => 'ORD-AAA111',
            'user_id' => $buyer->id,
            'artisan_id' => $sellerA->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500.00,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_multi_session_123',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
        ]);

        $orderB = Order::create([
            'order_number' => 'ORD-BBB222',
            'user_id' => $buyer->id,
            'artisan_id' => $sellerB->id,
            'customer_name' => $buyer->name,
            'total_amount' => 750.00,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_multi_session_123',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
        ]);

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_test_multi_session_123',
                        'attributes' => [
                            'payment_status' => 'paid',
                        ],
                    ],
                ],
            ],
        ];

        $secret = 'whsec_test_secret_key';
        config(['services.paymongo.webhook_secret' => $secret]);

        $timestamp = time();
        $rawContent = json_encode($payload);
        $signature = hash_hmac('sha256', $timestamp . '.' . $rawContent, $secret);
        $sigHeader = "t={$timestamp},te=,v1={$signature}";

        $response = $this->postJson(route('webhooks.paymongo'), $payload, [
            'paymongo-signature' => $sigHeader,
        ]);

        $response->assertOk();
        $this->assertSame('paid', $orderA->fresh()->payment_status);
        $this->assertSame('paid', $orderB->fresh()->payment_status);
    }

    public function test_cancelling_order_restores_promo_sold_quota(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Flash Sale 20%',
            'type' => 'percentage',
            'value' => 20,
            'discount_percent' => 20,
            'max_purchase_limit' => 10,
            'promo_sold' => 3,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(5),
            'is_active' => true,
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Handcrafted Mug',
            'sku' => 'MUG-99',
            'category' => 'Pottery',
            'description' => 'A nice mug',
            'stock' => 5,
            'price' => 200,
            'status' => 'approved',
        ]);

        $discount->products()->attach($product->id);

        $order = Order::create([
            'order_number' => 'ORD-DISCOUNT-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 480.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 160.00,
            'cost' => 80.00,
            'quantity' => 3,
        ]);

        $action = new CancelOrder();
        $action->execute($order->id, $buyer);

        $this->assertSame('Cancelled', $order->fresh()->status);
        $this->assertSame(8, (int) $product->fresh()->stock); // 5 + 3
        $this->assertSame(0, (int) $discount->fresh()->promo_sold); // 3 - 3
    }

    public function test_payroll_calculation_guards_against_zero_workday_hours(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'standard_workday_hours' => 0,
            'payroll_working_days' => 22,
        ]);

        $employee = \App\Models\Employee::create([
            'user_id' => $seller->id,
            'name' => 'Test Employee',
            'role' => 'Craftsman',
            'salary' => 25000.00,
            'join_date' => now(),
            'email' => 'employee@example.com',
            'phone' => '09123456789',
            'is_active' => true,
        ]);

        $service = new PayrollCalculatorService();
        $result = $service->calculateEmployeeRow($employee, [
            'absences_days' => 0,
            'undertime_hours' => 0,
            'overtime_hours' => 2,
        ], $seller);

        $this->assertIsArray($result);
        $this->assertGreaterThan(0, $result['overtime_pay']);
    }

    public function test_buyer_review_comment_is_sanitized(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Reviewable Vase',
            'sku' => 'VASE-10',
            'category' => 'Pottery',
            'description' => 'A nice vase',
            'stock' => 10,
            'price' => 1000,
            'status' => 'approved',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-REV-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 1000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 1000.00,
            'cost' => 500.00,
            'quantity' => 1,
        ]);

        $rawComment = '<script>alert("xss")</script>Great product! <b onclick="evil()">Nice finish</b>';

        $response = $this->actingAs($buyer)->post(route('reviews.store'), [
            'product_id' => $product->id,
            'rating' => 5,
            'comment' => $rawComment,
        ]);

        $review = Review::where('user_id', $buyer->id)->where('product_id', $product->id)->first();
        $this->assertNotNull($review);
        $this->assertStringNotContainsString('<script>', $review->comment);
        $this->assertStringNotContainsString('onclick', $review->comment);
        $this->assertStringContainsString('Great product!', $review->comment);
    }

    public function test_admin_payouts_index_renders_with_preaggregated_metrics(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisanA = User::factory()->artisanApproved()->create(['shop_name' => 'Artisan A']);
        $artisanB = User::factory()->artisanApproved()->create(['shop_name' => 'Artisan B']);

        $response = $this->actingAs($admin)->get(route('admin.payouts.index'));
        $response->assertOk();
    }

    public function test_hr_timecard_audit_handles_malformed_month_gracefully(): void
    {
        $seller = User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);
        $employee = \App\Models\Employee::create([
            'user_id' => $seller->id,
            'name' => 'John Craftsman',
            'role' => 'Artisan',
            'salary' => 20000.00,
            'join_date' => now(),
            'email' => 'craftsman@example.com',
            'phone' => '09123456789',
            'is_active' => true,
        ]);

        $response = $this->actingAs($seller)->get(route('hr.employees.time-card', [
            'employee' => $employee->id,
            'month' => 'undefined_invalid_month',
        ]));

        $response->assertOk();
    }

    public function test_seller_rejecting_order_restores_promo_sold_quota(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Artisan Flash Sale',
            'type' => 'percentage',
            'value' => 15,
            'discount_percent' => 15,
            'max_purchase_limit' => 5,
            'promo_sold' => 2,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(5),
            'is_active' => true,
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Handmade Pot',
            'sku' => 'POT-10',
            'category' => 'Pottery',
            'description' => 'A nice pot',
            'stock' => 10,
            'price' => 300,
            'status' => 'approved',
        ]);

        $discount->products()->attach($product->id);

        $order = Order::create([
            'order_number' => 'ORD-SELLER-REJECT-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 510.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 255.00,
            'cost' => 100.00,
            'quantity' => 2,
        ]);

        $action = app(\App\Actions\Seller\Orders\UpdateOrderStatus::class);
        $action->execute($order, ['status' => 'Rejected'], $seller, null);

        $this->assertSame('Rejected', $order->fresh()->status);
        $this->assertSame(12, (int) $product->fresh()->stock); // 10 + 2
        $this->assertSame(0, (int) $discount->fresh()->promo_sold); // 2 - 2
    }

    public function test_platform_audit_command_runs_successfully(): void
    {
        $this->artisan('platform:audit')
            ->assertExitCode(0);
    }

    public function test_searchable_handles_punctuation_only_query_gracefully(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Ceramic Bowl',
            'sku' => 'BOWL-1',
            'category' => 'Pottery',
            'description' => 'A nice bowl',
            'stock' => 5,
            'price' => 200,
            'status' => 'approved',
        ]);

        $results = Product::search('???---!!!')->get();
        $this->assertNotNull($results);
    }

    public function test_review_model_and_product_resource_resolve_cloud_storage_photo_urls(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Woven Mat',
            'sku' => 'MAT-1',
            'category' => 'Weaving',
            'stock' => 5,
            'price' => 500,
            'status' => 'approved',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 5,
            'comment' => 'Excellent quality',
            'photos' => ['reviews/photo1.jpg', 'reviews/photo2.jpg'],
        ]);

        $this->assertCount(2, $review->photo_urls);
        $this->assertStringContainsString('reviews/photo1.jpg', $review->photo_urls[0]);

        $resource = (new \App\Http\Resources\Consumer\ProductDetailResource($product->fresh(['reviews.user'])))->toArray(request());
        $this->assertNotEmpty($resource['reviews']);
        $this->assertCount(2, $resource['reviews'][0]['photo_urls']);
    }

    public function test_message_models_resolve_cloud_storage_attachment_urls(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $directMessage = \App\Models\Message::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'message' => 'Here is the invoice',
            'attachment_path' => 'chat_attachments/invoice.pdf',
            'attachment_type' => 'document',
        ]);

        $this->assertNotNull($directMessage->attachment_url);
        $this->assertStringContainsString('chat_attachments/invoice.pdf', $directMessage->attachment_url);

        $teamMessage = \App\Models\TeamMessage::create([
            'seller_owner_id' => $sender->id,
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'message' => 'Here is the image',
            'attachment_path' => 'chat_attachments/sample.jpg',
            'attachment_type' => 'image',
        ]);

        $this->assertNotNull($teamMessage->attachment_url);
        $this->assertStringContainsString('chat_attachments/sample.jpg', $teamMessage->attachment_url);
    }

    public function test_order_casts_reminder_flags_to_boolean(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-BOOL-TEST-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Dasmarinas City, Cavite, 4114',
            'review_reminder_sent' => false,
            'shipment_reminder_sent' => false,
        ]);

        $fresh = Order::find($order->id);
        $this->assertIsBool($fresh->review_reminder_sent);
        $this->assertIsBool($fresh->shipment_reminder_sent);
        $this->assertFalse($fresh->review_reminder_sent);
        $this->assertFalse($fresh->shipment_reminder_sent);
    }

    public function test_admin_analytics_service_properly_excludes_cancelled_and_refunded_orders(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Completed order
        Order::create([
            'order_number' => 'ORD-COMP-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 1000.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Cavite',
        ]);

        // Cancelled order (should NOT be in GMV)
        Order::create([
            'order_number' => 'ORD-CANC-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 5000.00,
            'status' => 'Cancelled',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Cavite',
        ]);

        // Refunded order (should be counted in refundRate, not in GMV)
        Order::create([
            'order_number' => 'ORD-REF-1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'total_amount' => 500.00,
            'status' => 'Refunded',
            'payment_method' => 'GCash',
            'payment_status' => 'refunded',
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St, Cavite',
        ]);

        $service = new \App\Services\Admin\AdminAnalyticsService();
        $data = $service->getInsightsData();

        $this->assertEquals(1000.00, $data['transactions']['currentGmv']);
        $this->assertGreaterThan(0, $data['health']['completionRate']);
        $this->assertGreaterThan(0, $data['health']['refundRate']);
    }
}
