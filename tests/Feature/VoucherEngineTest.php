<?php

namespace Tests\Feature;

use App\Actions\Consumer\CancelOrder;
use App\Models\Employee;
use App\Models\FollowedShop;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OwnerApproval;
use App\Models\Product;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherRedemption;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Services\PayMongoService;
use App\Services\Search\SellerSearchService;
use App\Services\SettlementReportService;
use App\Services\VoucherService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class VoucherEngineTest extends TestCase
{
    use RefreshDatabase;

    protected function createArtisan(string $tier = 'free', bool $isVatRegistered = true): User
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => $tier,
            'is_vat_registered' => $isVatRegistered,
            'setup_completed_at' => now(),
            'shop_name' => 'Cavite Clay Studio',
            'city' => 'Silang',
            'region' => 'Cavite',
        ]);

        $seller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        return $seller;
    }

    protected function createBuyer(): User
    {
        return User::factory()->create([
            'role' => 'buyer',
            'requires_checkout_face_check' => false,
            'city' => 'Dasmariñas',
            'region' => 'Cavite',
        ]);
    }

    public function test_standard_artisan_is_capped_at_three_active_vouchers_while_elite_is_unlimited(): void
    {
        $standardSeller = $this->createArtisan('free');
        $eliteSeller = $this->createArtisan('super_premium');

        for ($i = 1; $i <= 3; $i++) {
            $this->actingAs($standardSeller)
                ->post(route('vouchers.store'), [
                    'code' => "STD-PROMO-{$i}",
                    'name' => "Standard Promo {$i}",
                    'discount_type' => 'fixed_amount',
                    'discount_value' => 50,
                    'min_spend' => 200,
                    'usage_limit_per_user' => 1,
                    'is_public' => true,
                    'is_active' => true,
                ])
                ->assertSessionHasNoErrors();
        }

        $this->assertEquals(3, $standardSeller->getActiveVoucherCount());
        $this->assertFalse($standardSeller->canCreateMoreVouchers());

        // 4th active voucher must be blocked for Standard tier
        $this->actingAs($standardSeller)
            ->post(route('vouchers.store'), [
                'code' => 'STD-PROMO-4',
                'name' => 'Standard Promo 4',
                'discount_type' => 'fixed_amount',
                'discount_value' => 50,
                'min_spend' => 200,
                'usage_limit_per_user' => 1,
            ])
            ->assertSessionHasErrors('limit');

        // Elite artisan can create more than 3 active vouchers
        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($eliteSeller)
                ->post(route('vouchers.store'), [
                    'code' => "ELITE-PROMO-{$i}",
                    'name' => "Elite Promo {$i}",
                    'discount_type' => 'percentage',
                    'discount_value' => 10,
                    'min_spend' => 300,
                    'max_discount' => 150,
                    'usage_limit_per_user' => 1,
                ])
                ->assertSessionHasNoErrors();
        }

        $this->assertEquals(4, $eliteSeller->getActiveVoucherCount());
        $this->assertTrue($eliteSeller->canCreateMoreVouchers());
    }

    public function test_checkout_applies_shop_voucher_with_balanced_bir_vat_and_reverts_on_cancellation(): void
    {
        $seller = $this->createArtisan('super_premium', true);
        $buyer = $this->createBuyer();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Handcrafted Stoneware Pitcher',
            'sku' => 'PITCHER-01',
            'category' => 'Pottery',
            'price' => 1000.00,
            'cost_price' => 400.00,
            'stock' => 10,
            'status' => 'Active',
        ]);

        // Shop Voucher: 10% off up to PHP 80 (on 1000 subtotal -> PHP 80 discount)
        $shopVoucher = Voucher::create([
            'code' => 'CLAY10',
            'name' => '10% Off Shop Voucher',
            'shop_id' => $seller->id,
            'discount_type' => 'percentage',
            'discount_value' => 10.00,
            'min_spend' => 500.00,
            'max_discount' => 80.00,
            'usage_limit_total' => 10,
            'usage_limit_per_user' => 1,
            'is_public' => true,
            'is_active' => true,
        ]);

        // Validate promo code via endpoint
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'clay10',
                'subtotals' => [(string) $seller->id => 1000.00],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('voucher.discount_amount', 80);

        // Place order with Pick Up (0 shipping fee, 0 convenience fee) + shop voucher
        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
            'shop_vouchers' => [
                (string) $seller->id => 'CLAY10',
            ],
            'total' => 920.00,
        ]);

        $response->assertRedirect(route('my-orders.index'));

        /** @var Order $order */
        $order = Order::where('user_id', $buyer->id)->latest('id')->firstOrFail();

        // Subtotal = 1000.00
        // Shop discount = 80.00 -> Seller Net = 920.00 & Buyer Total = 920.00
        $this->assertEquals(1000.00, (float) $order->merchandise_subtotal);
        $this->assertEquals(80.00, (float) $order->voucher_discount_amount);
        $this->assertEquals('CLAY10', $order->voucher_code);
        $this->assertEquals(920.00, (float) $order->seller_net_amount);
        $this->assertEquals(920.00, (float) $order->total_amount);

        // BIR 12% VAT inclusive on net discounted merchandise amount (920.00):
        // vatable_sales = round(920 / 1.12, 2) = 821.43, vat_amount = 98.57, sum = 920.00
        $this->assertEquals(821.43, (float) $order->vatable_sales);
        $this->assertEquals(98.57, (float) $order->vat_amount);
        $this->assertEquals(920.00, round((float) $order->vatable_sales + (float) $order->vat_amount, 2));

        // Verify redemptions & used_count
        $this->assertEquals(1, $shopVoucher->fresh()->used_count);
        $this->assertEquals(1, VoucherRedemption::where('order_id', $order->id)->where('status', 'redeemed')->count());

        // Attempting to reuse the single-use voucher before cancellation must fail
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'CLAY10',
                'subtotals' => [(string) $seller->id => 1000.00],
            ])
            ->assertStatus(422);

        // Cancel the order -> must auto-revert voucher redemptions and restore quota
        app(CancelOrder::class)->execute((string) $order->id, $buyer, 'ordered_by_mistake');

        $this->assertEquals('Cancelled', $order->fresh()->status);
        $this->assertEquals(0, $shopVoucher->fresh()->used_count);
        $this->assertEquals(1, VoucherRedemption::where('order_id', $order->id)->where('status', 'cancelled')->count());

        // Buyer can now validate and use CLAY10 again!
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'CLAY10',
                'subtotals' => [(string) $seller->id => 1000.00],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true);
    }

    public function test_voucher_flexibility_supports_specific_products_categories_quantity_thresholds_and_audiences(): void
    {
        $seller = $this->createArtisan('super_premium');
        $buyer = $this->createBuyer();

        $mug = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Glazed Mug',
            'sku' => 'MUG-001',
            'category' => 'Pottery',
            'price' => 300.00,
            'status' => 'Active',
        ]);

        $scarf = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Handwoven Inabel Scarf',
            'sku' => 'SCARF-001',
            'category' => 'Weaving',
            'price' => 700.00,
            'status' => 'Active',
        ]);

        // 1. Specific Products Voucher: 20% off only for $mug
        $productVoucher = Voucher::create([
            'code' => 'MUGONLY20',
            'name' => '20% Off Ceramic Mug Only',
            'shop_id' => $seller->id,
            'discount_type' => 'percentage',
            'discount_value' => 20.00,
            'scope_type' => Voucher::SCOPE_SPECIFIC_PRODUCTS,
            'applicable_products' => [$mug->id],
            'min_requirement_type' => Voucher::REQ_SPEND,
            'min_spend' => 200.00,
            'is_public' => true,
            'is_active' => true,
        ]);

        // Validating with only scarf in cart should fail
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'MUGONLY20',
                'subtotals' => [(string) $seller->id => 700.00],
                'items' => [
                    ['id' => $scarf->id, 'qty' => 1, 'price' => 700.00, 'category' => 'Weaving', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertStatus(422);

        // Validating with mug + scarf: 20% discount should only calculate on the 300 mug = 60.00 discount!
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'MUGONLY20',
                'subtotals' => [(string) $seller->id => 1000.00],
                'items' => [
                    ['id' => $mug->id, 'qty' => 1, 'price' => 300.00, 'category' => 'Pottery', 'artisan_id' => $seller->id],
                    ['id' => $scarf->id, 'qty' => 1, 'price' => 700.00, 'category' => 'Weaving', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('voucher.discount_amount', 60);

        // 2. Minimum Quantity Voucher: requires min 2 items
        $qtyVoucher = Voucher::create([
            'code' => 'BUY2SAVE100',
            'name' => 'Buy 2 Items Save PHP 100',
            'shop_id' => $seller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 100.00,
            'scope_type' => Voucher::SCOPE_ALL,
            'min_requirement_type' => Voucher::REQ_QUANTITY,
            'min_quantity' => 2,
            'is_public' => true,
            'is_active' => true,
        ]);

        // 1 item should fail
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'BUY2SAVE100',
                'subtotals' => [(string) $seller->id => 300.00],
                'items' => [
                    ['id' => $mug->id, 'qty' => 1, 'price' => 300.00, 'category' => 'Pottery', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertStatus(422);

        // 2 items should pass
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'BUY2SAVE100',
                'subtotals' => [(string) $seller->id => 600.00],
                'items' => [
                    ['id' => $mug->id, 'qty' => 2, 'price' => 300.00, 'category' => 'Pottery', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('voucher.discount_amount', 100);

        // 3. New Customer Only Voucher
        $newCustomerVoucher = Voucher::create([
            'code' => 'WELCOMEFIRST',
            'name' => 'First Purchase Special',
            'shop_id' => $seller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 50.00,
            'scope_type' => Voucher::SCOPE_ALL,
            'target_audience' => Voucher::AUDIENCE_NEW_CUSTOMERS,
            'is_public' => true,
            'is_active' => true,
        ]);

        // Buyer has 0 orders with seller -> passes!
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'WELCOMEFIRST',
                'subtotals' => [(string) $seller->id => 300.00],
                'items' => [
                    ['id' => $mug->id, 'qty' => 1, 'price' => 300.00, 'category' => 'Pottery', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true);

        // Place an order for this buyer with this seller
        Order::create([
            'order_number' => 'ORD-PRIOR-01',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300.00,
            'total_amount' => 300.00,
            'status' => 'Completed',
            'payment_status' => 'paid',
            'shipping_address' => 'Silang, Cavite',
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
        ]);

        // Now buyer has prior completed order -> first-time voucher must be rejected!
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'WELCOMEFIRST',
                'subtotals' => [(string) $seller->id => 300.00],
                'items' => [
                    ['id' => $mug->id, 'qty' => 1, 'price' => 300.00, 'category' => 'Pottery', 'artisan_id' => $seller->id],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_voucher_rejects_negatives_invalid_bounds_cross_field_loopholes_and_self_redemption(): void
    {
        $seller = $this->createArtisan('super_premium');
        $otherSeller = $this->createArtisan('super_premium');
        $buyer = $this->createBuyer();

        $sellerProduct = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Seller Bowl',
            'sku' => 'BOWL-01',
            'category' => 'Pottery',
            'price' => 300.00,
            'status' => 'Active',
        ]);

        $foreignProduct = Product::factory()->create([
            'user_id' => $otherSeller->id,
            'name' => 'Foreign Jar',
            'sku' => 'JAR-99',
            'category' => 'Pottery',
            'price' => 500.00,
            'status' => 'Active',
        ]);

        // 1. Negative max_discount, negative min_spend, negative/excess percentage rate
        $this->actingAs($seller)
            ->post(route('vouchers.store'), [
                'code' => 'BADNEG01',
                'name' => 'Bad Negative Inputs',
                'discount_type' => 'percentage',
                'discount_value' => 95,
                'min_spend' => -50,
                'max_discount' => -10,
                'usage_limit_per_user' => 1,
            ])
            ->assertSessionHasErrors(['discount_value', 'min_spend', 'max_discount']);

        // 2. Per-user limit exceeding total pool, fixed discount > min spend, and expired before start
        $this->actingAs($seller)
            ->post(route('vouchers.store'), [
                'code' => 'BADPOOL01',
                'name' => 'Bad Cross Fields',
                'discount_type' => 'fixed_amount',
                'discount_value' => 500,
                'min_requirement_type' => 'spend',
                'min_spend' => 200,
                'usage_limit_total' => 5,
                'usage_limit_per_user' => 10,
                'starts_at' => '2026-12-10 10:00:00',
                'expires_at' => '2026-12-09 10:00:00',
            ])
            ->assertSessionHasErrors(['usage_limit_per_user', 'min_spend', 'expires_at']);

        // 3. Anti-IDOR: assigning another seller's product ID to specific_products
        $this->actingAs($seller)
            ->post(route('vouchers.store'), [
                'code' => 'BADSCOPE01',
                'name' => 'Foreign Product Exploit',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'scope_type' => Voucher::SCOPE_SPECIFIC_PRODUCTS,
                'applicable_products' => [$foreignProduct->id],
                'usage_limit_per_user' => 1,
            ])
            ->assertSessionHasErrors(['applicable_products']);

        // 4. Product-scoped voucher validation resists omitted items & client-tampered prices + self-redemption
        Voucher::create([
            'code' => 'BOWL20',
            'name' => '20% Off Seller Bowl',
            'shop_id' => $seller->id,
            'discount_type' => 'percentage',
            'discount_value' => 20.00,
            'scope_type' => Voucher::SCOPE_SPECIFIC_PRODUCTS,
            'applicable_products' => [$sellerProduct->id],
            'min_requirement_type' => Voucher::REQ_SPEND,
            'min_spend' => 100.00,
            'is_public' => true,
            'is_active' => true,
        ]);

        // Omitting items payload must NOT bypass product scope
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'BOWL20',
                'subtotals' => [(string) $seller->id => 1000.00],
            ])
            ->assertStatus(422);

        // Tampered price (999999) in payload must be overwritten by DB price (300 -> 20% = 60)
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'BOWL20',
                'subtotals' => [(string) $seller->id => 999999.00],
                'items' => [
                    ['id' => $sellerProduct->id, 'qty' => 1, 'price' => 999999.00, 'artisan_id' => $seller->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('voucher.discount_amount', 60);

        // Workshop owner cannot redeem their own workshop voucher
        $this->actingAs($seller)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'BOWL20',
                'subtotals' => [(string) $seller->id => 300.00],
                'items' => [
                    ['id' => $sellerProduct->id, 'qty' => 1],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_followers_only_voucher_blocks_non_followers_and_unlocks_after_following(): void
    {
        $seller = $this->createArtisan('super_premium');
        $buyer = $this->createBuyer();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Studio Pitcher',
            'sku' => 'PITCH-02',
            'category' => 'Pottery',
            'price' => 400.00,
            'status' => 'Active',
        ]);

        Voucher::create([
            'code' => 'FOLLOW25',
            'name' => 'Follower Appreciation PHP 50 Off',
            'shop_id' => $seller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 50.00,
            'scope_type' => Voucher::SCOPE_ALL,
            'target_audience' => Voucher::AUDIENCE_FOLLOWERS,
            'is_public' => true,
            'is_active' => true,
        ]);

        // Before following: drawer marks ineligible & manual validation fails
        $drawerBefore = app(VoucherService::class)->getAvailableVouchersForCheckout(
            $buyer,
            [(string) $seller->id => 400.00],
            [['id' => $product->id, 'qty' => 1]]
        );
        $this->assertFalse($drawerBefore['shops'][(string) $seller->id][0]['is_eligible']);
        $this->assertFalse($drawerBefore['shops'][(string) $seller->id][0]['audience_eligible']);
        $this->assertEquals('Follow workshop to unlock', $drawerBefore['shops'][(string) $seller->id][0]['ineligible_reason']);

        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'FOLLOW25',
                'subtotals' => [(string) $seller->id => 400.00],
                'items' => [['id' => $product->id, 'qty' => 1]],
            ])
            ->assertStatus(422);

        // Follow workshop via buyer endpoint
        $this->actingAs($buyer)
            ->postJson(route('buyer.shops.toggle-follow'), ['shop_id' => $seller->id])
            ->assertOk()
            ->assertJsonPath('is_followed', true);

        $this->assertTrue(
            FollowedShop::where('user_id', $buyer->id)->where('shop_id', $seller->id)->exists()
        );

        // After following: drawer unlocks & validation succeeds
        $drawerAfter = app(VoucherService::class)->getAvailableVouchersForCheckout(
            $buyer,
            [(string) $seller->id => 400.00],
            [['id' => $product->id, 'qty' => 1]]
        );
        $this->assertTrue($drawerAfter['shops'][(string) $seller->id][0]['is_eligible']);
        $this->assertTrue($drawerAfter['shops'][(string) $seller->id][0]['is_following_shop']);

        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'FOLLOW25',
                'subtotals' => [(string) $seller->id => 400.00],
                'items' => [['id' => $product->id, 'qty' => 1]],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('voucher.discount_amount', 50);
    }

    public function test_checkout_available_vouchers_never_leaks_seller_pii_or_kyc_fields(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'super_premium',
            'setup_completed_at' => now(),
            'shop_name' => 'Secret Safe Pottery',
            'city' => 'Silang',
            'region' => 'Cavite',
            'email' => 'private-seller-pii@example.test',
            'phone_number' => '09171234567',
            'payout_account_name' => 'Private Payout Name',
            'payout_account_number' => '09998887776',
            'tin' => '123-456-789-000',
            'business_permit' => 'kyc/private-permit.pdf',
            'dti_registration' => 'kyc/private-dti.pdf',
            'valid_id' => 'kyc/private-id.jpg',
            'kyc_selfie_path' => 'kyc/private-selfie.jpg',
        ]);
        $seller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        $buyer = $this->createBuyer();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'PII Safe Bowl',
            'category' => 'Pottery',
            'sku' => 'VCH-PII-001',
            'price' => 500.00,
            'stock' => 5,
            'status' => 'Active',
        ]);

        Voucher::create([
            'code' => 'SAFE10',
            'name' => 'Safe Public Promo',
            'shop_id' => $seller->id,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'is_public' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($buyer)
            ->get(route('checkout.create', ['product_id' => $product->id, 'quantity' => 1]));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Checkout')
            ->has("availableVouchers.shops.{$seller->id}.0", function (Assert $v) {
                $v->missing('voucher')
                    ->missing('shop')
                    ->where('code', 'SAFE10')
                    ->etc();
            })
        );

        $drawer = app(VoucherService::class)->getAvailableVouchersForCheckout(
            $buyer,
            [(string) $seller->id => 500.00],
            [['id' => $product->id, 'qty' => 1]]
        );
        $json = json_encode($drawer);
        foreach ([
            'private-seller-pii@example.test',
            '09171234567',
            'Private Payout Name',
            '09998887776',
            '123-456-789-000',
            'kyc/private-permit.pdf',
            'kyc/private-dti.pdf',
            'kyc/private-id.jpg',
            'kyc/private-selfie.jpg',
        ] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, (string) $json);
        }
    }

    public function test_paymongo_checkout_session_deducts_voucher_discount_and_blocks_sub_20_online_orders(): void
    {
        $seller = $this->createArtisan('super_premium', true);
        $buyer = $this->createBuyer();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Clay Teapot',
            'category' => 'Pottery',
            'sku' => 'VCH-PAY-001',
            'price' => 500.00,
            'stock' => 10,
            'status' => 'Active',
        ]);

        // 1. Order with PHP 400 voucher discount + PHP 15 convenience fee = PHP 115.00
        $order = Order::create([
            'order_number' => 'ORD-VCH-PAY1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500.00,
            'voucher_code' => 'SAVE400',
            'voucher_discount_amount' => 400.00,
            'convenience_fee_amount' => 15.00,
            'shipping_fee_amount' => 0.00,
            'seller_net_amount' => 100.00,
            'total_amount' => 115.00,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => 'Clay Teapot',
            'variant' => 'Standard',
            'price' => 500.00,
            'quantity' => 1,
        ]);

        // 2. 100% merchandise voucher with shipping + convenience fee = PHP 65.00 (no 0-amount item sent)
        $freeMerchOrder = Order::create([
            'order_number' => 'ORD-VCH-PAY2',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500.00,
            'voucher_code' => 'FREE500',
            'voucher_discount_amount' => 500.00,
            'convenience_fee_amount' => 15.00,
            'shipping_fee_amount' => 50.00,
            'seller_net_amount' => 0.00,
            'total_amount' => 65.00,
            'status' => 'Pending',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_method' => 'Delivery',
        ]);
        $freeMerchOrder->items()->create([
            'product_id' => $product->id,
            'product_name' => 'Clay Teapot',
            'variant' => 'Standard',
            'price' => 500.00,
            'quantity' => 1,
        ]);

        $mock = Mockery::mock(PayMongoService::class);
        $mock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function (array $data) {
                $totalCents = array_sum(array_map(fn ($li) => $li['amount'] * $li['quantity'], $data['line_items']));
                return ($data['reference_number'] ?? null) === 'ORD-VCH-PAY1' && $totalCents === 11500;
            }))
            ->andReturn([
                'id' => 'cs_vch_115',
                'attributes' => ['checkout_url' => 'https://paymongo.test/vch-115'],
            ]);
        $mock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function (array $data) {
                foreach ($data['line_items'] as $li) {
                    if ($li['amount'] <= 0) {
                        return false;
                    }
                }
                $totalCents = array_sum(array_map(fn ($li) => $li['amount'] * $li['quantity'], $data['line_items']));
                return ($data['reference_number'] ?? null) === 'ORD-VCH-PAY2' && $totalCents === 6500;
            }))
            ->andReturn([
                'id' => 'cs_vch_65',
                'attributes' => ['checkout_url' => 'https://paymongo.test/vch-65'],
            ]);
        $this->app->instance(PayMongoService::class, $mock);

        $this->actingAs($buyer)
            ->get(route('payment.pay', $order->order_number))
            ->assertRedirect('https://paymongo.test/vch-115');

        $this->assertEquals(115.00, (float) $order->fresh()->total_amount);

        $this->actingAs($buyer)
            ->get(route('payment.pay', $freeMerchOrder->order_number))
            ->assertRedirect('https://paymongo.test/vch-65');

        // 3. PaymentController::pay blocks GCash/Maya when voucher drops order total below PHP 20.00
        Voucher::create([
            'code' => 'DROPBELOW20',
            'name' => 'PHP 490 Off',
            'shop_id' => $seller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 490.00,
            'is_public' => true,
            'is_active' => true,
        ]);

        $this->actingAs($buyer)
            ->post(route('checkout.store'), [
                'items' => [['id' => $product->id, 'qty' => 1, 'variant' => 'Standard']],
                'shipping_method' => 'Pick Up',
                'payment_method' => 'GCash',
                'shop_vouchers' => [(string) $seller->id => 'DROPBELOW20'],
                'total' => 10.00,
            ]);

        $sub20Order = Order::where('user_id', $buyer->id)->where('voucher_code', 'DROPBELOW20')->firstOrFail();
        $this->assertEquals(10.00, (float) $sub20Order->total_amount);

        $this->actingAs($buyer)
            ->get(route('payment.pay', $sub20Order->order_number))
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_downstream_financial_templates_settlement_and_analytics_reflect_voucher_discounts(): void
    {
        $seller = $this->createArtisan('super_premium', false);
        $buyer = $this->createBuyer();

        $pottery = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Pottery Vase',
            'sku' => 'VCH-FIN-001',
            'category' => 'Pottery',
            'price' => 600.00,
            'cost_price' => 200.00,
            'status' => 'Active',
        ]);
        $weaving = Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Woven Runner',
            'sku' => 'VCH-FIN-002',
            'category' => 'Weaving',
            'price' => 400.00,
            'cost_price' => 150.00,
            'status' => 'Active',
        ]);

        // Order 1: 1000 gross, 200 voucher -> 800 net
        $order = Order::create([
            'order_number' => 'ORD-FIN-VCH1',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 1000.00,
            'voucher_code' => 'VOUCH200',
            'voucher_discount_amount' => 200.00,
            'convenience_fee_amount' => 30.00,
            'shipping_fee_amount' => 50.00,
            'platform_commission_amount' => 0.00,
            'seller_net_amount' => 800.00,
            'total_amount' => 880.00,
            'vat_type' => 'vat_exempt',
            'vatable_sales' => 0.00,
            'vat_amount' => 0.00,
            'vat_exempt_sales' => 800.00,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Silang, Cavite',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $pottery->id,
            'product_name' => $pottery->name,
            'quantity' => 1,
            'price' => 600.00,
            'cost' => 200.00,
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $weaving->id,
            'product_name' => $weaving->name,
            'quantity' => 1,
            'price' => 400.00,
            'cost' => 150.00,
        ]);

        // Zero-net VAT-registered order (100% voucher discount -> 0.00 net, must NOT fallback to gross)
        $zeroNetOrder = Order::create([
            'order_number' => 'ORD-FIN-ZERO',
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500.00,
            'voucher_code' => 'FULL500',
            'voucher_discount_amount' => 500.00,
            'convenience_fee_amount' => 0.00,
            'shipping_fee_amount' => 0.00,
            'seller_net_amount' => 0.00,
            'total_amount' => 0.00,
            'vat_type' => 'vat_exempt',
            'vatable_sales' => 0.00,
            'vat_amount' => 0.00,
            'vat_exempt_sales' => 0.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Workshop Pickup',
        ]);

        $order->load(['items', 'artisan', 'user', 'delivery']);
        $zeroNetOrder->load(['items', 'artisan', 'user', 'delivery']);

        // 1. Receipt Blade
        $receiptHtml = view('pdf.receipt', ['order' => $order])->render();
        $this->assertStringContainsString('VOUCH200', $receiptHtml);
        $this->assertStringContainsString('-PHP 200.00', $receiptHtml);

        $zeroReceiptHtml = view('pdf.receipt', ['order' => $zeroNetOrder])->render();
        $this->assertStringContainsString('-PHP 500.00', $zeroReceiptHtml);
        $this->assertStringContainsString('VAT-Exempt Sales:</td>', $zeroReceiptHtml);
        $this->assertStringNotContainsString('<td class="tax-val">PHP 500.00</td>', $zeroReceiptHtml);

        // 2. Packing Slips Blade
        $slipHtml = view('pdf.packing-slips', ['orders' => collect([$order, $zeroNetOrder]), 'artisan' => $seller])->render();
        $this->assertStringContainsString('VOUCH200', $slipHtml);
        $this->assertStringContainsString('200.00', $slipHtml);

        // 3. Buyer & Seller Emails
        $buyerMailHtml = view('emails.orders.buyer-confirmation', ['order' => $order])->render();
        $this->assertStringContainsString('VOUCH200', $buyerMailHtml);
        $this->assertStringContainsString('200.00', $buyerMailHtml);

        $sellerMailHtml = view('emails.orders.placed', ['order' => $order])->render();
        $this->assertStringContainsString('VOUCH200', $sellerMailHtml);
        $this->assertStringContainsString('200.00', $sellerMailHtml);

        // 4. Settlement Report Service & Statement Blade
        $settlement = app(SettlementReportService::class)->getMonthlyStatementData($seller, (int) now()->format('Y'), (int) now()->format('n'));
        $this->assertEquals(1000.00, $settlement['summary']['gross_sales']);
        $this->assertEquals(200.00, $settlement['summary']['voucher_discounts']);
        $this->assertEquals(800.00, $settlement['summary']['net_earnings']);
        $this->assertEquals(800.00, $settlement['summary']['cod_sales']);
        $this->assertEquals(200.00, $settlement['orders'][0]['voucher_discount']);

        $statementHtml = view('pdf.settlement_statement', ['data' => $settlement])->render();
        $this->assertStringContainsString('-₱200.00', $statementHtml);

        // 5. Analytics Category Consistency
        $metrics = app(ShopAnalyticsMetricsService::class);
        $financials = $metrics->getFinancialMetrics($seller->id);
        $this->assertEquals(800.00, $financials['current']['revenue']);

        $monthName = Carbon::now()->format('M');
        $allChart = collect($metrics->getSalesChartData($seller->id, 'All Categories')['monthly'])->firstWhere('name', $monthName)['value'];
        $potteryChart = collect($metrics->getSalesChartData($seller->id, 'Pottery')['monthly'])->firstWhere('name', $monthName)['value'];
        $weavingChart = collect($metrics->getSalesChartData($seller->id, 'Weaving')['monthly'])->firstWhere('name', $monthName)['value'];

        $this->assertEquals(800.00, $allChart);
        $this->assertEquals(480.00, $potteryChart);
        $this->assertEquals(320.00, $weavingChart);
        $this->assertEquals($allChart, $potteryChart + $weavingChart);

        $catPerf = $metrics->getCategoryPerformance($seller->id);
        $this->assertEquals(800.00, round((float) $catPerf->sum('revenue'), 2));
        $topProds = $metrics->getTopProducts($seller->id);
        $this->assertEquals(800.00, round((float) $topProds->sum('revenue'), 2));
    }

    public function test_staff_rbac_owner_approval_and_voucher_search_gating(): void
    {
        $owner = $this->createArtisan('free');
        $owner->premium_tier = 'premium';
        $owner->save();

        $createStaff = function (string $presetKey, array $permissions, string $userLevel = User::DEFAULT_STAFF_USER_LEVEL) use ($owner): User {
            $emp = Employee::create([
                'user_id' => $owner->id,
                'name' => 'Staff ' . $presetKey,
                'role' => $presetKey,
                'salary' => 15000.00,
                'status' => 'active',
                'join_date' => now()->toDateString(),
            ]);

            $staff = User::factory()->staff($owner)->create([
                'employee_id' => $emp->id,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'staff_role_preset_key' => $presetKey,
                'staff_module_permissions' => User::withWorkspaceAccessFlag(
                    User::withStaffUserLevelFlag($permissions, $userLevel),
                    true
                ),
            ]);

            StaffAttendanceSession::create([
                'staff_user_id' => $staff->id,
                'seller_owner_id' => $owner->id,
                'attendance_date' => now(config('app.timezone'))->toDateString(),
                'clock_in_at' => now(config('app.timezone'))->subHour(),
                'last_heartbeat_at' => now(config('app.timezone')),
                'worked_minutes' => 60,
            ]);

            return $staff;
        };

        // 1. Default stock_clerk cannot access vouchers.*
        $stockClerk = $createStaff('stock_clerk', ['products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT]);
        $this->actingAs($stockClerk)->get(route('vouchers.index'))->assertForbidden();
        $this->actingAs($stockClerk)->post(route('vouchers.store'), [
            'code' => 'CLERK01',
            'name' => 'Clerk Bypass',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'usage_limit_per_user' => 1,
        ])->assertForbidden();

        // 2. Read-only voucher staff can view index (canEditVouchers = false) but cannot POST/PUT/DELETE
        $readOnlyStaff = $createStaff('custom', ['vouchers' => User::STAFF_ACCESS_PERMISSION_READ_ONLY]);
        $this->actingAs($readOnlyStaff)
            ->get(route('vouchers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('canEditVouchers', false));
        $this->actingAs($readOnlyStaff)->post(route('vouchers.store'), [
            'code' => 'READONLY01',
            'name' => 'Should Fail',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'usage_limit_per_user' => 1,
        ])->assertForbidden();

        // 3. Non-manager staff explicitly granted vouchers:can_edit routes through OwnerApproval::DOMAIN_DISCOUNT
        $voucherClerk = $createStaff('custom', ['vouchers' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT]);
        $this->actingAs($voucherClerk)
            ->from(route('vouchers.index'))
            ->post(route('vouchers.store'), [
                'code' => 'STAFFVCH01',
                'name' => 'Staff Draft Voucher',
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'usage_limit_per_user' => 1,
                'is_active' => true,
            ])
            ->assertRedirect(route('vouchers.index'))
            ->assertSessionHas('success', 'Shop voucher submitted to shop owner for review.');

        $draftVoucher = Voucher::where('code', 'STAFFVCH01')->firstOrFail();
        $this->assertFalse((bool) $draftVoucher->is_active);
        $approval = OwnerApproval::where('approvable_type', Voucher::class)
            ->where('approvable_id', $draftVoucher->id)
            ->where('domain', OwnerApproval::DOMAIN_DISCOUNT)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->firstOrFail();

        // Non-manager staff cannot directly edit or deactivate vouchers
        $this->actingAs($voucherClerk)->delete(route('vouchers.destroy', $draftVoucher->id))->assertForbidden();

        // Owner approves -> voucher becomes active!
        $this->actingAs($owner)->post(route('seller.approvals.approve', $approval->id))->assertRedirect();
        $this->assertTrue((bool) $draftVoucher->fresh()->is_active);

        // 4. SellerSearchService finds vouchers even on non-Elite accounts without discounts module
        $searchResults = app(SellerSearchService::class)->search($owner, 'STAFFVCH01', 'like');
        $this->assertTrue(collect($searchResults)->contains(fn ($r) => $r['type'] === 'Voucher' && str_contains($r['title'], 'STAFFVCH01')));
    }

    public function test_voucher_quota_bypass_soft_deleted_products_utc_dates_min_spend_null_and_rejected_orders(): void
    {
        $standardSeller = $this->createArtisan('free');
        $buyer = $this->createBuyer();

        $prodA = Product::factory()->create(['user_id' => $standardSeller->id, 'name' => 'Edge Pot A', 'category' => 'Pottery', 'sku' => 'VCH-EDG-001', 'price' => 300, 'status' => 'Active']);
        $prodB = Product::factory()->create(['user_id' => $standardSeller->id, 'name' => 'Edge Pot B', 'category' => 'Pottery', 'sku' => 'VCH-EDG-002', 'price' => 400, 'status' => 'Active']);

        // 1. Expired active voucher + 3 ongoing vouchers: extending expires_at on expired voucher must be blocked
        $expiredActive = Voucher::create([
            'code' => 'EXPIRED01',
            'name' => 'Expired Active',
            'shop_id' => $standardSeller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 20,
            'is_active' => true,
            'expires_at' => now()->subDay(),
        ]);

        for ($i = 1; $i <= 3; $i++) {
            Voucher::create([
                'code' => "LIVE0{$i}",
                'name' => "Live {$i}",
                'shop_id' => $standardSeller->id,
                'discount_type' => 'fixed_amount',
                'discount_value' => 20,
                'is_active' => true,
                'expires_at' => now()->addDays(10),
            ]);
        }

        $this->actingAs($standardSeller)
            ->put(route('vouchers.update', $expiredActive->id), [
                'code' => 'EXPIRED01',
                'name' => 'Extended Bypass Attempt',
                'discount_type' => 'fixed_amount',
                'discount_value' => 20,
                'usage_limit_per_user' => 1,
                'is_active' => true,
                'expires_at' => now()->addDays(5)->toIso8601String(),
            ])
            ->assertSessionHasErrors('limit');

        // 2. Deactivate one live voucher, test UTC ISO date creation, min_spend null fallback, and soft-deleted product preservation
        Voucher::where('code', 'LIVE03')->update(['is_active' => false]);

        $this->actingAs($standardSeller)
            ->post(route('vouchers.store'), [
                'code' => 'UTCISO01',
                'name' => 'UTC Immediate Voucher',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'scope_type' => Voucher::SCOPE_SPECIFIC_PRODUCTS,
                'applicable_products' => [$prodA->id, $prodB->id],
                'min_spend' => null,
                'usage_limit_per_user' => 1,
                'starts_at' => now()->subMinutes(2)->toIso8601String(),
                'expires_at' => now()->addDays(7)->toIso8601String(),
            ])
            ->assertSessionHasNoErrors();

        $utcVoucher = Voucher::where('code', 'UTCISO01')->firstOrFail();
        $this->assertSame('ongoing', $utcVoucher->status_label);
        $this->assertEquals(0.00, (float) $utcVoucher->min_spend);

        // Soft-delete prodB, then edit voucher keeping existing applicable_products + null min_spend -> succeeds!
        $prodB->delete();
        $this->actingAs($standardSeller)
            ->put(route('vouchers.update', $utcVoucher->id), [
                'code' => 'UTCISO01',
                'name' => 'UTC Updated Voucher',
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'scope_type' => Voucher::SCOPE_SPECIFIC_PRODUCTS,
                'applicable_products' => [$prodA->id, $prodB->id],
                'min_spend' => null,
                'usage_limit_per_user' => 1,
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        // 3. Rejected order does NOT count against AUDIENCE_NEW_CUSTOMERS or qualify for AUDIENCE_REPEAT_CUSTOMERS
        Order::create([
            'order_number' => 'ORD-REJ-01',
            'user_id' => $buyer->id,
            'artisan_id' => $standardSeller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 300.00,
            'total_amount' => 300.00,
            'status' => Order::STATUS_REJECTED,
            'payment_status' => 'pending',
            'shipping_address' => 'Silang, Cavite',
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
        ]);

        Voucher::create([
            'code' => 'NEWONLY1',
            'name' => 'New Customers Only',
            'shop_id' => $standardSeller->id,
            'discount_type' => 'fixed_amount',
            'discount_value' => 30,
            'target_audience' => Voucher::AUDIENCE_NEW_CUSTOMERS,
            'is_public' => true,
            'is_active' => true,
        ]);

        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'NEWONLY1',
                'subtotals' => [(string) $standardSeller->id => 300.00],
                'items' => [['id' => $prodA->id, 'qty' => 1]],
            ])
            ->assertOk()
            ->assertJsonPath('valid', true);

        // 4. ValidateVoucherRequest rejects non-existent product IDs
        $this->actingAs($buyer)
            ->postJson(route('checkout.validate-voucher'), [
                'code' => 'NEWONLY1',
                'subtotals' => [(string) $standardSeller->id => 300.00],
                'items' => [['id' => 99999999, 'qty' => 1]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.id');
    }

    public function test_discount_controller_and_vouchers_index_provide_rbac_props_and_safe_fallback(): void
    {
        $eliteOwner = $this->createArtisan('super_premium');

        // Elite owner accessing /seller/vouchers receives vouchers tab props and campaign flags
        $this->actingAs($eliteOwner)
            ->get(route('vouchers.index', ['search' => 'SPRING']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Marketing/DiscountManager')
                ->where('filters.tab', 'vouchers')
                ->where('filters.search', 'SPRING')
                ->where('canAccessCampaignDiscounts', true)
                ->where('canAccessVouchers', true)
                ->where('canEditVouchers', true)
                ->where('canEditCampaignDiscounts', true)
                ->has('vouchers')
                ->has('voucherStats')
                ->has('voucherQuota')
            );

        // Elite owner accessing /discounts receives campaigns tab props and voucher flags
        $this->actingAs($eliteOwner)
            ->get(route('discounts.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Marketing/DiscountManager')
                ->where('filters.tab', 'campaigns')
                ->where('canAccessCampaignDiscounts', true)
                ->where('canAccessVouchers', true)
                ->where('canEditVouchers', true)
                ->where('canEditCampaignDiscounts', true)
            );

        // DiscountController voucher fetch failure falls back safely while keeping RBAC props
        $this->mock(VoucherService::class, function ($mock) {
            $mock->shouldReceive('getSellerVoucherDashboardData')
                ->once()
                ->andThrow(new \RuntimeException('Simulated voucher query timeout'));
        });

        $this->actingAs($eliteOwner)
            ->get(route('discounts.index', ['tab' => 'vouchers', 'search' => 'FALLBACK']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Marketing/DiscountManager')
                ->where('filters.tab', 'vouchers')
                ->where('filters.search', 'FALLBACK')
                ->where('canAccessCampaignDiscounts', true)
                ->where('canAccessVouchers', true)
                ->where('canEditVouchers', true)
                ->where('canEditCampaignDiscounts', true)
                ->where('voucherQuota.is_elite', true)
                ->where('vouchers', [])
            );
    }
}
