<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ReplacementResolutionNotification;
use App\Services\AddressGeocodingService;
use App\Services\LalamoveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Tests\TestCase;

class ReplacementResolutionFlowTest extends TestCase
{
    use RefreshDatabase;
    use MockeryPHPUnitIntegration;

    public function test_seller_cannot_approve_replacement_without_resolution_description(): void
    {
        [$seller, $buyer, $product, $order] = $this->makeReturnOrder();

        $this->actingAs($seller)
            ->post(route('orders.approve-return', $order->order_number), [
                'action_type' => 'replace',
            ])
            ->assertSessionHasErrors('replacement_resolution_description');
    }

    public function test_replacement_approval_saves_description_notifies_buyer_and_restarts_delivery_loop(): void
    {
        Notification::fake();

        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'tracking_number' => 'OLD-TRACK-1',
            'shipping_notes' => 'Old shipping note',
            'proof_of_delivery' => 'proofs/original-proof.jpg',
            'shipped_at' => now()->subDays(2),
            'delivered_at' => now()->subDay(),
            'received_at' => now()->subDay(),
            'warranty_expires_at' => now(),
        ]);

        $response = $this->actingAs($seller)->post(route('orders.approve-return', $order->order_number), [
            'action_type' => 'replace',
            'replacement_resolution_description' => 'We will send a replacement item with reinforced packaging and include a courtesy gift.',
        ]);

        $response->assertSessionHas('success');

        $order->refresh();
        $product->refresh();

        $this->assertSame('Accepted', $order->status);
        $this->assertSame('We will send a replacement item with reinforced packaging and include a courtesy gift.', $order->replacement_resolution_description);
        $this->assertNotNull($order->replacement_started_at);
        $this->assertNull($order->replacement_resolved_at);
        $this->assertNull($order->tracking_number);
        $this->assertNull($order->shipping_notes);
        $this->assertNull($order->proof_of_delivery);
        $this->assertNull($order->shipped_at);
        $this->assertNull($order->delivered_at);
        $this->assertNull($order->received_at);
        $this->assertNull($order->warranty_expires_at);
        $this->assertSame(3, $product->stock);

        Notification::assertSentTo($buyer, ReplacementResolutionNotification::class, function (ReplacementResolutionNotification $notification) use ($buyer, $order) {
            $payload = $notification->toArray($buyer);

            return $payload['type'] === 'replacement_resolution'
                && $payload['order_number'] === $order->order_number
                && str_contains($payload['message'], 'reinforced packaging');
        });
    }

    public function test_active_replacement_cannot_be_completed_by_seller_until_buyer_receives_it(): void
    {
        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'status' => 'Delivered',
            'replacement_resolution_description' => 'Replacement in transit',
            'replacement_started_at' => now()->subHour(),
        ]);

        $this->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Completed',
            ])
            ->assertSessionHas('error', 'Replacement orders must be marked as received by the buyer before completion.');

        $this->assertSame('Delivered', $order->fresh()->status);
        $this->assertNull($order->fresh()->replacement_resolved_at);
    }

    public function test_replacement_approval_rebooks_a_two_way_lalamove_exchange_and_replaces_old_completed_delivery(): void
    {
        Notification::fake();

        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'tracking_number' => 'OLD-TRACK-2',
            'shipped_at' => now()->subDays(2),
            'delivered_at' => now()->subDay(),
            'received_at' => now()->subDay(),
            'warranty_expires_at' => now(),
            'shipping_address' => 'Blk 35 Lot 1, Burol I, Dasmarinas City, Cavite, 4115',
            'shipping_street_address' => 'Blk 35 Lot 1',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
            'shipping_recipient_name' => 'Buyer Receiver',
            'shipping_contact_phone' => '09193939832',
            'shipping_notes' => 'Handle with care.',
        ]);

        $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_COMPLETED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'old_completed_delivery',
            'quotation_id' => 'qt_old_completed_delivery',
        ]);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('array'), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => 'San Miguel I, Dasmarinas City, Cavite',
            ]);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($order) {
                if (is_array($value)) {
                    return in_array($order->shipping_address, $value, true);
                }

                return $value === $order->shipping_address;
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $order->shipping_address,
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->with(Mockery::on(function (array $payload) {
                return count($payload['stops'] ?? []) === 3;
            }))
            ->andReturn([
                'quotationId' => 'qt_replacement_exchange',
                'serviceType' => 'MOTORCYCLE',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 50.00],
                'stops' => [
                    ['stopId' => 'stop_pickup'],
                    ['stopId' => 'stop_buyer_exchange'],
                    ['stopId' => 'stop_return_to_seller'],
                ],
            ]);
        $lalamove->shouldReceive('normalizePhone')
            ->times(3)
            ->andReturn('+639193939832');
        $lalamove->shouldReceive('createOrder')
            ->once()
            ->with(Mockery::on(function (array $payload) {
                return ($payload['metadata']['flowType'] ?? null) === 'replacement_exchange'
                    && count($payload['recipients'] ?? []) === 2;
            }))
            ->andReturn([
                'orderId' => 'replacement_exchange_order',
                'status' => 'ASSIGNING_DRIVER',
                'shareLink' => 'https://track.lalamove.test/replacement_exchange_order',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 50.00],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $response = $this->actingAs($seller)->post(route('orders.approve-return', $order->order_number), [
            'action_type' => 'replace',
            'replacement_resolution_description' => 'We will replace the vase and bring back the damaged item.',
        ]);

        $response->assertSessionHas('success', 'Replacement approved. Buyer notified and the replacement exchange courier was booked.');

        $order->refresh();
        $product->refresh();
        $delivery = $order->delivery;

        $this->assertSame('Shipped', $order->status);
        $this->assertSame('replacement_exchange_order', $order->tracking_number);
        $this->assertNotNull($order->replacement_started_at);
        $this->assertNull($order->replacement_resolved_at);
        $this->assertNotNull($delivery);
        $this->assertSame('replacement_exchange_order', $delivery->external_order_id);
        $this->assertSame('replacement_exchange', data_get($delivery->order_payload, 'metadata.flowType'));
        $this->assertDatabaseMissing('order_deliveries', [
            'external_order_id' => 'old_completed_delivery',
        ]);
        $this->assertSame(3, $product->stock);
    }

    public function test_buyer_receiving_replacement_marks_it_resolved(): void
    {
        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'status' => 'Delivered',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'replacement_resolution_description' => 'Replacement shipped',
            'replacement_started_at' => now()->subHour(),
        ]);

        $this->actingAs($buyer)
            ->post(route('my-orders.receive', $order->id))
            ->assertSessionHas('success', 'Replacement received and order marked as completed.');

        $order->refresh();

        $this->assertSame('Completed', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->replacement_resolved_at);
    }

    public function test_refund_approval_marks_the_order_refunded_without_wallet_processing(): void
    {
        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
        ]);

        $this->from('/orders')
            ->actingAs($seller)
            ->post(route('orders.approve-return', $order->order_number), [
                'action_type' => 'refund',
            ])
            ->assertRedirect('/orders')
            ->assertSessionHas('success', 'Return approved and marked as refunded.');

        $order->refresh();

        $this->assertSame('Refunded', $order->status);
        $this->assertSame('refunded', $order->payment_status);
    }

    private function makeReturnOrder(array $overrides = []): array
    {
        $seller = User::factory()->artisanApproved()->create();
        $seller->forceFill([
            'shop_name' => $seller->shop_name ?: 'Kurt\'s Shop',
            'street_address' => 'Blk 35 Lot 17',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'zip_code' => '4115',
            'phone_number' => '09193939832',
        ])->save();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'REPL-' . strtoupper(substr(uniqid(), -8)),
            'name' => 'Replacement-Test Vase',
            'description' => 'Replacement test product',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 200,
            'cost_price' => 80,
            'stock' => 5,
            'sold' => 2,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/replacement-vase.jpg',
        ]);

        $order = Order::create(array_merge([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REPLACE-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 400,
            'convenience_fee_amount' => 12,
            'platform_commission_amount' => 20,
            'seller_net_amount' => 380,
            'total_amount' => 412,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => '123 Replacement Street',
            'shipping_method' => 'Delivery',
            'return_reason' => 'Item arrived damaged.',
        ], $overrides));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 200,
            'cost' => 80,
            'quantity' => 2,
            'product_img' => 'products/replacement-vase.jpg',
        ]);

        return [$seller, $buyer, $product, $order];
    }
}
