<?php

namespace Tests\Feature\Checkout;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WalletCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_pay_with_wallet_when_balance_covers_delivery_total(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 1200);

        app(WalletService::class)->credit($buyer, 5000, 'seed_wallet_balance', 'Seed buyer wallet for checkout test');

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Wallet Street, Cavite',
            'shipping_address_type' => 'home',
            'payment_method' => 'Wallet',
            'total' => 1236,
            'shipping_notes' => 'Use the guarded gate.',
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->first();

        $this->assertNotNull($order);
        $this->assertSame('Wallet', $order->payment_method);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('home', $order->shipping_address_type);
        $this->assertSame(1200.0, (float) $order->merchandise_subtotal);
        $this->assertSame(36.0, (float) $order->convenience_fee_amount);
        $this->assertSame(1236.0, (float) $order->total_amount);

        $buyer->refresh();
        $this->assertSame(3764.0, (float) $buyer->wallet->balance);
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $buyer->wallet->id,
            'order_id' => $order->id,
            'direction' => 'debit',
            'category' => 'checkout_wallet_payment',
            'amount' => 1236.00,
        ]);
    }

    public function test_wallet_checkout_is_blocked_when_balance_is_insufficient(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 850);

        app(WalletService::class)->credit($buyer, 500, 'seed_wallet_balance', 'Seed smaller buyer wallet');

        $response = $this->from('/checkout')->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Low Balance Street, Cavite',
            'shipping_address_type' => 'office',
            'payment_method' => 'Wallet',
            'total' => 875.50,
        ]);

        $response
            ->assertRedirect('/checkout')
            ->assertSessionHasErrors('payment_method');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_pickup_forces_cod_and_skips_convenience_fee_even_if_wallet_is_requested(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = $this->createProduct($seller, 600);

        app(WalletService::class)->credit($buyer, 2000, 'seed_wallet_balance', 'Seed buyer wallet for pickup test');

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [[
                'id' => $product->id,
                'artisan_id' => $seller->id,
                'qty' => 1,
                'variant' => 'Standard',
            ]],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'Wallet',
            'total' => 600,
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->first();

        $this->assertNotNull($order);
        $this->assertSame('COD', $order->payment_method);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame(0.0, (float) $order->convenience_fee_amount);
        $this->assertSame(600.0, (float) $order->total_amount);
        $this->assertNull($order->shipping_address_type);
    }

    public function test_checkout_rejects_empty_items_payload(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->create();

        $response = $this->from('/checkout')->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [],
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Empty Cart Street, Cavite',
            'shipping_address_type' => 'home',
            'payment_method' => 'COD',
            'total' => 0,
        ]);

        $response
            ->assertRedirect('/checkout')
            ->assertSessionHasErrors('items');

        $this->assertDatabaseCount('orders', 0);
    }

    private function createProduct(User $seller, float $price): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'WALLET-' . fake()->unique()->numerify('###'),
            'name' => 'Wallet Checkout Vase',
            'description' => 'Checkout test product.',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => $price,
            'cost_price' => round($price * 0.6, 2),
            'stock' => 12,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }
}
