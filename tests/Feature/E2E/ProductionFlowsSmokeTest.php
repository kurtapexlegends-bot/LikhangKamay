<?php

namespace Tests\Feature\E2E;

use App\Models\Product;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductionFlowsSmokeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Flow 1: Buyer Flow
     * Search product -> Add to cart -> Arrive at checkout page.
     */
    public function test_buyer_production_flow_search_add_to_cart_and_arrive_at_checkout(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'city' => 'Cavite',
        ]);

        $artisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'Cavite Weaving Guild',
            'city' => 'Cavite',
        ]);

        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Handcrafted Abaca Handbag',
            'sku' => 'SKU-SMOKE-001',
            'category' => 'Bags & Accessories',
            'status' => 'Active',
            'price' => 450,
            'stock' => 15,
        ]);

        // Step 1: Search product via catalog
        $catalogResponse = $this->actingAs($buyer)->get(route('shop.index', ['search' => 'Abaca']));
        $catalogResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/Catalog')
                ->has('products.data')
            );

        // Step 2: Add to cart
        $cartResponse = $this->actingAs($buyer)->postJson(route('cart.store'), [
            'product_id' => $product->id,
            'qty' => 1,
        ]);
        $cartResponse->assertOk()->assertJson(['success' => true]);

        // Step 3: Arrive at checkout page
        $checkoutResponse = $this->actingAs($buyer)->get(route('checkout.create'));
        $checkoutResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Shop/Checkout')
                ->has('items')
                ->has('pricing')
            );
    }

    /**
     * Flow 2: Artisan Profile Flow
     * Sign in -> Update address form (StructuredAddressFields) -> Save profile.
     */
    public function test_artisan_production_flow_sign_in_update_address_with_structured_fields_and_save_profile(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'email' => 'artisan.flow@likhangkamay.local',
            'shop_name' => 'Tagaytay Woodworks',
            'street_address' => 'Initial Street 10',
            'city' => 'Tagaytay City',
            'barangay' => 'Kaybagal South',
            'region' => 'Cavite',
            'zip_code' => '4120',
        ]);

        // Step 1: Sign in and visit artisan profile
        $profileResponse = $this->actingAs($artisan)->get(route('profile.edit'));
        $profileResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Profile/Edit')
                ->where('profileMode', 'owner')
                ->has('auth.user')
                ->has('addresses')
            );

        // Step 2 & 3: Submit updated address using StructuredAddressFields fields & save profile
        $updateResponse = $this->actingAs($artisan)->post(route('profile.update'), [
            'name' => $artisan->name,
            'first_name' => $artisan->first_name ?: 'Master',
            'last_name' => $artisan->last_name ?: 'Artisan',
            'email' => $artisan->email,
            'shop_name' => 'Tagaytay Modern Woodcraft',
            'phone_number' => '09987654321',
            'street_address' => '888 Heritage Ridge Road',
            'city' => 'Tagaytay City',
            'barangay' => 'Mendez Crossing West',
            'region' => 'Cavite',
            'zip_code' => '4120',
        ]);

        $updateResponse->assertSessionHasNoErrors();
        $updateResponse->assertRedirect(route('profile.edit'));

        $this->assertDatabaseHas('users', [
            'id' => $artisan->id,
            'shop_name' => 'Tagaytay Modern Woodcraft',
            'street_address' => '888 Heritage Ridge Road',
            'city' => 'Tagaytay City',
            'barangay' => 'Mendez Crossing West',
            'region' => 'Cavite',
            'zip_code' => '4120',
        ]);
    }

    /**
     * Flow 3: Subscription Flow
     * View /subscription -> Click upgrade -> Redirect to checkout session.
     */
    public function test_subscription_production_flow_view_subscription_click_upgrade_and_redirect_to_checkout(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
            'subscription_expires_at' => null,
        ]);

        // Step 1: View /subscription
        $subResponse = $this->actingAs($artisan)->get(route('seller.subscription'));
        $subResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Settings/Subscription')
                ->where('currentPlan', 'free')
                ->has('planSettings')
            );

        // Step 2 & 3: Click upgrade and redirect to PayMongo checkout session
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_smoke_test_999',
                    'attributes' => [
                        'checkout_url' => 'https://checkout.paymongo.com/test/smoke-session-999',
                    ],
                ],
            ], 200),
        ]);

        $upgradeResponse = $this->actingAs($artisan)->post(route('seller.subscription.upgrade'), [
            'plan' => 'premium',
        ]);

        $upgradeResponse->assertRedirect('https://checkout.paymongo.com/test/smoke-session-999');

        $this->assertDatabaseHas('subscription_transactions', [
            'user_id' => $artisan->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => 'cs_smoke_test_999',
        ]);
    }
}
