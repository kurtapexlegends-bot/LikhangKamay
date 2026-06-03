<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Dispute;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DisputeWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_file_dispute_with_photos(): void
    {
        Storage::fake('public');
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-001',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 200,
            'total_amount' => 200,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'received_at' => now()->subHours(12),
            'warranty_expires_at' => now()->addHours(12),
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $file1 = UploadedFile::fake()->image('damage1.jpg');
        $file2 = UploadedFile::fake()->image('damage2.jpg');

        $response = $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'reason' => 'Item arrived completely shattered.',
                'proof_photos' => [$file1, $file2],
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // Order status must be Refund/Return
        $order->refresh();
        $this->assertEquals('Refund/Return', $order->status);

        // Dispute must exist
        $dispute = Dispute::where('order_id', $order->id)->first();
        $this->assertNotNull($dispute);
        $this->assertEquals('pending', $dispute->status);
        $this->assertEquals('Item arrived completely shattered.', $dispute->reason);
        $this->assertCount(2, $dispute->proof_photos);

        // Check if files were saved
        Storage::disk('public')->assertExists($dispute->proof_photos[0]);
        Storage::disk('public')->assertExists($dispute->proof_photos[1]);

        // Seller must have received RefundRequestNotification
        Notification::assertSentTo($seller, \App\Notifications\RefundRequestNotification::class);
    }

    public function test_buyer_cannot_file_dispute_outside_warranty(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-002',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 200,
            'total_amount' => 200,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'received_at' => now()->subDays(2),
            'warranty_expires_at' => now()->subDays(1),
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $file = UploadedFile::fake()->image('damage.jpg');

        $response = $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'reason' => 'Damaged product.',
                'proof_photos' => [$file],
            ]);

        $response->assertSessionHasErrors();
        $this->assertEquals(0, Dispute::count());
    }

    public function test_seller_can_accept_dispute(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-003',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'pending',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
        ]);

        $response = $this->actingAs($seller)
            ->post(route('disputes.respond', $dispute->id), [
                'response_type' => 'accept',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $order->refresh();

        $this->assertEquals('seller_accepted', $dispute->status);
        $this->assertEquals('Refunded', $order->status);
        $this->assertEquals('refunded', $order->payment_status);

        // Buyer must have received DisputeStatusNotification
        Notification::assertSentTo($buyer, \App\Notifications\DisputeStatusNotification::class);
    }

    public function test_seller_can_reject_dispute(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-004',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'pending',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
        ]);

        $response = $this->actingAs($seller)
            ->post(route('disputes.respond', $dispute->id), [
                'response_type' => 'reject',
                'seller_explanation' => 'Images show no damage, it is a normal texture of clay.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $this->assertEquals('seller_rejected', $dispute->status);
        $this->assertEquals('Images show no damage, it is a normal texture of clay.', $dispute->seller_explanation);

        // Order remains in Refund/Return status so buyer can react
        $order->refresh();
        $this->assertEquals('Refund/Return', $order->status);

        Notification::assertSentTo($buyer, \App\Notifications\DisputeStatusNotification::class);
    }

    public function test_seller_can_propose_replacement(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-005',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'pending',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
        ]);

        $response = $this->actingAs($seller)
            ->post(route('disputes.respond', $dispute->id), [
                'response_type' => 'replacement',
                'seller_proposed_description' => 'I can ship another one tomorrow morning.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $this->assertEquals('seller_proposed_replacement', $dispute->status);
        $this->assertEquals('I can ship another one tomorrow morning.', $dispute->seller_proposed_description);

        Notification::assertSentTo($buyer, \App\Notifications\DisputeStatusNotification::class);
    }

    public function test_buyer_can_accept_replacement_offer(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'TEST-SKU-1',
            'name' => 'Test Clay Vase',
            'description' => 'Fine clay',
            'category' => 'Vase',
            'status' => 'Active',
            'price' => 200,
            'cost_price' => 80,
            'stock' => 5,
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-006',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Self Pickup',
            'shipping_address' => 'Cavite',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 200,
            'quantity' => 1,
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'seller_proposed_replacement',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
            'seller_proposed_description' => 'Brand new piece',
        ]);

        $response = $this->actingAs($buyer)
            ->post(route('disputes.react', $dispute->id), [
                'action' => 'accept_replacement',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $order->refresh();
        $product->refresh();

        $this->assertEquals('resolved_replacement', $dispute->status);
        $this->assertEquals('Accepted', $order->status);
        $this->assertEquals('Brand new piece', $order->replacement_resolution_description);
        $this->assertNotNull($order->replacement_started_at);
        $this->assertEquals(4, $product->stock); // Decremented stock by 1

        Notification::assertSentTo($seller, \App\Notifications\ReplacementResolutionNotification::class);
    }

    public function test_buyer_can_escalate_dispute(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-007',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'seller_rejected',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
        ]);

        $response = $this->actingAs($buyer)
            ->post(route('disputes.react', $dispute->id), [
                'action' => 'escalate',
                'escalation_reason' => 'The seller claims it is natural, but it is a giant crack that leaks water.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $this->assertEquals('escalated', $dispute->status);
        $this->assertEquals('The seller claims it is natural, but it is a giant crack that leaks water.', $dispute->escalation_reason);

        // Admin must be notified
        Notification::assertSentTo($admin, \App\Notifications\DisputeStatusNotification::class);
    }

    public function test_admin_can_arbitrate_refund(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-008',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'escalated',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
            'escalation_reason' => 'Huge crack.',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.disputes.arbitrate', $dispute->id), [
                'decision' => 'refund',
                'admin_notes' => 'Ruling in favor of buyer. Photo evidence clearly displays a structural crack.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $order->refresh();

        $this->assertEquals('resolved_refunded', $dispute->status);
        $this->assertEquals('Refunded', $order->status);
        $this->assertEquals('refunded', $order->payment_status);
        $this->assertEquals('Ruling in favor of buyer. Photo evidence clearly displays a structural crack.', $dispute->admin_notes);

        Notification::assertSentTo($buyer, \App\Notifications\DisputeStatusNotification::class);
        Notification::assertSentTo($seller, \App\Notifications\DisputeStatusNotification::class);
    }

    public function test_admin_can_arbitrate_rejection(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $admin = User::factory()->superAdmin()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-009',
            'customer_name' => 'Buyer Test',
            'total_amount' => 200,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'status' => 'escalated',
            'reason' => 'Damaged',
            'proof_photos' => ['test.jpg'],
            'escalation_reason' => 'Texture looks bad.',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.disputes.arbitrate', $dispute->id), [
                'decision' => 'reject',
                'admin_notes' => 'Claim rejected. Texture is standard feature of raw clay, not damage.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $dispute->refresh();
        $order->refresh();

        $this->assertEquals('resolved_rejected', $dispute->status);
        $this->assertEquals('Completed', $order->status);
        $this->assertEquals('Claim rejected. Texture is standard feature of raw clay, not damage.', $dispute->admin_notes);

        Notification::assertSentTo($buyer, \App\Notifications\DisputeStatusNotification::class);
        Notification::assertSentTo($seller, \App\Notifications\DisputeStatusNotification::class);
    }
}
