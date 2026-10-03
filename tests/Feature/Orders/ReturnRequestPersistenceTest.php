<?php

namespace Tests\Feature\Orders;

use App\Mail\ReturnRequested;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReturnRequestPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_return_request_persists_reason_and_proof_and_sends_email(): void
    {
        Storage::fake('public');
        Mail::fake();

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $seller = User::factory()->artisanApproved()->create([
            'email' => 'seller@example.com',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Return Test Vase',
            'sku' => 'RTV-001',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 200,
            'cost_price' => 80,
            'stock' => 5,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/return-test-vase.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-RETURN-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 200,
            'convenience_fee_amount' => 6,
            'total_amount' => 206,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Blk 35 Lot 1, Burol I, Dasmarinas City, Cavite, 4115',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22),
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 200,
            'cost' => 80,
            'quantity' => 1,
            'product_img' => 'products/return-test-vase.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.return', $order->id), [
            'return_reason' => 'The vase arrived cracked.',
            'return_proof_image' => UploadedFile::fake()->image('damage-proof.jpg'),
        ]);

        $response->assertRedirect();

        $order->refresh();

        $this->assertSame('Refund/Return', $order->status);
        $this->assertSame('The vase arrived cracked.', $order->return_reason);
        $this->assertNotNull($order->return_proof_image);
        Storage::disk('public')->assertExists($order->return_proof_image);

        Mail::assertSent(ReturnRequested::class, function (ReturnRequested $mail) use ($order, $seller) {
            return $mail->hasTo($seller->email)
                && $mail->order->is($order);
        });
    }

    public function test_buyer_return_request_accepts_reason_and_proof_photos_aliases(): void
    {
        Storage::fake('public');
        Mail::fake();

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $seller = User::factory()->artisanApproved()->create([
            'email' => 'seller2@example.com',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Alias Return Test Vase',
            'sku' => 'ARTV-002',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 300,
            'cost_price' => 100,
            'stock' => 5,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/alias-vase.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-RETURN-ALIAS-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'convenience_fee_amount' => 9,
            'total_amount' => 309,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Blk 35 Lot 1, Burol I, Dasmarinas City, Cavite, 4115',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(1),
            'warranty_expires_at' => now()->addHours(23),
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 300,
            'cost' => 100,
            'quantity' => 1,
            'product_img' => 'products/alias-vase.jpg',
        ]);

        $response = $this->actingAs($buyer)->post(route('my-orders.return', $order->id), [
            'reason' => 'Item arrived with chips along the rim.',
            'proof_photos' => [
                UploadedFile::fake()->image('chip1.jpg'),
                UploadedFile::fake()->image('chip2.jpg'),
            ],
        ]);

        $response->assertRedirect();

        $order->refresh();

        $this->assertSame('Refund/Return', $order->status);
        $this->assertSame('Item arrived with chips along the rim.', $order->return_reason);
        $this->assertNotNull($order->return_proof_image);
        Storage::disk('public')->assertExists($order->return_proof_image);
    }
}
