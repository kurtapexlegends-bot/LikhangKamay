<?php

namespace Tests\Feature\Subscription;

use App\Facades\Settings;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTierFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_seller_cannot_dispatch_in_house_driver(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-TEST-001',
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'status' => 'Processing',
            'total_amount' => 500.00,
            'shipping_method' => 'Delivery',
            'payment_status' => 'paid',
            'payment_method' => 'Cash on Delivery',
            'shipping_address' => '123 Test St, Cavite',
            'customer_name' => 'Test Customer',
        ]);

        $this->actingAs($seller)
            ->post(route('orders.dispatch-in-house', $order->order_number), [
                'employee_id' => 999,
            ])
            ->assertForbidden();
    }

    public function test_standard_and_premium_sellers_cannot_access_b2b_supply_hub(): void
    {
        $freeSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $this->actingAs($freeSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertForbidden();

        $this->actingAs($premiumSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertForbidden();
    }

    public function test_elite_seller_can_access_b2b_supply_hub(): void
    {
        $eliteSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($eliteSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertOk();
    }

    public function test_standard_and_premium_sellers_cannot_toggle_wholesale_materials(): void
    {
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $product = Product::create([
            'user_id' => $premiumSeller->id,
            'name' => 'Handmade Clay Bowl',
            'sku' => 'BOWL-001',
            'slug' => 'handmade-clay-bowl',
            'price' => 250.00,
            'cost_price' => 150.00,
            'stock' => 50,
            'category' => 'Pottery',
            'status' => 'Active',
        ]);

        $this->actingAs($premiumSeller)
            ->post(route('seller.supply-hub.toggle', $product->slug), [
                'is_b2b_supply' => true,
                'moq' => 10,
                'wholesale_price' => 200.00,
            ])
            ->assertForbidden();
    }

    public function test_standard_and_premium_sellers_cannot_access_discounts_module(): void
    {
        $freeSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $this->actingAs($freeSeller)
            ->get(route('discounts.index'))
            ->assertForbidden();

        $this->actingAs($premiumSeller)
            ->get(route('discounts.index'))
            ->assertForbidden();
    }

    public function test_elite_seller_can_access_discounts_module(): void
    {
        $eliteSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($eliteSeller)
            ->get(route('discounts.index'))
            ->assertOk();
    }

    public function test_free_seller_has_zero_staff_limit_and_cannot_access_hr(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $this->assertFalse($seller->canAddMoreStaff());
        $this->assertSame(0, $seller->getActiveStaffLimit());

        $this->actingAs($seller)
            ->get(route('hr.index'))
            ->assertForbidden();
    }

    public function test_premium_seller_cannot_exceed_staff_seat_quota(): void
    {
        Settings::set('tier_premium_staff_limit', 1, 'integer');

        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'modules_enabled' => [
                'hr' => true,
                'accounting' => false,
                'procurement' => false,
            ],
        ]);

        // 1 staff created uses the 1 seat available
        User::factory()->staff($seller)->create();

        $this->assertFalse($seller->canAddMoreStaff());
        $this->assertSame(1, $seller->getActiveStaffLimit());

        $response = $this->actingAs($seller)
            ->from(route('hr.index'))
            ->post(route('hr.store'), [
                'name' => 'Second Worker',
                'role' => 'Craftsman',
                'salary' => 15000,
                'create_login_account' => true,
                'email' => 'secondworker@gmail.com',
                'default_password' => 'Password123!',
                'staff_user_level' => 'standard',
                'staff_role_preset_key' => 'craftsman',
            ]);

        $response->assertSessionHasErrors(['create_login_account']);
    }

    public function test_platform_commission_rate_is_strictly_zero_percent(): void
    {
        $rate = OrderFinanceService::getPlatformCommissionRate();
        $this->assertEquals(0.00, $rate);

        $calc = app(OrderFinanceService::class)->calculateAmounts(1500.00, 100.00);
        $this->assertEquals(0.00, $calc['platform_commission_amount']);
        $this->assertEquals(1500.00, $calc['seller_net_amount']);
    }
}
