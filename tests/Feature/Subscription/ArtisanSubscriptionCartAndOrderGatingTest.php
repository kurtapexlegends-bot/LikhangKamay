<?php

namespace Tests\Feature\Subscription;

use App\Actions\Consumer\PlaceOrder;
use App\Models\Product;
use App\Models\User;
use App\Services\Cart\CartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ArtisanSubscriptionCartAndOrderGatingTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $activeArtisan;
    private User $expiredArtisan;
    private Product $activeProduct;
    private Product $expiredProduct;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'city' => 'Imus',
            'saved_address' => '123 Meadowood, Imus, Cavite',
        ]);

        $this->activeArtisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Active Clay Workshop',
            'city' => 'Silang',
            'subscription_expires_at' => now()->addDays(20),
        ]);

        $this->expiredArtisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Expired Pottery Studio',
            'city' => 'Silang',
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => null,
        ]);

        $this->activeProduct = Product::create([
            'user_id' => $this->activeArtisan->id,
            'artisan_id' => $this->activeArtisan->id,
            'name' => 'Active Terracotta Mug',
            'sku' => 'ACT-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 250.00,
            'cost_price' => 100.00,
            'stock' => 15,
            'lead_time' => '1 day',
        ]);

        $this->expiredProduct = Product::create([
            'user_id' => $this->expiredArtisan->id,
            'artisan_id' => $this->expiredArtisan->id,
            'name' => 'Expired Terracotta Vase',
            'sku' => 'EXP-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 500.00,
            'cost_price' => 200.00,
            'stock' => 10,
            'lead_time' => '2 days',
        ]);
    }

    public function test_product_show_passes_is_workshop_inactive_flag(): void
    {
        // 1. Active artisan product show -> isWorkshopInactive is false
        $this->get(route('product.show', $this->activeProduct->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/ProductShow')
                ->where('isWorkshopInactive', false)
            );

        // 2. Expired artisan product show -> isWorkshopInactive is true
        $this->get(route('product.show', $this->expiredProduct->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/ProductShow')
                ->where('isWorkshopInactive', true)
            );
    }

    public function test_cart_service_blocks_adding_item_from_expired_artisan(): void
    {
        $cartService = app(CartService::class);

        // Adding product from expired workshop fails
        $result = $cartService->addItem([
            'product_id' => $this->expiredProduct->id,
            'quantity' => 1,
        ]);

        $this->assertFalse($result['success']);
        $this->assertSame(422, $result['status']);
        $this->assertSame('Workshop is currently taking a break.', $result['message']);

        // Adding product from active workshop succeeds
        $activeResult = $cartService->addItem([
            'product_id' => $this->activeProduct->id,
            'quantity' => 1,
        ]);

        $this->assertTrue($activeResult['success']);
    }

    public function test_cart_verification_flags_expired_artisan_items_as_unavailable(): void
    {
        $cartService = app(CartService::class);

        $cart = [
            'item_active' => [
                'id' => $this->activeProduct->id,
                'name' => $this->activeProduct->name,
                'price' => 250.00,
                'qty' => 1,
                'is_available' => true,
                'is_out_of_stock' => false,
            ],
            'item_expired' => [
                'id' => $this->expiredProduct->id,
                'name' => $this->expiredProduct->name,
                'price' => 500.00,
                'qty' => 1,
                'is_available' => true,
                'is_out_of_stock' => false,
            ],
        ];

        $verified = $cartService->syncCartWithDatabase($cart);

        $this->assertTrue($verified['item_active']['is_available']);
        $this->assertFalse($verified['item_expired']['is_available']);
        $this->assertSame('Workshop is currently taking a break', $verified['item_expired']['unavailable_reason']);
    }

    public function test_place_order_throws_validation_exception_when_artisan_subscription_expired(): void
    {
        $placeOrder = app(PlaceOrder::class);

        $request = new Request([
            'shipping_method' => 'Standard Delivery',
            'shipping_address' => '123 Meadowood, Imus, Cavite',
            'recipient_name' => 'Maria Santos',
            'recipient_phone' => '09171234567',
            'payment_method' => 'cod',
            'items' => [
                [
                    'id' => $this->expiredProduct->id,
                    'quantity' => 1,
                    'price' => 500.00,
                ],
            ],
        ]);
        $request->setUserResolver(fn () => $this->buyer);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('One or more items in your cart belong to an inactive workshop. Please update your cart to proceed.');

        $placeOrder->execute($request, $this->buyer);
    }

    public function test_place_order_handles_null_seller_safely_without_fatal_crash(): void
    {
        $orphanArtisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Orphan Pottery',
            'city' => 'Silang',
        ]);

        $orphanProduct = Product::create([
            'user_id' => $orphanArtisan->id,
            'artisan_id' => $orphanArtisan->id,
            'name' => 'Orphan Terracotta Item',
            'sku' => 'ORP-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 100.00,
            'cost_price' => 50.00,
            'stock' => 10,
            'lead_time' => '1 day',
        ]);

        // Soft-delete artisan to simulate inactive/deleted workshop
        $orphanArtisan->delete();

        $placeOrder = app(PlaceOrder::class);

        $request = new Request([
            'shipping_method' => 'Standard Delivery',
            'shipping_address' => '123 Meadowood, Imus, Cavite',
            'recipient_name' => 'Maria Santos',
            'recipient_phone' => '09171234567',
            'payment_method' => 'cod',
            'items' => [
                [
                    'id' => $orphanProduct->id,
                    'quantity' => 1,
                    'price' => 100.00,
                ],
            ],
        ]);
        $request->setUserResolver(fn () => $this->buyer);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('One or more items in your cart belong to an inactive workshop. Please update your cart to proceed.');

        $placeOrder->execute($request, $this->buyer);
    }

    public function test_checkout_view_redirects_to_cart_when_artisan_subscription_expired(): void
    {
        $cart = [
            'item_' . $this->expiredProduct->id => [
                'id' => $this->expiredProduct->id,
                'artisan_id' => $this->expiredArtisan->id,
                'name' => $this->expiredProduct->name,
                'price' => 500.00,
                'qty' => 1,
                'lead_time' => 2,
            ],
        ];

        $response = $this->actingAs($this->buyer)
            ->withSession(['cart' => $cart])
            ->get(route('checkout.create'));

        $response->assertRedirect(route('cart.index'));
        $response->assertSessionHas('error', 'One or more items in your cart belong to an inactive workshop. Please update your cart to proceed.');
    }

    public function test_quote_shipping_throws_validation_exception_when_artisan_subscription_expired(): void
    {
        $quoteShipping = app(\App\Actions\Consumer\QuoteCheckoutShipping::class);

        $request = new Request([
            'shipping_method' => 'Standard Delivery',
            'shipping_address' => '123 Meadowood, Imus, Cavite',
            'items' => [
                [
                    'id' => $this->expiredProduct->id,
                    'artisan_id' => $this->expiredArtisan->id,
                    'quantity' => 1,
                    'price' => 500.00,
                ],
            ],
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('One or more items in your cart belong to an inactive workshop. Please update your cart to proceed.');

        $quoteShipping->execute($request, $this->buyer);
    }

    public function test_product_show_sets_workshop_inactive_when_artisan_is_suspended(): void
    {
        $suspendedArtisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Suspended Pottery Studio',
            'city' => 'Silang',
            'subscription_expires_at' => now()->addDays(20),
            'suspended_until' => now()->addDays(5),
        ]);

        $suspendedProduct = Product::create([
            'user_id' => $suspendedArtisan->id,
            'artisan_id' => $suspendedArtisan->id,
            'name' => 'Suspended Terracotta Pot',
            'sku' => 'SUSP-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 300.00,
            'cost_price' => 100.00,
            'stock' => 5,
            'lead_time' => '1 day',
        ]);

        $this->get(route('product.show', $suspendedProduct->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/ProductShow')
                ->where('isWorkshopInactive', true)
            );
    }

    public function test_cart_service_blocks_adding_item_from_suspended_artisan(): void
    {
        $suspendedArtisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Suspended Pottery Studio',
            'city' => 'Silang',
            'subscription_expires_at' => now()->addDays(20),
            'suspended_until' => now()->addDays(5),
        ]);

        $suspendedProduct = Product::create([
            'user_id' => $suspendedArtisan->id,
            'artisan_id' => $suspendedArtisan->id,
            'name' => 'Suspended Terracotta Pot',
            'sku' => 'SUSP-002',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 300.00,
            'cost_price' => 100.00,
            'stock' => 5,
            'lead_time' => '1 day',
        ]);

        $cartService = app(CartService::class);
        $result = $cartService->addItem([
            'product_id' => $suspendedProduct->id,
            'quantity' => 1,
        ]);

        $this->assertFalse($result['success']);
        $this->assertSame(422, $result['status']);
        $this->assertSame('Workshop is currently unavailable.', $result['message']);
    }
}
