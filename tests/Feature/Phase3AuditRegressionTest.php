<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase3AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_cannot_confirm_replacement_receipt_before_delivery_is_recorded(): void
    {
        [$buyer, $order] = $this->makeOrder([
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'replacement_resolution_description' => 'Replacement shipped with reinforced packaging.',
            'replacement_started_at' => now()->subHour(),
            'replacement_resolved_at' => null,
        ]);

        $this->actingAs($buyer)
            ->from(route('my-orders.index'))
            ->post(route('my-orders.receive', $order->id))
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('error', 'You can confirm receipt only after the order is marked as delivered.');

        $order->refresh();

        $this->assertSame('Shipped', $order->status);
        $this->assertNull($order->received_at);
        $this->assertNull($order->replacement_resolved_at);
    }

    public function test_buyer_cannot_confirm_pickup_receipt_before_seller_marks_the_order_delivered(): void
    {
        [$buyer, $order] = $this->makeOrder([
            'status' => 'Ready for Pickup',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Pick Up',
        ]);

        $this->actingAs($buyer)
            ->from(route('my-orders.index'))
            ->post(route('my-orders.receive', $order->id))
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('error', 'You can confirm receipt only after the order is marked as delivered.');

        $order->refresh();

        $this->assertSame('Ready for Pickup', $order->status);
        $this->assertNull($order->received_at);
    }

    private function makeOrder(array $overrides = []): array
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'P3-AUDIT-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Phase 3 Audit Product',
            'description' => 'Phase 3 regression test product.',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 280,
            'cost_price' => 140,
            'stock' => 10,
            'sold' => 1,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/phase3-audit.jpg',
        ]);

        $order = Order::create(array_merge([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-P3-AUDIT-' . strtoupper(fake()->unique()->bothify('??###')),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 280,
            'convenience_fee_amount' => 8.4,
            'platform_commission_amount' => 14,
            'seller_net_amount' => 266,
            'total_amount' => 288.4,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => '123 Phase 3 Street',
            'shipping_method' => 'Delivery',
        ], $overrides));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 280,
            'cost' => 140,
            'quantity' => 1,
            'product_img' => $product->cover_photo_path,
        ]);

        return [$buyer, $order];
    }
}
