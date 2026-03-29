<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ReplacementResolutionNotification;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class ReplacementResolutionFlowTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_refund_approval_does_not_change_order_state_when_wallet_refund_fails(): void
    {
        [$seller, $buyer, $product, $order] = $this->makeReturnOrder([
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
        ]);

        $mock = Mockery::mock(OrderFinanceService::class);
        $mock->shouldReceive('refundOrderToBuyerWallet')
            ->once()
            ->andThrow(new \RuntimeException('Wallet service unavailable.'));

        $this->app->instance(OrderFinanceService::class, $mock);

        $this->from('/orders')
            ->actingAs($seller)
            ->post(route('orders.approve-return', $order->order_number), [
                'action_type' => 'refund',
            ])
            ->assertRedirect('/orders')
            ->assertSessionHas('error', 'Refund could not be completed. No wallet changes were applied.');

        $order->refresh();

        $this->assertSame('Refund/Return', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertNull($order->refunded_to_wallet_at);
    }

    private function makeReturnOrder(array $overrides = []): array
    {
        $seller = User::factory()->artisanApproved()->create();
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
