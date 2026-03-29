<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AddressTypeReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_saved_address_type_is_used_for_delivery_order_and_visible_on_receipt(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 900);

        $savedAddress = $buyer->addresses()->create([
            'label' => 'Office HQ',
            'address_type' => 'office',
            'recipient_name' => 'Buyer Receiver',
            'phone_number' => '09171234567',
            'full_address' => 'Unit 9 Office Plaza, Dasmarinas City',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'is_default' => true,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'selected_address_id' => $savedAddress->id,
            'payment_method' => 'COD',
            'total' => 920,
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->first();

        $this->assertSame($savedAddress->full_address, $order->shipping_address);
        $this->assertSame('office', $order->shipping_address_type);
        $this->assertSame(20.0, (float) $order->convenience_fee_amount);

        $receiptResponse = $this->actingAs($buyer)->get(route('my-orders.receipt', $order->id));

        $receiptResponse
            ->assertOk()
            ->assertSee('Convenience Fee', false)
            ->assertSee('Office', false)
            ->assertSee('PHP 20.00', false)
            ->assertSee('Total Paid', false);
    }

    public function test_new_delivery_address_type_can_be_saved_from_checkout(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 640);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'selected_address_id' => 'new',
            'shipping_address' => 'Warehouse Road, Dasmarinas, Cavite',
            'shipping_address_type' => 'other',
            'recipient_name' => 'Warehouse Receiver',
            'phone_number' => '09998887777',
            'payment_method' => 'COD',
            'save_address' => true,
            'total' => 660,
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $buyer->id,
            'address_type' => 'other',
            'label' => 'Other',
            'full_address' => 'Warehouse Road, Dasmarinas, Cavite',
            'recipient_name' => 'Warehouse Receiver',
        ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $buyer->id,
            'shipping_address_type' => 'other',
            'convenience_fee_amount' => 20.00,
        ]);
    }

    private function createProduct(User $seller, float $price): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'ADDR-' . fake()->unique()->numerify('###'),
            'name' => 'Address Type Mug',
            'description' => 'Address type test product.',
            'category' => 'Mugs',
            'status' => 'Active',
            'price' => $price,
            'cost_price' => round($price * 0.55, 2),
            'stock' => 9,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }
}
