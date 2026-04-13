<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ManualDeliveryProofFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_mark_standard_delivery_order_as_shipped_with_tracking_and_proof(): void
    {
        Storage::fake('public');

        [$seller, $order] = $this->makeOrder([
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
        ]);

        $response = $this->actingAs($seller)->post(route('orders.update', $order->order_number), [
            'status' => 'Shipped',
            'tracking_number' => 'MANUAL-TRACK-1001',
            'shipping_notes' => 'Rider will contact the buyer before arrival.',
            'proof_of_delivery' => UploadedFile::fake()->image('shipment-proof.jpg'),
        ]);

        $response->assertRedirect();

        $order->refresh();

        $this->assertSame('Shipped', $order->status);
        $this->assertSame('MANUAL-TRACK-1001', $order->tracking_number);
        $this->assertSame('Rider will contact the buyer before arrival.', $order->shipping_notes);
        $this->assertNotNull($order->shipped_at);
        $this->assertNotNull($order->proof_of_delivery);
        $this->assertTrue(Storage::disk('public')->exists($order->proof_of_delivery));
    }

    public function test_manual_delivery_requires_a_fresh_final_proof_before_marking_delivered(): void
    {
        Storage::fake('public');

        [$seller, $order] = $this->makeOrder([
            'status' => 'Shipped',
            'shipping_method' => 'Delivery',
            'proof_of_delivery' => 'proofs/existing-shipment-proof.jpg',
            'tracking_number' => 'MANUAL-TRACK-2002',
        ]);

        Storage::disk('public')->put('proofs/existing-shipment-proof.jpg', 'existing-proof');

        $this->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Delivered',
            ])
            ->assertRedirect(route('orders.index', absolute: false))
            ->assertSessionHas('error', 'A final delivery proof photo is required before the order can be marked as delivered.');

        $originalProof = $order->fresh()->proof_of_delivery;

        $this->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Delivered',
                'shipping_notes' => 'Delivered to the buyer at the front desk.',
                'proof_of_delivery' => UploadedFile::fake()->image('delivery-proof.jpg'),
            ])
            ->assertRedirect();

        $order->refresh();

        $this->assertSame('Delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertSame('Delivered to the buyer at the front desk.', $order->shipping_notes);
        $this->assertNotSame($originalProof, $order->proof_of_delivery);
        $this->assertTrue(Storage::disk('public')->exists($order->proof_of_delivery));
    }

    public function test_pickup_order_can_be_marked_delivered_after_ready_for_pickup_using_existing_proof(): void
    {
        Storage::fake('public');

        [$seller, $order] = $this->makeOrder([
            'status' => 'Ready for Pickup',
            'shipping_method' => 'Pick Up',
            'proof_of_delivery' => 'proofs/ready-for-pickup-proof.jpg',
        ]);

        Storage::disk('public')->put('proofs/ready-for-pickup-proof.jpg', 'existing-proof');

        $this->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Delivered',
                'shipping_notes' => 'Buyer picked up the parcel at the store counter.',
            ])
            ->assertRedirect();

        $order->refresh();

        $this->assertSame('Delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertSame('Buyer picked up the parcel at the store counter.', $order->shipping_notes);
        $this->assertSame('proofs/ready-for-pickup-proof.jpg', $order->proof_of_delivery);
    }

    /**
     * @return array{0: User, 1: Order}
     */
    private function makeOrder(array $overrides = []): array
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'MANUAL-DELIVERY-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Manual Delivery Test Product',
            'description' => 'Manual delivery flow test product.',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 350,
            'cost_price' => 180,
            'stock' => 10,
            'sold' => 1,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/manual-delivery.jpg',
        ]);

        $order = Order::create(array_merge([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-MANUAL-' . strtoupper(fake()->unique()->bothify('??###')),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350,
            'convenience_fee_amount' => 10.5,
            'platform_commission_amount' => 17.5,
            'seller_net_amount' => 332.5,
            'total_amount' => 360.5,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '123 Manual Delivery Street',
            'shipping_method' => 'Delivery',
        ], $overrides));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 350,
            'cost' => 180,
            'quantity' => 1,
            'product_img' => $product->cover_photo_path,
        ]);

        return [$seller, $order];
    }
}
