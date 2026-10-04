<?php

namespace Tests\Feature\Cart;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CartPresentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_page_backfills_missing_sku_and_slug_from_live_products(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CART-SKU-001',
            'name' => 'Cart Hydration Vase',
            'description' => 'Cart hydration test product.',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => 850,
            'cost_price' => 400,
            'stock' => 5,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)
            ->withSession([
                'cart' => [
                    $product->id => [
                        'id' => $product->id,
                        'artisan_id' => $seller->id,
                        'name' => $product->name,
                        'price' => 800,
                        'qty' => 1,
                        'img' => $product->img,
                        'seller' => $seller->name,
                        'shop_name' => $seller->shop_name ?? $seller->name,
                        'location' => $seller->city ?? 'Cavite',
                    ],
                ],
            ])
            ->get(route('cart.index'));

        $response->assertOk();
        $cart = session('cart', []);

        $this->assertCount(1, $cart);
        $storedItem = collect($cart)->first();

        $this->assertNotNull($storedItem);
        $this->assertSame('CART-SKU-001', $storedItem['sku']);
        $this->assertSame($product->slug, $storedItem['slug']);
        $this->assertEquals(850, $storedItem['price']);
    }

    public function test_cart_store_honors_requested_quantity_and_keeps_distinct_variants_separate(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CART-SKU-002',
            'name' => 'Variant Storage Bowl',
            'description' => 'Variant-aware cart test product.',
            'category' => 'Tableware',
            'status' => 'Active',
            'price' => 620,
            'cost_price' => 300,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $this->actingAs($buyer)->post(route('cart.store'), [
            'product_id' => $product->id,
            'quantity' => 3,
            'variant' => 'Gloss Blue',
        ])->assertRedirect();

        $this->actingAs($buyer)->post(route('cart.store'), [
            'product_id' => $product->id,
            'quantity' => 2,
            'variant' => 'Matte Sand',
        ])->assertRedirect();

        $cart = session('cart', []);

        $this->assertCount(2, $cart);

        $variants = collect($cart)->keyBy('variant');

        $this->assertTrue($variants->has('Gloss Blue'));
        $this->assertTrue($variants->has('Matte Sand'));
        $this->assertSame(3, $variants->get('Gloss Blue')['qty']);
        $this->assertSame(2, $variants->get('Matte Sand')['qty']);
    }

    public function test_checkout_create_can_select_cart_lines_by_cart_key(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CART-SKU-003',
            'name' => 'Checkout Variant Mug',
            'description' => 'Checkout selection test product.',
            'category' => 'Drinkware',
            'status' => 'Active',
            'price' => 710,
            'cost_price' => 350,
            'stock' => 12,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)
            ->withSession([
                'cart' => [
                    "{$product->id}:gloss blue" => [
                        'id' => $product->id,
                        'cart_key' => "{$product->id}:gloss blue",
                        'artisan_id' => $seller->id,
                        'name' => $product->name,
                        'variant' => 'Gloss Blue',
                        'price' => $product->price,
                        'qty' => 1,
                        'img' => $product->img,
                        'seller' => $seller->name,
                        'shop_name' => $seller->shop_name ?? $seller->name,
                        'location' => $seller->city ?? 'Cavite',
                    ],
                    "{$product->id}:matte sand" => [
                        'id' => $product->id,
                        'cart_key' => "{$product->id}:matte sand",
                        'artisan_id' => $seller->id,
                        'name' => $product->name,
                        'variant' => 'Matte Sand',
                        'price' => $product->price,
                        'qty' => 2,
                        'img' => $product->img,
                        'seller' => $seller->name,
                        'shop_name' => $seller->shop_name ?? $seller->name,
                        'location' => $seller->city ?? 'Cavite',
                    ],
                ],
            ])
            ->get(route('checkout.create', [
                'items' => ["{$product->id}:matte sand"],
            ]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/Checkout')
                ->has('items', 1)
                ->where('items.0.cart_key', "{$product->id}:matte sand")
                ->where('items.0.variant', 'Matte Sand')
                ->where('items.0.qty', 2)
            );
    }

    public function test_cart_endpoints_support_inertia_requests_without_returning_plain_json(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CART-INERTIA-001',
            'name' => 'Inertia Clay Mug',
            'description' => 'Inertia compatibility test item.',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 350,
            'cost_price' => 150,
            'stock' => 15,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        $inertiaHeaders = [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ];

        // 1. Store via Inertia - MUST redirect back, NEVER return plain JSON
        $storeResponse = $this->actingAs($buyer)->post(route('cart.store'), [
            'product_id' => $product->id,
            'quantity' => 2,
        ], $inertiaHeaders);

        $storeResponse->assertRedirect();
        $storeResponse->assertSessionHas('success');
        $this->assertFalse($storeResponse->headers->contains('content-type', 'application/json'));

        $cart = session('cart', []);
        $cartKey = array_key_first($cart);
        $this->assertNotNull($cartKey);

        // 2. Update via Inertia - MUST redirect back
        $updateResponse = $this->actingAs($buyer)->patch(route('cart.update'), [
            'id' => $cartKey,
            'qty' => 4,
        ], $inertiaHeaders);

        $updateResponse->assertRedirect();
        $updateResponse->assertSessionHas('success');
        $this->assertFalse($updateResponse->headers->contains('content-type', 'application/json'));

        // 3. Destroy via Inertia - MUST redirect back
        $destroyResponse = $this->actingAs($buyer)->delete(route('cart.destroy'), [
            'id' => $cartKey,
        ], $inertiaHeaders);

        $destroyResponse->assertRedirect();
        $destroyResponse->assertSessionHas('success');
        $this->assertFalse($destroyResponse->headers->contains('content-type', 'application/json'));

        // 4. Clear via Inertia - MUST redirect back
        $clearResponse = $this->actingAs($buyer)->post(route('cart.clear'), [], $inertiaHeaders);

        $clearResponse->assertRedirect();
        $clearResponse->assertSessionHas('success');
        $this->assertFalse($clearResponse->headers->contains('content-type', 'application/json'));
    }

    public function test_cart_endpoints_still_support_pure_json_api_requests(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create();
        /** @var User $seller */
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CART-API-002',
            'name' => 'API Clay Mug',
            'description' => 'API compatibility test item.',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 400,
            'cost_price' => 200,
            'stock' => 10,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        // 1. Store via postJson
        $storeResponse = $this->actingAs($buyer)->postJson(route('cart.store'), [
            'product_id' => $product->id,
            'quantity' => 1,
        ]);

        $storeResponse->assertOk()
            ->assertJsonStructure(['success', 'message', 'cart', 'cart_count'])
            ->assertJsonPath('success', true);

        $cart = $storeResponse->json('cart');
        $cartKey = array_key_first($cart);

        // 2. Update via patchJson
        $updateResponse = $this->actingAs($buyer)->patchJson(route('cart.update'), [
            'id' => $cartKey,
            'qty' => 3,
        ]);

        $updateResponse->assertOk()
            ->assertJsonStructure(['success', 'message', 'cart', 'cart_count'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('cart_count', 3);

        // 3. Destroy via deleteJson
        $destroyResponse = $this->actingAs($buyer)->deleteJson(route('cart.destroy'), [
            'id' => $cartKey,
        ]);

        $destroyResponse->assertOk()
            ->assertJsonStructure(['success', 'message', 'cart', 'cart_count'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('cart_count', 0);

        // 4. Clear via postJson
        $clearResponse = $this->actingAs($buyer)->postJson(route('cart.clear'));

        $clearResponse->assertOk()
            ->assertJsonStructure(['success', 'message', 'cart', 'cart_count'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('cart_count', 0);
    }
}
