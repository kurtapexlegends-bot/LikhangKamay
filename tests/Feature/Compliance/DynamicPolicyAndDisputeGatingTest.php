<?php

declare(strict_types=1);

namespace Tests\Feature\Compliance;

use App\Models\Dispute;
use App\Models\Order;
use App\Models\PlatformPolicy;
use App\Models\Product;
use App\Models\User;
use App\Models\UserPolicyConsent;
use App\Services\PolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DynamicPolicyAndDisputeGatingTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_default_return_policy_uses_24_hour_window_and_all_types_are_active(): void
    {
        foreach (PlatformPolicy::ALL_TYPES as $type) {
            $policy = PlatformPolicy::ofType($type)->active()->first();
            $this->assertNotNull($policy, "Missing active seeded policy for {$type}");
            $this->assertSame('1.0', $policy->version);
        }

        $policyService = app(PolicyService::class);
        $this->assertSame(24, $policyService->getReturnWindowHours());
    }

    public function test_public_legal_pages_render_active_dynamic_policy_version(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $policyService = app(PolicyService::class);

        $policyService->publishPolicyVersion(PlatformPolicy::TYPE_TERMS_OF_SERVICE, [
            'title' => 'Terms of Service Updated',
            'version' => '2.0',
            'content_markdown' => "Intro line.\n\n## Dynamic Section\nUpdated legal text for defense.",
        ], $admin);

        $this->get(route('terms'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Legal/TermsOfService')
                ->where('policy.version', '2.0')
                ->where('policy.title', 'Terms of Service Updated')
                ->where('policy.sections.0.title', 'Dynamic Section')
            );

        $this->get(route('privacy'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Legal/GeneralPrivacy')
                ->where('policy.version', '1.0')
            );

        $this->get(route('seller.agreement'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Legal/SellerAgreement')
                ->where('policy.version', '1.0')
            );
    }

    public function test_admin_can_publish_and_revert_policies_while_non_admins_are_forbidden(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->actingAs($buyer)
            ->get(route('admin.policies.index'))
            ->assertForbidden();

        $this->actingAs($buyer)
            ->post(route('admin.policies.store'), [
                'type' => PlatformPolicy::TYPE_RETURN_REFUND,
                'title' => 'Return Policy',
                'version' => '1.1',
                'content_markdown' => '## Window\n7 days.',
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->get(route('admin.policies.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Settings/Policies')
                ->has('policiesByType.return_refund_policy.active')
            );

        $this->actingAs($admin)
            ->post(route('admin.policies.store'), [
                'type' => PlatformPolicy::TYPE_RETURN_REFUND,
                'title' => 'Invalid Photo Ceiling Policy',
                'version' => '9.9',
                'content_markdown' => "## Inspection Window\nInvalid config.",
                'structured_criteria' => [
                    'return_window_hours' => 24,
                    'max_photos' => 1,
                    'mandatory_photo_angles' => [
                        ['key' => 'item_defect', 'label' => 'Item Defect', 'required' => true],
                        ['key' => 'shipping_packaging', 'label' => 'Shipping Packaging', 'required' => true],
                    ],
                ],
            ])
            ->assertSessionHasErrors('structured_criteria.max_photos');

        $response = $this->actingAs($admin)->post(route('admin.policies.store'), [
            'type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'title' => 'Return, Refund & Replacement Policy',
            'version' => '2.0',
            'content_markdown' => "## Inspection Window\nBuyers now have 7 days.",
            'structured_criteria' => [
                'return_window_hours' => 168,
                'max_photos' => 5,
                'eligible_reasons' => [
                    ['code' => 'damaged_in_transit', 'label' => 'Damaged in transit', 'requires_description' => true, 'enabled' => true],
                ],
                'mandatory_photo_angles' => [
                    ['key' => 'item_defect', 'label' => 'Item Defect', 'required' => true],
                    ['key' => 'shipping_packaging', 'label' => 'Shipping Packaging', 'required' => true],
                ],
                'checklist_items' => [
                    ['key' => 'within_window', 'label' => 'Within window', 'required' => true],
                ],
            ],
        ]);

        $response->assertRedirect();
        $this->assertSame(168, app(PolicyService::class)->getReturnWindowHours());

        $v1 = PlatformPolicy::ofType(PlatformPolicy::TYPE_RETURN_REFUND)->where('version', '1.0')->firstOrFail();
        $this->actingAs($admin)
            ->post(route('admin.policies.activate', $v1->id))
            ->assertRedirect();

        $this->assertSame(24, app(PolicyService::class)->getReturnWindowHours());
    }

    public function test_warranty_window_applies_to_newly_delivered_orders_and_grandfathers_completed_orders(): void
    {
        Storage::fake('public');
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Clay Bowl',
            'sku' => 'CB-001',
            'category' => 'Bowls',
            'status' => 'Active',
            'price' => 300,
            'cost_price' => 100,
            'stock' => 10,
        ]);

        // 1. Grandfathered completed order delivered under default 24h window, received 30 hours ago
        $grandfatheredOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-GF-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'total_amount' => 300,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(30),
            'warranty_expires_at' => now()->subHours(6),
        ]);

        // 2. Admin increases return window to 7 days (168 hours)
        $policyService = app(PolicyService::class);
        $policyService->publishPolicyVersion(PlatformPolicy::TYPE_RETURN_REFUND, [
            'title' => 'Return Policy 7D',
            'version' => '1.1',
            'content_markdown' => "## Inspection Window\n7 days.",
            'structured_criteria' => [
                'return_window_hours' => 168,
                'max_photos' => 5,
                'eligible_reasons' => PolicyService::defaultReturnCriteria()['eligible_reasons'],
                'mandatory_photo_angles' => PolicyService::defaultReturnCriteria()['mandatory_photo_angles'],
                'checklist_items' => PolicyService::defaultReturnCriteria()['checklist_items'],
            ],
        ], $admin);

        // Grandfathered order is STILL expired and blocked!
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $grandfatheredOrder->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'reason' => 'Cracked bowl',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');

        // Grandfathered order with received_at=null and updated_at bumped after expiration must STILL stay expired
        $bumpedGrandfatheredOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-GF-BUMP-003',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'total_amount' => 300,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'delivered_at' => now()->subHours(30),
            'received_at' => null,
            'warranty_expires_at' => now()->subHours(6),
        ]);
        $bumpedGrandfatheredOrder->touch();

        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $bumpedGrandfatheredOrder->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'reason' => 'Late claim after updated_at bump',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');

        // 3. Newly delivered order gets 168h window
        $newOrder = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-NEW-002',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300,
            'total_amount' => 300,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $newOrder->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 300,
            'quantity' => 1,
        ]);

        $this->actingAs($seller)
            ->post(route('orders.update', $newOrder->order_number), [
                'status' => 'Delivered',
                'proof_of_delivery' => UploadedFile::fake()->image('pod.jpg'),
            ])
            ->assertRedirect();

        $newOrder->refresh();
        $this->assertNotNull($newOrder->warranty_expires_at);
        $this->assertGreaterThan(now()->addDays(6), $newOrder->warranty_expires_at);

        // Even if admin shrinks window back to 24h before buyer confirms receipt, delivery-time 168h window is preserved
        $v1 = PlatformPolicy::ofType(PlatformPolicy::TYPE_RETURN_REFUND)->where('version', '1.0')->firstOrFail();
        $policyService->activatePolicyVersion($v1, $admin);

        $this->actingAs($buyer)
            ->post(route('my-orders.receive', $newOrder->id))
            ->assertRedirect();

        $newOrder->refresh();
        $this->assertSame('Completed', $newOrder->status);
        $this->assertGreaterThan(now()->addDays(6), $newOrder->warranty_expires_at);
    }

    public function test_dispute_gating_evaluates_reason_checklist_and_mandatory_photo_angles_and_logs_consent(): void
    {
        Storage::fake('public');
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-GATE-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22),
        ]);

        // 1. Invalid reason code blocked
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'damage_reason_code' => 'changed_my_mind',
                'reason' => 'I changed my mind.',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');
        $this->assertSame(0, Dispute::count());

        // 2. Incomplete checklist blocked
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'reason' => 'Cracked on arrival.',
                'checklist_confirmations' => ['within_window'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');
        $this->assertSame(0, Dispute::count());

        // 3. Missing mandatory photo angle slot blocked
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'reason' => 'Cracked on arrival.',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'extra_1'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');
        $this->assertSame(0, Dispute::count());

        // 3b. Non-Inertia HTTP request omitting structured criteria/checklist cannot bypass gating
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'reason' => 'Bypass attempt without checklist or reason code.',
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHasErrors('message');
        $this->assertSame(0, Dispute::count());

        // 4. Valid structured submission + optional extra angle passes and records consent
        $this->actingAs($buyer)
            ->post(route('my-orders.dispute', $order->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'reason' => 'Cracked rim and crushed outer box.',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging', 'extra_1'],
                'proof_photos' => [
                    UploadedFile::fake()->image('defect.jpg'),
                    UploadedFile::fake()->image('box.jpg'),
                    UploadedFile::fake()->image('extra.jpg'),
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $dispute = Dispute::where('order_id', $order->id)->first();
        $this->assertNotNull($dispute);
        $this->assertSame('1.0', $dispute->policy_version);
        $this->assertSame('damaged_in_transit', $dispute->damage_reason_code);
        $this->assertCount(3, $dispute->proof_photos);
        $this->assertCount(3, $dispute->photo_angles);
        $this->assertSame('item_defect', $dispute->photo_angles[0]['angle_key']);
        $this->assertSame('shipping_packaging', $dispute->photo_angles[1]['angle_key']);

        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'policy_type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'policy_version' => '1.0',
            'context' => 'dispute_initiation',
            'order_id' => $order->id,
        ]);
    }

    public function test_registration_and_seller_terms_write_versioned_user_policy_consents(): void
    {
        // 1. Buyer registration
        $this->post(route('register'), [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'email' => 'ana.buyer@example.com',
            'password' => 'BuyerPass123!',
            'password_confirmation' => 'BuyerPass123!',
            'terms' => true,
        ])->assertRedirect();

        $buyer = User::where('email', 'ana.buyer@example.com')->firstOrFail();
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'policy_type' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
            'policy_version' => '1.0',
            'context' => 'registration',
        ]);
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'policy_type' => PlatformPolicy::TYPE_PRIVACY_POLICY,
            'policy_version' => '1.0',
            'context' => 'registration',
        ]);

        // Log out buyer before testing guest artisan registration
        $this->post(route('logout'));

        // 2. Artisan registration keeps SellerComplianceAgreement AND records UserPolicyConsent
        $this->post(route('register'), [
            'first_name' => 'Marco',
            'last_name' => 'Santos',
            'shop_name' => 'Marco Clay Studio',
            'email' => 'marco.artisan@example.com',
            'password' => 'ArtisanPass123!@#',
            'password_confirmation' => 'ArtisanPass123!@#',
            'terms' => true,
        ])->assertRedirect();

        $artisan = User::where('email', 'marco.artisan@example.com')->firstOrFail();
        $this->assertTrue($artisan->hasAcceptedComplianceTerms('seller_terms'));
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $artisan->id,
            'policy_type' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
            'policy_version' => '1.0',
            'context' => 'registration',
        ]);
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $artisan->id,
            'policy_type' => PlatformPolicy::TYPE_SELLER_PRIVACY,
            'policy_version' => '1.0',
            'context' => 'registration',
        ]);

        // 3. Seller accept-terms endpoint records UserPolicyConsent
        $artisan->forceFill(['email_verified_at' => now(), 'current_session_id' => null])->save();
        $consentCountBefore = UserPolicyConsent::where('user_id', $artisan->id)->count();
        $this->actingAs($artisan)
            ->post(route('artisan.accept-terms'))
            ->assertRedirect();
        $this->assertGreaterThan($consentCountBefore, UserPolicyConsent::where('user_id', $artisan->id)->count());
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $artisan->id,
            'policy_type' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
            'policy_version' => '1.0',
            'context' => 'seller_terms',
        ]);

        // 4. Social auth registration records UserPolicyConsent + SellerComplianceAgreement
        $this->post(route('logout'));
        $this->withSession([
            'social_auth' => [
                'provider' => 'google',
                'id' => 'google-policy-999',
                'email' => 'social.artisan.policy@example.com',
                'name' => 'Social Artisan',
                'avatar' => 'avatar.jpg',
                'role' => 'artisan',
                'remember' => false,
            ],
        ])->post(route('auth.complete-profile.store'), [
            'first_name' => 'Social',
            'last_name' => 'Artisan',
            'shop_name' => 'Social Policy Pottery',
            'password' => 'SocialPass123!@#',
            'password_confirmation' => 'SocialPass123!@#',
            'terms' => true,
        ])->assertRedirect();

        $socialArtisan = User::where('email', 'social.artisan.policy@example.com')->firstOrFail();
        $this->assertTrue($socialArtisan->hasAcceptedComplianceTerms('seller_terms'));
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $socialArtisan->id,
            'policy_type' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
            'policy_version' => '1.0',
            'context' => 'social_registration',
        ]);
    }

    public function test_admin_policies_partial_reload_and_human_readable_criteria_errors(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $inertiaVersion = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());

        // 1. Inertia partial reload requesting only selectedType skips policiesByType query evaluation
        \Illuminate\Support\Facades\DB::flushQueryLog();
        \Illuminate\Support\Facades\DB::enableQueryLog();
        $partialResponse = $this->actingAs($admin)
            ->get(route('admin.policies.index', ['type' => PlatformPolicy::TYPE_PRIVACY_POLICY]), array_filter([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => $inertiaVersion,
                'X-Inertia-Partial-Component' => 'Admin/Settings/Policies',
                'X-Inertia-Partial-Data' => 'selectedType',
            ], fn ($v) => $v !== null));

        $partialResponse->assertOk()
            ->assertJsonPath('component', 'Admin/Settings/Policies')
            ->assertJsonPath('props.selectedType', PlatformPolicy::TYPE_PRIVACY_POLICY)
            ->assertJsonMissingPath('props.policiesByType');
        $queries = \Illuminate\Support\Facades\DB::getQueryLog();
        \Illuminate\Support\Facades\DB::disableQueryLog();
        $policyTableQueries = collect($queries)->filter(
            fn ($q) => str_contains(strtolower((string) ($q['query'] ?? '')), 'platform_policies')
        );
        $this->assertCount(0, $policyTableQueries);

        // 2. Empty custom criteria rows return human-readable validation messages (no raw dot-notation keys)
        $response = $this->actingAs($admin)->post(route('admin.policies.store'), [
            'type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'title' => 'Return Policy',
            'version' => '3.0',
            'content_markdown' => "## Inspection Window\nCustom criteria validation test.",
            'structured_criteria' => [
                'return_window_hours' => 48,
                'max_photos' => 5,
                'eligible_reasons' => [
                    ['code' => 'custom_reason_1', 'label' => '', 'requires_description' => true, 'enabled' => true],
                ],
                'mandatory_photo_angles' => [
                    ['key' => 'photo_angle_1', 'label' => '', 'required' => true],
                ],
                'checklist_items' => [
                    ['key' => 'criterion_1', 'label' => '', 'required' => true],
                ],
            ],
        ]);

        $response->assertSessionHasErrors([
            'structured_criteria.eligible_reasons.0.label' => 'Every eligible claim reason must have a label.',
            'structured_criteria.mandatory_photo_angles.0.label' => 'Every mandatory photo angle must have a label.',
            'structured_criteria.checklist_items.0.label' => 'Every eligibility checklist item must have a statement.',
        ]);
    }

    public function test_legacy_return_endpoint_evaluates_structured_criteria_and_logs_consent(): void
    {
        Storage::fake('public');
        Mail::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-LEG-RET-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'total_amount' => 500,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22),
        ]);

        // Structured fields provided to my-orders.return with invalid reason code must be blocked without storing orphaned files
        $this->actingAs($buyer)
            ->post(route('my-orders.return', $order->id), [
                'damage_reason_code' => 'changed_my_mind',
                'return_reason' => 'Changed my mind',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('a.jpg'),
                    UploadedFile::fake()->image('b.jpg'),
                ],
            ])
            ->assertSessionHas('error');

        $this->assertSame('Completed', $order->fresh()->status);
        $this->assertSame([], Storage::disk('public')->allFiles('returns'));

        // Valid structured submission via my-orders.return succeeds and logs user_policy_consents
        $this->actingAs($buyer)
            ->post(route('my-orders.return', $order->id), [
                'damage_reason_code' => 'damaged_in_transit',
                'return_reason' => 'Chipped rim on arrival.',
                'checklist_confirmations' => ['within_window', 'unmodified_item', 'accurate_evidence'],
                'photo_angle_keys' => ['item_defect', 'shipping_packaging'],
                'proof_photos' => [
                    UploadedFile::fake()->image('defect.jpg'),
                    UploadedFile::fake()->image('box.jpg'),
                ],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('Refund/Return', $order->fresh()->status);
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id' => $buyer->id,
            'policy_type' => PlatformPolicy::TYPE_RETURN_REFUND,
            'policy_version' => '1.0',
            'context' => 'return_request',
            'order_id' => $order->id,
        ]);
    }

    public function test_my_orders_exposes_return_window_hours_and_admin_disputes_resolves_storage_urls(): void
    {
        Storage::fake('public');

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Stoneware Pitcher',
            'sku' => 'SP-101',
            'category' => 'Pitchers',
            'status' => 'Active',
            'price' => 450,
            'cost_price' => 150,
            'stock' => 8,
            'cover_photo_path' => 'products/pitcher.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-URL-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Delivered',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'delivered_at' => now()->subHours(1),
            'warranty_expires_at' => now()->addHours(71),
            'proof_of_delivery' => 'deliveries/pod.jpg',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 450,
            'quantity' => 1,
            'product_img' => 'products/pitcher.jpg',
        ]);

        $this->actingAs($buyer)
            ->get(route('my-orders.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Buyer/MyOrders')
                ->where('orders.0.return_window_hours', 72)
                ->has('returnPolicy.structured_criteria.return_window_hours')
            );

        Dispute::create([
            'order_id' => $order->id,
            'status' => 'escalated',
            'reason' => 'Handle detached',
            'proof_photos' => ['disputes/handle.jpg'],
            'criteria_checklist' => [
                ['key' => 'within_window', 'label' => 'Within window', 'required' => true, 'confirmed' => true],
                ['key' => 'optional_check', 'label' => 'Optional check', 'required' => false, 'confirmed' => false],
            ],
        ]);

        $expectedProofUrl = \App\Services\StorageUrl::url('disputes/handle.jpg');
        $expectedPodUrl = \App\Services\StorageUrl::url('deliveries/pod.jpg');
        $expectedProductImgUrl = \App\Services\StorageUrl::url('products/pitcher.jpg');

        $this->actingAs($admin)
            ->get(route('admin.disputes.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Disputes/DisputeEscalationDashboard')
                ->where('disputes.0.proof_photos.0', $expectedProofUrl)
                ->where('disputes.0.order.proof_of_delivery', $expectedPodUrl)
                ->where('disputes.0.order.items.0.product_img', $expectedProductImgUrl)
            );
    }

    public function test_policy_service_cache_failures_inside_outer_transaction_are_savepoint_safe_and_legacy_return_marks_unconfirmed(): void
    {
        Storage::fake('public');
        Mail::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-SAVEPOINT-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 400,
            'total_amount' => 400,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22),
        ]);

        // 1. Failing Cache::get inside an active DB::transaction must not poison the outer transaction
        $originalCache = \Illuminate\Support\Facades\Cache::getFacadeRoot();
        try {
            \Illuminate\Support\Facades\Cache::shouldReceive('get')->andThrow(new \RuntimeException('Simulated cache read failure'));
            \Illuminate\Support\Facades\Cache::shouldReceive('put')->andThrow(new \RuntimeException('Simulated cache write failure'));
            \Illuminate\Support\Facades\Cache::shouldReceive('forget')->andReturnUsing(fn (...$args) => $originalCache->forget(...$args));

            $resolvedHours = \Illuminate\Support\Facades\DB::transaction(function () use ($order) {
                $hours = app(PolicyService::class)->resolveDeliveryWindowHoursForOrder($order);
                $order->update(['shipping_notes' => 'Savepoint safe']);
                return $hours;
            });

            $this->assertSame(24, $resolvedHours);
            $this->assertSame('Savepoint safe', $order->fresh()->shipping_notes);
        } finally {
            \Illuminate\Support\Facades\Cache::swap($originalCache);
        }

        // 2. Legacy return submission without structured fields records has_explicit_consent=false and confirmed=false
        $this->actingAs($buyer)
            ->post(route('my-orders.return', $order->id), [
                'return_reason' => 'Legacy return submission without checklist.',
                'return_proof_image' => UploadedFile::fake()->image('legacy.jpg'),
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $consent = UserPolicyConsent::where('order_id', $order->id)
            ->where('context', 'return_request')
            ->latest('id')
            ->firstOrFail();

        $this->assertFalse((bool) ($consent->criteria_acknowledged['has_explicit_consent'] ?? true));
        foreach ($consent->criteria_acknowledged['criteria_checklist'] ?? [] as $item) {
            $this->assertFalse((bool) ($item['confirmed'] ?? true));
        }
    }

    public function test_dispute_upload_failure_returning_false_aborts_cleanly_without_creating_corrupt_dispute(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-FAIL-UPLOAD-001',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350,
            'total_amount' => 350,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subHours(2),
            'warranty_expires_at' => now()->addHours(22),
        ]);

        $failingFile = new class(UploadedFile::fake()->image('fail.jpg')->getPathname(), 'fail.jpg', 'image/jpeg', null, true) extends UploadedFile {
            public function store($path = '', $options = [])
            {
                return false;
            }
        };

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Failed to upload dispute proof photo');

        try {
            app(\App\Actions\Disputes\BuyerInitiateDispute::class)->execute(
                (string) $order->id,
                'Cracked bowl',
                [$failingFile],
                $buyer->id,
                [],
                false
            );
        } finally {
            $this->assertSame(0, Dispute::where('order_id', $order->id)->count());
            $this->assertSame('Completed', $order->fresh()->status);
        }
    }
}
