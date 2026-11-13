<?php

declare(strict_types=1);

namespace Tests\Feature\Consumer;

use App\Models\Order;
use App\Models\PlatformPolicy;
use App\Models\Product;
use App\Models\User;
use App\Models\UserPolicyConsent;
use App\Services\PolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CheckoutPolicyConsentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Notification::fake();
    }

    public function test_checkout_screen_exposes_active_platform_policies_and_return_window_props(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Artisan Ceramic Studio',
            'city' => 'Dasmariñas',
        ]);
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'city' => 'Dasmariñas',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CHK-POL-001',
            'name' => 'Handcrafted Terracotta Pot',
            'description' => 'Quality Cavite earthenware.',
            'category' => 'Pots & Planters',
            'status' => 'Active',
            'price' => 850,
            'cost_price' => 500,
            'stock' => 10,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)->get(route('checkout.create', ['product_id' => $product->id]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Checkout')
            ->has('policies.' . PlatformPolicy::TYPE_TERMS_OF_SERVICE)
            ->has('policies.' . PlatformPolicy::TYPE_PRIVACY_POLICY)
            ->has('policies.' . PlatformPolicy::TYPE_RETURN_REFUND)
            ->where('policies.' . PlatformPolicy::TYPE_TERMS_OF_SERVICE . '.version', '1.0')
            ->where('policies.' . PlatformPolicy::TYPE_PRIVACY_POLICY . '.version', '1.0')
            ->where('policies.' . PlatformPolicy::TYPE_RETURN_REFUND . '.version', '1.0')
            ->where('returnWindowHours', 24)
            ->where('compliance.return_window_hours', 24)
            ->where('compliance.return_window_summary', '24-hour return inspection window')
        );
    }

    public function test_order_placement_records_user_policy_consents_for_all_checkout_policies(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay Works Workshop',
            'city' => 'Imus',
        ]);
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'city' => 'Imus',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CHK-POL-002',
            'name' => 'Glazed Ceramic Mug',
            'description' => 'Wheel-thrown glazed mug.',
            'category' => 'Mugs & Cups',
            'status' => 'Active',
            'price' => 450,
            'cost_price' => 250,
            'stock' => 15,
            'lead_time' => 1,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                [
                    'id' => $product->id,
                    'artisan_id' => $seller->id,
                    'name' => $product->name,
                    'qty' => 2,
                    'variant' => 'Standard',
                ],
            ],
            'shipping_method' => 'Delivery',
            'shipping_address' => '789 Malagasang St, Imus, Cavite',
            'shipping_street_address' => '789 Malagasang St',
            'shipping_barangay' => 'Malagasang I-A',
            'shipping_city' => 'Imus',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4103',
            'shipping_address_type' => 'home',
            'recipient_name' => 'Maria Santos',
            'phone_number' => '09171234567',
            'payment_method' => 'COD',
            'total' => 950,
            'shipping_notes' => 'Ring the doorbell.',
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::latest('id')->first();
        $this->assertNotNull($order);

        $expectedPolicyTypes = [
            PlatformPolicy::TYPE_TERMS_OF_SERVICE,
            PlatformPolicy::TYPE_PRIVACY_POLICY,
            PlatformPolicy::TYPE_RETURN_REFUND,
        ];

        foreach ($expectedPolicyTypes as $type) {
            $this->assertDatabaseHas('user_policy_consents', [
                'user_id' => $buyer->id,
                'order_id' => $order->id,
                'policy_type' => $type,
                'context' => 'checkout',
                'policy_version' => '1.0',
            ]);
        }

        $returnConsent = UserPolicyConsent::where('order_id', $order->id)
            ->where('policy_type', PlatformPolicy::TYPE_RETURN_REFUND)
            ->first();

        $this->assertNotNull($returnConsent);
        $this->assertSame(24, $returnConsent->criteria_acknowledged['return_window_hours'] ?? null);
    }

    public function test_checkout_policy_consents_record_updated_active_policy_version(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $policyService = app(PolicyService::class);

        // Publish Terms v2.0
        $policyService->publishPolicyVersion(PlatformPolicy::TYPE_TERMS_OF_SERVICE, [
            'title' => 'Updated Terms of Service 2026',
            'version' => '2.0',
            'content_markdown' => "## Terms\nUpdated terms for buyer checkout protection.",
        ], $admin);

        // Publish Return Policy v2.0 with 48h return window
        $policyService->publishPolicyVersion(PlatformPolicy::TYPE_RETURN_REFUND, [
            'title' => 'Return & Refund Policy Extended',
            'version' => '2.0',
            'content_markdown' => "## Return Window\nExtended to 48 hours for handmade ceramics.",
            'structured_criteria' => [
                'return_window_hours' => 48,
                'max_photos' => 5,
                'eligible_reasons' => [
                    ['code' => 'damaged_in_transit', 'label' => 'Damaged in transit', 'requires_description' => true, 'enabled' => true],
                ],
                'mandatory_photo_angles' => [
                    ['key' => 'item_defect', 'label' => 'Item Defect', 'required' => true],
                    ['key' => 'shipping_packaging', 'label' => 'Packaging', 'required' => true],
                ],
                'checklist_items' => [
                    ['key' => 'within_window', 'label' => 'Within 48 hours', 'required' => true],
                ],
            ],
        ], $admin);

        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Extended Return Studio',
            'city' => 'Tagaytay',
        ]);
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'city' => 'Tagaytay',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'CHK-POL-003',
            'name' => 'Artisan Planter Bowl',
            'description' => 'Heavy earthenware planter.',
            'category' => 'Pots & Planters',
            'status' => 'Active',
            'price' => 1200,
            'cost_price' => 700,
            'stock' => 5,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);

        // 1. Verify checkout props show version 2.0 and 48-hour window
        $response = $this->actingAs($buyer)->get(route('checkout.create', ['product_id' => $product->id]));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Checkout')
            ->where('policies.' . PlatformPolicy::TYPE_TERMS_OF_SERVICE . '.version', '2.0')
            ->where('policies.' . PlatformPolicy::TYPE_RETURN_REFUND . '.version', '2.0')
            ->where('returnWindowHours', 48)
            ->where('compliance.return_window_hours', 48)
            ->where('compliance.return_window_summary', '48-hour return inspection window')
        );

        // 2. Place order and verify consent records v2.0
        $this->actingAs($buyer)->post(route('checkout.store'), [
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
            'shipping_address' => 'Calamba Road, Tagaytay, Cavite',
            'shipping_street_address' => 'Calamba Road',
            'shipping_barangay' => 'Iruhin East',
            'shipping_city' => 'Tagaytay',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4120',
            'shipping_address_type' => 'home',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09181234567',
            'payment_method' => 'COD',
            'total' => 1250,
        ])->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::latest('id')->first();
        $this->assertNotNull($order);

        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'policy_type' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
            'policy_version' => '2.0',
            'context' => 'checkout',
        ]);

        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'policy_type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'policy_version' => '2.0',
            'context' => 'checkout',
        ]);

        $returnConsent = UserPolicyConsent::where('order_id', $order->id)
            ->where('policy_type', PlatformPolicy::TYPE_RETURN_REFUND)
            ->first();

        $this->assertSame(48, $returnConsent->criteria_acknowledged['return_window_hours'] ?? null);
    }

    public function test_multi_seller_checkout_records_policy_consents_for_each_created_order(): void
    {
        $sellerA = User::factory()->artisanApproved()->create(['shop_name' => 'Workshop Alpha', 'city' => 'Silang']);
        $sellerB = User::factory()->artisanApproved()->create(['shop_name' => 'Workshop Beta', 'city' => 'Silang']);
        $buyer = User::factory()->create(['role' => 'buyer', 'city' => 'Silang']);

        $productA = Product::create([
            'user_id' => $sellerA->id,
            'sku' => 'MULTI-A-001',
            'name' => 'Silang Clay Pot',
            'description' => 'Description A',
            'category' => 'Pots & Planters',
            'status' => 'Active',
            'price' => 500,
            'cost_price' => 300,
            'stock' => 10,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        $productB = Product::create([
            'user_id' => $sellerB->id,
            'sku' => 'MULTI-B-001',
            'name' => 'Silang Ceramic Plate',
            'description' => 'Description B',
            'category' => 'Dinnerware',
            'status' => 'Active',
            'price' => 600,
            'cost_price' => 350,
            'stock' => 10,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                [
                    'id' => $productA->id,
                    'artisan_id' => $sellerA->id,
                    'name' => $productA->name,
                    'qty' => 1,
                    'variant' => 'Standard',
                ],
                [
                    'id' => $productB->id,
                    'artisan_id' => $sellerB->id,
                    'name' => $productB->name,
                    'qty' => 1,
                    'variant' => 'Standard',
                ],
            ],
            'shipping_method' => 'Delivery',
            'shipping_address' => 'By-Pass Road, Silang, Cavite',
            'shipping_street_address' => 'By-Pass Road',
            'shipping_barangay' => 'Biga I',
            'shipping_city' => 'Silang',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4118',
            'shipping_address_type' => 'home',
            'recipient_name' => 'Elena Gomez',
            'phone_number' => '09191234567',
            'payment_method' => 'COD',
            'total' => 1200,
        ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $orders = Order::where('user_id', $buyer->id)->get();
        $this->assertCount(2, $orders);

        foreach ($orders as $order) {
            $consents = UserPolicyConsent::where('order_id', $order->id)
                ->where('context', 'checkout')
                ->get();

            $this->assertCount(3, $consents);
            $this->assertTrue($consents->contains('policy_type', PlatformPolicy::TYPE_TERMS_OF_SERVICE));
            $this->assertTrue($consents->contains('policy_type', PlatformPolicy::TYPE_PRIVACY_POLICY));
            $this->assertTrue($consents->contains('policy_type', PlatformPolicy::TYPE_RETURN_REFUND));
        }
    }

    public function test_api_policies_show_endpoint_returns_active_policy_and_handles_invalid_types(): void
    {
        // 1. Shorthand returns policy
        $response = $this->getJson(route('api.policies.show', 'returns'));
        $response->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_RETURN_REFUND)
            ->assertJsonStructure([
                'policy' => ['id', 'type', 'title', 'version', 'sections'],
                'type',
            ]);

        // 2. Full type terms_of_service
        $response = $this->getJson(route('api.policies.show', PlatformPolicy::TYPE_TERMS_OF_SERVICE));
        $response->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_TERMS_OF_SERVICE);

        // 3. Shorthand privacy
        $response = $this->getJson(route('api.policies.show', 'privacy'));
        $response->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_PRIVACY_POLICY);

        // 4. Full type return_refund_policy and slug formats
        $this->getJson(route('api.policies.show', 'return_refund_policy'))
            ->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_RETURN_REFUND);

        $this->getJson(route('api.policies.show', 'return-refund-policy'))
            ->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_RETURN_REFUND);

        $this->getJson(route('api.policies.show', 'privacy-policy'))
            ->assertOk()
            ->assertJsonPath('type', PlatformPolicy::TYPE_PRIVACY_POLICY);

        // 5. Invalid policy type returns 404
        $response = $this->getJson(route('api.policies.show', 'invalid_policy_type'));
        $response->assertNotFound();
    }

    public function test_checkout_policy_consents_commit_cleanly_when_place_order_is_invoked_inside_outer_transaction(): void
    {
        $seller = User::factory()->artisanApproved()->create(['shop_name' => 'Outer Trans Studio', 'city' => 'Bacoor']);
        $buyer = User::factory()->create(['role' => 'buyer', 'city' => 'Bacoor']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'OUTER-TX-001',
            'name' => 'Outer Transaction Vase',
            'description' => 'Tested under active database transaction.',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 700,
            'cost_price' => 400,
            'stock' => 10,
            'lead_time' => 2,
            'track_as_supply' => false,
        ]);

        $checkoutRequest = new \App\Http\Requests\CheckoutRequest();
        $checkoutRequest->merge([
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
            'shipping_address' => 'Molino Road, Bacoor, Cavite',
            'shipping_street_address' => 'Molino Road',
            'shipping_barangay' => 'Molino III',
            'shipping_city' => 'Bacoor',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4102',
            'shipping_address_type' => 'home',
            'recipient_name' => 'Jose Rizal',
            'phone_number' => '09201234567',
            'payment_method' => 'COD',
            'total' => 750,
        ]);

        $placeOrder = app(\App\Actions\Consumer\PlaceOrder::class);

        \Illuminate\Support\Facades\DB::transaction(function () use ($placeOrder, $checkoutRequest, $buyer) {
            $placeOrder->execute($checkoutRequest, $buyer);
        });

        $order = Order::latest('id')->first();
        $this->assertNotNull($order);

        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'policy_type' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
            'context' => 'checkout',
        ]);
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'policy_type' => PlatformPolicy::TYPE_PRIVACY_POLICY,
            'context' => 'checkout',
        ]);
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'policy_type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'context' => 'checkout',
        ]);
    }
}
