<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OrderCheckoutOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_assigns_orders_to_the_actual_product_owner_even_if_artisan_id_is_tampered(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $actualSeller = User::factory()->artisanApproved()->create();
        $wrongSeller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $actualSeller->id,
            'sku' => 'OWN-CHECK-001',
            'name' => 'Tamper Safe Vase',
            'description' => 'Handbuilt vase for ownership tests.',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => 1499,
            'cost_price' => 900,
            'stock' => 8,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                [
                    'id' => $product->id,
                    'artisan_id' => $wrongSeller->id,
                    'name' => $product->name,
                    'qty' => 1,
                    'variant' => 'Standard',
                ],
            ],
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Sample Street, Cavite',
            'payment_method' => 'COD',
            'total' => 1499,
            'shipping_notes' => 'Leave at the gate.',
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->first();

        $this->assertNotNull($order);
        $this->assertSame($actualSeller->id, $order->artisan_id);
        $this->assertNotSame($wrongSeller->id, $order->artisan_id);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $product->id,
        ]);
    }

    public function test_checkout_succeeds_even_when_sponsorship_snapshot_columns_are_unavailable(): void
    {
        Mail::fake();
        Notification::fake();

        Schema::partialMock()
            ->shouldReceive('hasColumn')
            ->andReturnUsing(function (string $table, string $column) {
                if ($table === 'order_items' && in_array($column, ['was_sponsored', 'sponsorship_request_id', 'sponsored_at_checkout'], true)) {
                    return false;
                }

                return true;
            });

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'OWN-CHECK-002',
            'name' => 'Compatibility Vase',
            'description' => 'Checkout compatibility test product.',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => 999,
            'cost_price' => 450,
            'stock' => 4,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                [
                    'id' => $product->id,
                    'artisan_id' => $seller->id,
                    'name' => $product->name,
                    'qty' => 1,
                    'variant' => 'Standard',
                ],
            ],
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Sample Street, Cavite',
            'payment_method' => 'COD',
            'total' => 999,
            'shipping_notes' => 'Compatibility path.',
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));
        $this->assertDatabaseHas('orders', [
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
        ]);
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'product_name' => 'Compatibility Vase',
        ]);
    }
}
