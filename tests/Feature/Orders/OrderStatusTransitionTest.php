<?php

namespace Tests\Feature\Orders;

use App\Mail\OrderAccepted;
use App\Mail\OrderDelivered;
use App\Mail\OrderShipped;
use App\Mail\ReturnRequested;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Supply;
use App\Models\ProductRecipe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrderStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $seller;
    private Product $product;
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Mail::fake();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'email' => 'buyer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->seller = User::factory()->artisanApproved()->create([
            'email' => 'seller@example.com',
        ]);

        $this->product = Product::create([
            'user_id' => $this->seller->id,
            'artisan_id' => $this->seller->id,
            'name' => 'Transition Test Vase',
            'sku' => 'TTV-001',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 500,
            'cost_price' => 150,
            'stock' => 10,
            'lead_time' => '1 day',
            'cover_photo_path' => 'products/transition-test-vase.jpg',
        ]);

        $this->order = Order::create([
            'artisan_id' => $this->seller->id,
            'user_id' => $this->buyer->id,
            'order_number' => 'ORD-TRANSITION-' . strtoupper(uniqid()),
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'total_amount' => 515,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Blk 35 Lot 1, Burol I, Cavite, 4115',
            'shipping_method' => 'Delivery',
        ]);

        $this->order->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'variant' => 'Standard',
            'price' => 500,
            'cost' => 150,
            'quantity' => 1,
            'product_img' => 'products/transition-test-vase.jpg',
        ]);
    }

    public function test_valid_seller_transitions_succeed_and_dispatch_emails(): void
    {
        // 1. Pending -> Accepted (Accept order)
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Accepted',
            ]);

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Accepted', $this->order->status);
        Mail::assertSent(OrderAccepted::class);

        // 2. Accepted -> Processing (Start processing)
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Processing',
            ]);

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Processing', $this->order->status);

        // 3. Processing -> Shipped (Requires proof image)
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Shipped',
                'proof_of_delivery' => UploadedFile::fake()->image('shipped-proof.jpg'),
            ]);

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Shipped', $this->order->status);
        $this->assertNotNull($this->order->proof_of_delivery);
        Mail::assertSent(OrderShipped::class);

        // 4. Shipped -> Delivered
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Delivered',
                'proof_of_delivery' => UploadedFile::fake()->image('delivered-proof.jpg'),
            ]);

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Delivered', $this->order->status);
    }

    public function test_illegal_status_transitions_are_blocked(): void
    {
        // Trying to transition from Pending to Shipped directly should fail
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Shipped',
            ]);

        $response->assertSessionHas('error');
        $this->order->refresh();
        $this->assertSame('Pending', $this->order->status);

        // Accept the order first
        $this->order->update(['status' => 'Accepted']);

        // Trying to transition from Accepted to Delivered directly should fail
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Delivered',
            ]);

        $response->assertSessionHas('error');
        $this->order->refresh();
        $this->assertSame('Accepted', $this->order->status);
    }

    public function test_buyer_receive_order_transitions_and_dispatches_email(): void
    {
        $this->order->update(['status' => 'Delivered']);

        $response = $this->actingAs($this->buyer)
            ->post(route('my-orders.receive', $this->order->id));

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Completed', $this->order->status);
        $this->assertSame('paid', $this->order->payment_status);
        Mail::assertSent(OrderDelivered::class);
    }

    public function test_buyer_cannot_receive_undelivered_order(): void
    {
        $this->order->update(['status' => 'Accepted']);

        $response = $this->actingAs($this->buyer)
            ->post(route('my-orders.receive', $this->order->id));

        $response->assertSessionHas('error');
        $this->order->refresh();
        $this->assertSame('Accepted', $this->order->status);
    }

    public function test_buyer_request_return_requires_completed_status_and_dispatches_email(): void
    {
        $this->order->update([
            'status' => 'Completed',
            'received_at' => now(),
            'warranty_expires_at' => now()->addDay(),
        ]);

        $response = $this->actingAs($this->buyer)
            ->post(route('my-orders.return', $this->order->id), [
                'return_reason' => 'Item was damaged',
                'return_proof_image' => UploadedFile::fake()->image('proof.jpg'),
            ]);

        $response->assertRedirect();
        $this->order->refresh();
        $this->assertSame('Refund/Return', $this->order->status);
        Mail::assertSent(ReturnRequested::class);
    }

    public function test_buyer_cannot_request_return_after_warranty_expiration(): void
    {
        $this->order->update([
            'status' => 'Completed',
            'received_at' => now()->subDays(2),
            'warranty_expires_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->buyer)
            ->post(route('my-orders.return', $this->order->id), [
                'return_reason' => 'Too late',
                'return_proof_image' => UploadedFile::fake()->image('proof.jpg'),
            ]);

        $response->assertSessionHas('error');
        $this->order->refresh();
        $this->assertSame('Completed', $this->order->status);
    }

    public function test_transaction_rolls_back_if_supply_deduction_fails(): void
    {
        // Setup BOM recipe on product but set supply quantity to 0
        $supply = Supply::create([
            'user_id' => $this->seller->id,
            'name' => 'Test Clay',
            'category' => 'Glazes',
            'unit' => 'kg',
            'quantity' => 0, // Out of stock
        ]);

        ProductRecipe::create([
            'product_id' => $this->product->id,
            'supply_id' => $supply->id,
            'quantity_required' => 2,
        ]);

        $this->product->update(['production_method' => 'manufactured']);
        $this->order->update(['status' => 'Accepted']);

        // Attempting to move to Processing should throw exception (Insufficient supply)
        // and rollback the status update to Accepted.
        $response = $this->actingAs($this->seller)
            ->post(route('orders.update', $this->order->order_number), [
                'status' => 'Processing',
            ]);

        $response->assertSessionHas('error');
        $this->order->refresh();
        $this->assertSame('Accepted', $this->order->status); // Rolled back!
    }
}
