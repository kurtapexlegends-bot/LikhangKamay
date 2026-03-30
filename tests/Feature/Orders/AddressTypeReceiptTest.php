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
            'total' => 927,
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->first();

        $this->assertSame($savedAddress->full_address, $order->shipping_address);
        $this->assertSame('office', $order->shipping_address_type);
        $this->assertSame(27.0, (float) $order->convenience_fee_amount);

        $receiptResponse = $this->actingAs($buyer)->get(route('my-orders.receipt', $order->id));

        $receiptResponse
            ->assertOk()
            ->assertSee('Convenience Fee (3%)', false)
            ->assertSee('Office', false)
            ->assertSee('PHP 27.00', false)
            ->assertSee('Total Paid', false);
    }

    public function test_seller_can_open_receipt_for_owned_order(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 900);

        $order = Order::create([
            'order_number' => 'ORD-SELLER-RECEIPT',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 900,
            'convenience_fee_amount' => 27,
            'platform_commission_amount' => 45,
            'seller_net_amount' => 855,
            'total_amount' => 927,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Unit 9 Office Plaza, Dasmarinas City',
            'shipping_address_type' => 'office',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => $product->price,
            'cost' => $product->cost_price,
            'quantity' => 1,
            'product_img' => null,
        ]);

        $receiptResponse = $this->actingAs($seller)->get(route('orders.receipt', $order->order_number));

        $receiptResponse
            ->assertOk()
            ->assertSee('Order Receipt', false)
            ->assertSee('ORD-SELLER-RECEIPT', false)
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
            'total' => 659.20,
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
            'convenience_fee_amount' => 19.20,
        ]);
    }

    public function test_checkout_rejects_malformed_saved_address_selection_instead_of_crashing(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 700);

        $response = $this->from('/checkout')->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'selected_address_id' => ['not-a-valid-id'],
            'payment_method' => 'COD',
            'total' => 721,
        ]);

        $response
            ->assertRedirect('/checkout')
            ->assertSessionHasErrors('selected_address_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_rejects_nonexistent_saved_address_selection_instead_of_404ing(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 700);

        $response = $this->from('/checkout')->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'selected_address_id' => 999999,
            'payment_method' => 'COD',
            'total' => 721,
        ]);

        $response
            ->assertRedirect('/checkout')
            ->assertSessionHasErrors('selected_address_id');

        $this->assertDatabaseCount('orders', 0);
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
