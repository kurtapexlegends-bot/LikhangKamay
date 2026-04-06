<?php

namespace Tests\Feature\Seller;

use App\Models\Product;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionTierEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_seller_cannot_export_analytics_report(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $this->actingAs($seller)
            ->get(route('analytics.export'))
            ->assertForbidden();
    }

    public function test_premium_seller_can_export_analytics_report(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $response = $this->actingAs($seller)->get(route('analytics.export'));

        $response->assertOk();
        $this->assertStringStartsWith('text/csv', (string) $response->headers->get('content-type'));
    }

    public function test_only_elite_sellers_can_access_sponsorship_module(): void
    {
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);
        $eliteSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($premiumSeller)
            ->get(route('seller.sponsorships'))
            ->assertForbidden();

        $this->actingAs($eliteSeller)
            ->get(route('seller.sponsorships'))
            ->assertOk();
    }
    public function test_downgrade_logs_the_original_previous_tier(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'premium',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_tier_logs', [
            'user_id' => $seller->id,
            'previous_tier' => 'super_premium',
            'new_tier' => 'premium',
        ]);
    }

    public function test_subscription_page_includes_linked_staff_count_for_elite_downgrade_warning(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        User::factory()->staff($seller)->count(2)->create();

        $response = $this->actingAs($seller)->get(route('seller.subscription'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Subscription')
            ->where('currentPlan', 'super_premium')
            ->where('linkedStaffCount', 2)
        );
    }

    public function test_downgrade_keeps_top_selling_active_products_when_new_limit_is_exceeded(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $products = collect(range(1, 11))->map(function (int $index) use ($seller) {
            return $this->createActiveProduct($seller, [
                'name' => 'Product ' . $index,
                'sku' => 'SKU-TOP-' . $index,
                'sold' => 12 - $index,
                'created_at' => now()->subDays(20 - $index),
                'updated_at' => now()->subDays(20 - $index),
            ]);
        });

        $response = $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'premium',
            ]);

        $response->assertRedirect();
        $this->assertSame('premium', $seller->fresh()->premium_tier);

        $draftedProduct = $products->last();

        foreach ($products->take(10) as $product) {
            $this->assertDatabaseHas('products', [
                'id' => $product->id,
                'status' => 'Active',
            ]);
        }

        $this->assertDatabaseHas('products', [
            'id' => $draftedProduct->id,
            'status' => 'Draft',
        ]);
    }

    public function test_downgrade_uses_oldest_active_products_when_sales_are_tied(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $products = collect(range(1, 4))->map(function (int $index) use ($seller) {
            return $this->createActiveProduct($seller, [
                'name' => 'Tie Product ' . $index,
                'sku' => 'SKU-TIE-' . $index,
                'sold' => 0,
                'created_at' => now()->subDays(10 - $index),
                'updated_at' => now()->subDays(10 - $index),
            ]);
        });

        $response = $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'free',
            ]);

        $response->assertRedirect();
        $this->assertSame('free', $seller->fresh()->premium_tier);

        foreach ($products->take(3) as $product) {
            $this->assertDatabaseHas('products', [
                'id' => $product->id,
                'status' => 'Active',
            ]);
        }

        $this->assertDatabaseHas('products', [
            'id' => $products->last()->id,
            'status' => 'Draft',
        ]);
    }

    public function test_upgrade_creates_a_pending_paymongo_checkout_session(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_sub_pending',
                    'attributes' => [
                        'checkout_url' => 'https://checkout.paymongo.com/test/subscription-pending',
                    ],
                ],
            ], 200),
        ]);

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $response = $this->actingAs($seller)->post(route('seller.subscription.upgrade'), [
            'plan' => 'premium',
        ]);

        $response->assertRedirect('https://checkout.paymongo.com/test/subscription-pending');

        $this->assertDatabaseHas('subscription_transactions', [
            'user_id' => $seller->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => 'cs_sub_pending',
        ]);
    }

    public function test_successful_subscription_payment_upgrades_the_seller_tier(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions/*' => Http::response([
                'data' => [
                    'id' => 'cs_sub_paid',
                    'attributes' => [
                        'reference_number' => 'SUB-PAID12345',
                        'payment_status' => 'paid',
                        'status' => 'completed',
                    ],
                    'included' => [
                        [
                            'type' => 'payment',
                            'attributes' => [
                                'status' => 'paid',
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $seller->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'reference_number' => 'SUB-PAID12345',
            'paymongo_session_id' => 'cs_sub_paid',
        ]);

        $response = $this->actingAs($seller)->get(URL::signedRoute('seller.subscription.payment.success', [
            'subscription' => $transaction->reference_number,
        ]));

        $response->assertRedirect(route('seller.subscription'));
        $response->assertSessionHas('success', 'Subscription upgraded successfully after payment verification.');

        $this->assertSame('premium', $seller->fresh()->premium_tier);
        $this->assertDatabaseHas('subscription_transactions', [
            'id' => $transaction->id,
            'status' => SubscriptionTransaction::STATUS_PAID,
        ]);
        $this->assertDatabaseHas('user_tier_logs', [
            'user_id' => $seller->id,
            'previous_tier' => 'free',
            'new_tier' => 'premium',
        ]);
    }

    public function test_elite_to_standard_downgrade_suspends_linked_staff_and_elite_only_features(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        $response = $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'free',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Plan downgraded successfully. Excess products set to Draft. Elite-only features were suspended, and linked employee workspace accounts were suspended until you upgrade again.');
        $this->assertSame('free', $seller->fresh()->premium_tier);
        $this->assertNotNull($staff->fresh()->staff_plan_suspended_at);

        $this->actingAs($seller)
            ->get(route('seller.sponsorships'))
            ->assertForbidden();

        $this->actingAs($staff->fresh())
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.home', absolute: false));

        $this->actingAs($staff->fresh())
            ->get(route('team-messages.index'))
            ->assertForbidden();
    }

    public function test_reupgrade_clears_only_plan_suspension_and_preserves_manual_staff_suspension(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_sub_resume',
                    'attributes' => [
                        'checkout_url' => 'https://checkout.paymongo.com/test/subscription-resume',
                    ],
                ],
            ], 200),
            'https://api.paymongo.com/v1/checkout_sessions/*' => Http::response([
                'data' => [
                    'id' => 'cs_sub_resume',
                    'attributes' => [
                        'reference_number' => 'SUB-RESUME123',
                        'payment_status' => 'paid',
                        'status' => 'completed',
                    ],
                    'included' => [
                        [
                            'type' => 'payment',
                            'attributes' => [
                                'status' => 'paid',
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], false),
        ]);

        $this->actingAs($seller)->post(route('seller.subscription.downgrade'), [
            'plan' => 'free',
        ])->assertRedirect();

        $this->assertNotNull($staff->fresh()->staff_plan_suspended_at);

        $upgradeResponse = $this->actingAs($seller)->post(route('seller.subscription.upgrade'), [
            'plan' => 'premium',
        ]);

        $upgradeResponse->assertRedirect('https://checkout.paymongo.com/test/subscription-resume');

        $transaction = SubscriptionTransaction::query()
            ->where('user_id', $seller->id)
            ->latest('id')
            ->firstOrFail();

        $transaction->update([
            'reference_number' => 'SUB-RESUME123',
        ]);

        $this->actingAs($seller)->get(URL::signedRoute('seller.subscription.payment.success', [
            'subscription' => 'SUB-RESUME123',
        ]))->assertRedirect(route('seller.subscription'));

        $staff->refresh();

        $this->assertNull($staff->staff_plan_suspended_at);
        $this->assertFalse($staff->isWorkspaceAccessEnabled());
        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.home', absolute: false));
    }

    private function createActiveProduct(User $seller, array $overrides = []): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-' . fake()->unique()->bothify('????-####'),
            'name' => 'Sample Product',
            'description' => 'Test product',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 199.00,
            'stock' => 10,
            'lead_time' => 3,
            'sold' => 0,
            ...$overrides,
        ]);
    }
}
