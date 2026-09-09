<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Product;
use App\Models\SubscriptionTransaction;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubscriptionTierLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Product::$bypassReview = true;
        Storage::fake('public');
        Category::firstOrCreate(['name' => 'Pottery'], ['slug' => 'pottery']);
        Category::firstOrCreate(['name' => 'Weaving'], ['slug' => 'weaving']);
    }

    protected function tearDown(): void
    {
        Product::$bypassReview = false;
        parent::tearDown();
    }

    // ==========================================
    // 1. FREE (STANDARD) TIER ENFORCEMENT
    // ==========================================

    public function test_free_tier_artisan_can_create_up_to_limit_active_products(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $this->createActiveProduct($seller, ['name' => 'Existing 1']);
        $this->createActiveProduct($seller, ['name' => 'Existing 2']);

        $this->assertEquals(2, $seller->products()->where('status', 'Active')->count());
        $this->assertEquals(3, $seller->getActiveProductLimit());
        $this->assertTrue($seller->canAddMoreProducts());

        // 3rd product listing as active is allowed within free tier quota
        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-FREE-003',
            'name' => 'Third Active Craft',
            'category' => 'Pottery',
            'price' => 250.00,
            'cost_price' => 100.00,
            'stock' => 15,
            'status' => 'Active',
            'production_method' => 'resell',
            'cover_photo' => UploadedFile::fake()->image('cover.jpg', 600, 600),
            'gallery' => [
                UploadedFile::fake()->image('g1.jpg'),
                UploadedFile::fake()->image('g2.jpg'),
                UploadedFile::fake()->image('g3.jpg'),
            ],
            'model_3d' => UploadedFile::fake()->create('model.glb', 1024, 'model/gltf-binary'),
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertEquals(3, $seller->fresh()->products()->where('status', 'Active')->count());
        $this->assertFalse($seller->fresh()->canAddMoreProducts());
    }

    public function test_free_tier_artisan_is_blocked_from_creating_4th_active_product(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        // Already at limit of 3
        for ($i = 1; $i <= 3; $i++) {
            $this->createActiveProduct($seller, ['name' => "Craft {$i}"]);
        }

        $this->assertFalse($seller->canAddMoreProducts());

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-FREE-004',
            'name' => 'Fourth Exceeding Craft',
            'category' => 'Pottery',
            'price' => 300.00,
            'cost_price' => 120.00,
            'stock' => 10,
            'status' => 'Active',
            'production_method' => 'resell',
            'cover_photo' => UploadedFile::fake()->image('cover.jpg', 600, 600),
            'gallery' => [
                UploadedFile::fake()->image('g1.jpg'),
                UploadedFile::fake()->image('g2.jpg'),
                UploadedFile::fake()->image('g3.jpg'),
            ],
            'model_3d' => UploadedFile::fake()->create('model.glb', 1024, 'model/gltf-binary'),
        ]);

        $response->assertSessionHasErrors('limit');
        $this->assertDatabaseMissing('products', ['sku' => 'SKU-FREE-004']);
    }

    public function test_free_tier_artisan_can_create_draft_when_active_limit_is_reached(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        for ($i = 1; $i <= 3; $i++) {
            $this->createActiveProduct($seller, ['name' => "Craft {$i}"]);
        }

        // Creating 4th product as Draft is allowed
        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-FREE-DRAFT',
            'name' => 'Draft Product Safe',
            'category' => 'Pottery',
            'price' => 300.00,
            'cost_price' => 120.00,
            'stock' => 10,
            'status' => 'Draft',
            'production_method' => 'resell',
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('products', [
            'sku' => 'SKU-FREE-DRAFT',
            'status' => 'Draft',
        ]);
    }

    public function test_free_tier_artisan_is_blocked_from_material_recipe_tracking(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $supply = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Terracotta Clay',
            'category' => 'Raw Materials',
            'quantity' => 100,
            'unit' => 'kg',
            'unit_cost' => 50,
        ]);

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-FREE-RECIPE',
            'name' => 'Clay Vase With Recipe',
            'category' => 'Pottery',
            'price' => 450.00,
            'cost_price' => 150.00,
            'stock' => 5,
            'status' => 'Draft',
            'production_method' => 'manufactured',
            'recipes' => [
                [
                    'supply_id' => $supply->id,
                    'quantity_required' => 2.5,
                ]
            ],
        ]);

        $response->assertSessionHasErrors('recipes');
        $this->assertDatabaseMissing('products', ['sku' => 'SKU-FREE-RECIPE']);
    }

    // ==========================================
    // 2. PREMIUM TIER ENFORCEMENT & GATES
    // ==========================================

    public function test_premium_tier_artisan_can_have_up_to_10_active_products(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(25),
        ]);

        for ($i = 1; $i <= 9; $i++) {
            $this->createActiveProduct($seller, ['name' => "Premium Craft {$i}"]);
        }

        $this->assertEquals(10, $seller->getActiveProductLimit());
        $this->assertTrue($seller->canAddMoreProducts());

        // 10th active product is allowed
        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-PREM-010',
            'name' => 'Tenth Premium Craft',
            'category' => 'Pottery',
            'price' => 500.00,
            'cost_price' => 200.00,
            'stock' => 8,
            'status' => 'Active',
            'production_method' => 'resell',
            'cover_photo' => UploadedFile::fake()->image('cover.jpg', 600, 600),
            'gallery' => [
                UploadedFile::fake()->image('g1.jpg'),
                UploadedFile::fake()->image('g2.jpg'),
                UploadedFile::fake()->image('g3.jpg'),
            ],
            'model_3d' => UploadedFile::fake()->create('model.glb', 1024, 'model/gltf-binary'),
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertEquals(10, $seller->fresh()->products()->where('status', 'Active')->count());
        $this->assertFalse($seller->fresh()->canAddMoreProducts());
    }

    public function test_premium_tier_artisan_is_blocked_from_11th_active_product(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(25),
        ]);

        for ($i = 1; $i <= 10; $i++) {
            $this->createActiveProduct($seller, ['name' => "Premium Craft {$i}"]);
        }

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-PREM-011',
            'name' => 'Eleventh Exceeding Craft',
            'category' => 'Pottery',
            'price' => 500.00,
            'cost_price' => 200.00,
            'stock' => 8,
            'status' => 'Active',
            'production_method' => 'resell',
            'cover_photo' => UploadedFile::fake()->image('cover.jpg', 600, 600),
            'gallery' => [
                UploadedFile::fake()->image('g1.jpg'),
                UploadedFile::fake()->image('g2.jpg'),
                UploadedFile::fake()->image('g3.jpg'),
            ],
            'model_3d' => UploadedFile::fake()->create('model.glb', 1024, 'model/gltf-binary'),
        ]);

        $response->assertSessionHasErrors('limit');
        $this->assertDatabaseMissing('products', ['sku' => 'SKU-PREM-011']);
    }

    public function test_premium_tier_artisan_can_use_material_recipe_tracking(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(25),
        ]);

        $supply = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Stoneware Clay',
            'category' => 'Raw Materials',
            'quantity' => 150,
            'unit' => 'kg',
            'unit_cost' => 60,
        ]);

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'SKU-PREM-RECIPE',
            'name' => 'Handmade Stoneware Mug',
            'category' => 'Pottery',
            'price' => 380.00,
            'cost_price' => 120.00,
            'stock' => 10,
            'status' => 'Draft',
            'production_method' => 'manufactured',
            'recipes' => [
                [
                    'supply_id' => $supply->id,
                    'quantity_required' => 1.2,
                ]
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('products', [
            'sku' => 'SKU-PREM-RECIPE',
            'production_method' => 'manufactured',
        ]);
        $this->assertDatabaseHas('product_recipes', [
            'supply_id' => $supply->id,
            'quantity_required' => 1.2,
        ]);
    }

    // ==========================================
    // 3. ELITE TIER ENFORCEMENT & MODULE GATES
    // ==========================================

    public function test_elite_tier_artisan_has_50_product_quota_and_sponsorship_access(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
            'subscription_expires_at' => now()->addDays(30),
        ]);

        $this->assertEquals(50, $seller->getActiveProductLimit());
        $this->assertTrue($seller->isEliteTier());
        $this->assertTrue($seller->isPremiumTier());

        // Elite seller can access sponsorships module
        $this->actingAs($seller)
            ->get(route('seller.sponsorships'))
            ->assertOk();

        // Elite seller can export analytics
        $this->actingAs($seller)
            ->get(route('analytics.export'))
            ->assertOk();
    }

    // ==========================================
    // 4. WEBHOOK RENEWAL EVENTS & PAYMENT FAILURES
    // ==========================================

    public function test_webhook_renewal_extends_active_period_by_30_days(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_renewal');

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(10),
            'subscription_cancelled_at' => now()->subDay(),
            'pending_downgrade_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'premium',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'reference_number' => 'SUB-RENEW-123',
            'paymongo_session_id' => 'cs_sub_renewal_session',
        ]);

        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_sub_renewal_session',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'status' => 'completed',
                        ]
                    ]
                ]
            ]
        ];

        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsk_test_renewal');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $response->assertStatus(200);

        $seller->refresh();
        $transaction->refresh();

        $this->assertSame(SubscriptionTransaction::STATUS_PAID, $transaction->status);
        $this->assertSame('premium', $seller->premium_tier);
        // Extended from 10 days remaining to ~40 days remaining
        $this->assertNotNull($seller->subscription_expires_at);
        $this->assertTrue($seller->subscription_expires_at->isAfter(now()->addDays(38)));
        // Auto renewal cancellation cleared
        $this->assertNull($seller->subscription_cancelled_at);
    }

    public function test_webhook_payment_failure_marks_transaction_as_failed(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_failed');

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'reference_number' => 'SUB-FAIL-123',
            'paymongo_session_id' => 'cs_sub_failed_session',
        ]);

        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.failed',
                    'data' => [
                        'id' => 'pay_fail_999',
                        'attributes' => [
                            'checkout_session_id' => 'cs_sub_failed_session',
                            'reference_number' => 'SUB-FAIL-123',
                            'failed_code' => 'insufficient_funds',
                            'failure_message' => 'Card was declined due to insufficient balance.',
                        ]
                    ]
                ]
            ]
        ];

        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsk_test_failed');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $response->assertStatus(200);

        $transaction->refresh();
        $this->assertSame(SubscriptionTransaction::STATUS_FAILED, $transaction->status);
        $this->assertSame('insufficient_funds', $transaction->metadata['failure_reason'] ?? null);

        // Seller is still free tier
        $this->assertSame('free', $seller->fresh()->premium_tier);
    }

    // ==========================================
    // 5. SCHEDULED GRACEFUL DOWNGRADE TRANSITIONS
    // ==========================================

    public function test_scheduled_job_gracefully_downgrades_expired_premium_subscription_to_free(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->subHours(2), // Expired 2 hours ago
            'subscription_cancelled_at' => now()->subDays(15),
            'pending_downgrade_tier' => 'free',
        ]);

        // Seller currently has 6 active products (limit for Free is 3)
        $products = collect(range(1, 6))->map(function (int $index) use ($seller) {
            return $this->createActiveProduct($seller, [
                'name' => "Product {$index}",
                'sku' => "SKU-EXP-{$index}",
                'sold' => 10 - $index, // 1st is highest seller
                'created_at' => now()->subDays(10 - $index),
            ]);
        });

        $this->assertEquals(6, $seller->products()->where('status', 'Active')->count());

        // Run the scheduled command
        Artisan::call('subscriptions:process-lifecycle');

        $seller->refresh();

        // Tier transitioned to free
        $this->assertSame('free', $seller->premium_tier);
        $this->assertNull($seller->subscription_expires_at);

        // Top 3 selling active products remain Active, other 3 drafted
        $this->assertEquals(3, $seller->products()->where('status', 'Active')->count());
        $this->assertEquals(3, $seller->products()->where('status', 'Draft')->count());

        // Top 3 items by sales count must be active
        foreach ($products->take(3) as $topProduct) {
            $this->assertDatabaseHas('products', [
                'id' => $topProduct->id,
                'status' => 'Active',
            ]);
        }

        // Bottom 3 items must be in Draft
        foreach ($products->skip(3) as $bottomProduct) {
            $this->assertDatabaseHas('products', [
                'id' => $bottomProduct->id,
                'status' => 'Draft',
            ]);
        }

        // Tier log created
        $this->assertDatabaseHas('user_tier_logs', [
            'user_id' => $seller->id,
            'previous_tier' => 'premium',
            'new_tier' => 'free',
        ]);
    }

    public function test_scheduled_job_suspends_staff_when_downgrading_expired_elite_to_free(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
            'subscription_expires_at' => now()->subHour(),
            'pending_downgrade_tier' => 'free',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        Artisan::call('subscriptions:process-lifecycle');

        $seller->refresh();
        $staff->refresh();

        $this->assertSame('free', $seller->premium_tier);
        $this->assertNotNull($staff->staff_plan_suspended_at);
    }

    public function test_scheduled_job_suspends_staff_when_downgrading_expired_premium_to_free(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->subHour(),
            'pending_downgrade_tier' => 'free',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        Artisan::call('subscriptions:process-lifecycle');

        $seller->refresh();
        $staff->refresh();

        $this->assertSame('free', $seller->premium_tier);
        $this->assertNotNull($staff->staff_plan_suspended_at);
    }

    public function test_expired_super_premium_downgrading_to_premium_retains_10_product_limit(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
            'subscription_expires_at' => now()->subHour(),
            'pending_downgrade_tier' => 'premium',
        ]);

        // Seller has 8 active products (which is > 3 Free limit, but <= 10 Premium limit)
        for ($i = 1; $i <= 8; $i++) {
            $this->createActiveProduct($seller, ['name' => "Product {$i}", 'sold' => $i]);
        }

        $this->assertEquals(8, $seller->products()->where('status', 'Active')->count());

        Artisan::call('subscriptions:process-lifecycle');

        $seller->refresh();

        // Tier transitioned to premium
        $this->assertSame('premium', $seller->premium_tier);
        // All 8 products must remain Active because Premium quota is 10
        $this->assertEquals(8, $seller->products()->where('status', 'Active')->count());
        $this->assertEquals(0, $seller->products()->where('status', 'Draft')->count());
    }

    public function test_webhook_duplicate_payment_paid_is_idempotent_and_returns_success(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_duplicate');

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(20),
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'premium',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PAID,
            'reference_number' => 'SUB-DUP-123',
            'paymongo_session_id' => 'cs_sub_dup_session',
        ]);

        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id' => 'pay_dup_999',
                        'attributes' => [
                            'checkout_session_id' => 'cs_sub_dup_session',
                            'metadata' => [
                                'reference_number' => 'SUB-DUP-123',
                            ],
                        ]
                    ]
                ]
            ]
        ];

        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsk_test_duplicate');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);
    }

    public function test_webhook_duplicate_payment_failure_is_idempotent(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_dup_fail');

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_FAILED,
            'reference_number' => 'SUB-FAIL-DUP',
            'paymongo_session_id' => 'cs_sub_fail_dup',
        ]);

        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.failed',
                    'data' => [
                        'id' => 'pay_fail_dup',
                        'attributes' => [
                            'checkout_session_id' => 'cs_sub_fail_dup',
                            'metadata' => [
                                'reference_number' => 'SUB-FAIL-DUP',
                            ],
                            'failed_code' => 'card_declined',
                        ]
                    ]
                ]
            ]
        ];

        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsk_test_dup_fail');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);
    }

    public function test_bulk_activation_rejection_advises_artisan_to_upgrade_when_limit_reached(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        for ($i = 1; $i <= 3; $i++) {
            $this->createActiveProduct($seller, ['name' => "Craft {$i}"]);
        }

        // Create a 4th valid product in Draft with all required media
        $extraDraft = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-EXTRA-DRAFT',
            'name' => 'Fourth Draft Craft',
            'category' => 'Pottery',
            'status' => 'Draft',
            'price' => 200.00,
            'stock' => 10,
            'lead_time' => 3,
            'cover_photo_path' => 'products/covers/cover.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/3d/model.glb',
        ]);

        $response = $this->actingAs($seller)->post(route('products.bulk-status'), [
            'ids' => [$extraDraft->id],
            'status' => 'Active',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error', 'No selected products were activated. Your active product limit has already been reached.');

        // Single activation explicitly prompts to upgrade plan
        $singleResponse = $this->actingAs($seller)->post(route('products.activate', $extraDraft->id));
        $singleResponse->assertRedirect();
        $singleResponse->assertSessionHas('error', 'You have reached your active products limit. Please upgrade your plan.');
    }

    public function test_downgrade_invalidates_seller_catalog_and_storefront_caches(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->subHour(),
            'pending_downgrade_tier' => 'free',
        ]);

        for ($i = 1; $i <= 5; $i++) {
            $this->createActiveProduct($seller, ['name' => "Craft {$i}", 'sold' => $i]);
        }

        // Populate cache keys
        \Illuminate\Support\Facades\Cache::put("seller_{$seller->id}_products", 'cached_products', 600);
        \Illuminate\Support\Facades\Cache::put('shop_catalog_default_page_1', 'cached_page', 600);

        $this->assertTrue(\Illuminate\Support\Facades\Cache::has("seller_{$seller->id}_products"));
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has('shop_catalog_default_page_1'));

        Artisan::call('subscriptions:process-lifecycle');

        $this->assertFalse(\Illuminate\Support\Facades\Cache::has("seller_{$seller->id}_products"));
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('shop_catalog_default_page_1'));
    }

    public function test_free_tier_artisan_is_blocked_from_material_recipe_tracking_on_update(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-UPDATE-RECIPE',
            'name' => 'Existing Pottery Craft',
            'category' => 'Pottery',
            'status' => 'Draft',
            'price' => 200.00,
            'stock' => 10,
            'lead_time' => 3,
            'production_method' => 'resell',
        ]);

        $supply = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Glaze Liquid',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'L',
            'unit_cost' => 120,
        ]);

        $response = $this->actingAs($seller)->post(route('products.update', $product->id), [
            'name' => 'Existing Pottery Craft Updated',
            'category' => 'Pottery',
            'price' => 220.00,
            'cost_price' => 100.00,
            'stock' => 8,
            'status' => 'Draft',
            'production_method' => 'manufactured',
            'recipes' => [
                [
                    'supply_id' => $supply->id,
                    'quantity_required' => 0.5,
                ]
            ],
        ]);

        $response->assertSessionHasErrors(['recipes', 'production_method']);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function createActiveProduct(User $seller, array $overrides = []): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-' . fake()->unique()->bothify('????-####'),
            'name' => 'Sample Artisan Craft',
            'description' => 'Fine handmade piece',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 200.00,
            'stock' => 10,
            'lead_time' => 3,
            'sold' => 0,
            ...$overrides,
        ]);
    }
}
