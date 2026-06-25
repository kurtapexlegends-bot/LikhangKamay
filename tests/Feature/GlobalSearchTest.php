<?php
namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Review;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\SponsorshipRequest;
use App\Models\PlatformActivity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_global_search(): void
    {
        $this->get(route('api.global-search', ['query' => 'test']))
            ->assertRedirect(route('login'));
    }

    public function test_non_seller_non_admin_gets_empty_results(): void
    {
        /** @var \App\Models\User $buyer */
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->actingAs($buyer)
            ->get(route('api.global-search', ['query' => 'clay']))
            ->assertOk()
            ->assertJsonCount(0, 'results');
    }

    public function test_super_admin_can_perform_administrative_search(): void
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->superAdmin()->create();
        
        // Setup search targets
        $buyer = User::factory()->create(['name' => 'Alice Buyer', 'role' => 'buyer']);
        $artisan = User::factory()->artisanApproved()->create(['name' => 'Bob Artisan', 'shop_name' => 'Bob Shop']);
        

        $activity = PlatformActivity::create([
            'user_id' => $admin->id,
            'action' => 'updated_config',
            'description' => 'Updated the global taxes config',
        ]);

        $flagged = \App\Models\FlaggedContent::create([
            'reporter_id' => $buyer->id,
            'reportable_type' => \App\Models\User::class,
            'reportable_id' => $artisan->id,
            'reason' => 'Inappropriate shop banner',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Global']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Audit: Updated the global taxes config',
            ]);

        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Alice']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Alice Buyer',
            ]);


        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Inappropriate']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Report #' . $flagged->id . ': Inappropriate shop banner...',
            ]);
    }

    public function test_seller_can_perform_scoped_workspace_search(): void
    {
        /** @var \App\Models\User $artisan */
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Charlie Seller',
            'shop_name' => 'Charlie Ceramics',
            'premium_tier' => 'super_premium',
        ]);
        $otherArtisan = User::factory()->artisanApproved()->create(['name' => 'Other Seller', 'shop_name' => 'Other Ceramics']);

        // Charlie's entities
        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Charlie Blue Mug',
            'sku' => 'CH-BLUE-MUG',
            'status' => 'Active',
            'category' => 'Stoneware',
            'price' => 150.00,
        ]);

        $supply = Supply::create([
            'user_id' => $artisan->id,
            'name' => 'Charlie Glaze Ink',
            'quantity' => 10,
            'unit' => 'liters',
            'unit_cost' => 120.00,
            'min_stock' => 2,
            'sku' => 'GL-INK',
            'category' => 'Glazes',
        ]);

        // Other Artisan's entities (should not show up in Charlie's search)
        $otherProduct = Product::factory()->create([
            'user_id' => $otherArtisan->id,
            'name' => 'Charlie Red Mug',
            'sku' => 'OT-RED-MUG',
            'status' => 'Active',
            'category' => 'Stoneware',
            'price' => 150.00,
        ]);

        $this->actingAs($artisan)
            ->get(route('api.global-search', ['query' => 'Charlie']))
            ->assertOk()
            ->assertJsonCount(2, 'results')
            ->assertJsonFragment([
                'title' => 'Charlie Blue Mug',
            ])
            ->assertJsonFragment([
                'title' => 'Supply: Charlie Glaze Ink',
            ])
            ->assertJsonMissing([
                'title' => 'Charlie Red Mug',
            ]);
    }

    public function test_super_admin_can_search_products_and_disputes(): void
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->superAdmin()->create();
        
        $artisan = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        // Create a product
        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Unique Super Widget',
            'sku' => 'SUP-WIDG-001',
            'price' => 250.00,
            'category' => 'Stoneware',
        ]);

        // Create an order & dispute
        $order = Order::create([
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-DISP-999',
            'customer_name' => 'John Doe Buyer',
            'total_amount' => 500,
            'status' => 'Refund/Return',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Manila',
            'shipping_method' => 'Delivery',
        ]);

        $dispute = \App\Models\Dispute::create([
            'order_id' => $order->id,
            'status' => 'escalated',
            'reason' => 'Escalated because of damages',
            'proof_photos' => ['damages.jpg'],
        ]);

        // Search for product
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Widget']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Unique Super Widget',
                'type' => 'Product',
            ]);

        // Search for dispute
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'damages']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Dispute: Order #ORD-DISP-999',
                'type' => 'Dispute',
            ]);
    }

    public function test_staff_search_is_restricted_by_permissions(): void
    {
        /** @var \App\Models\User $artisan */
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Charlie Seller',
            'shop_name' => 'Charlie Ceramics',
            'premium_tier' => 'super_premium',
        ]);

        // Create a product
        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Charlie Blue Mug',
            'sku' => 'CH-BLUE-MUG',
            'status' => 'Active',
            'category' => 'Stoneware',
            'price' => 150.00,
        ]);

        // Create an employee
        $employee = Employee::create([
            'user_id' => $artisan->id,
            'employee_id' => 'EMP-001',
            'name' => 'Alice Worker',
            'role' => 'Stock Clerk',
            'salary' => 12000,
            'status' => 'active',
            'join_date' => '2026-01-01',
        ]);

        // Create a staff user with products permission ONLY
        /** @var \App\Models\User $productsStaff */
        $productsStaff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['products' => true],
        ]);

        // Search with products-only staff - should see product but NOT employee
        $this->actingAs($productsStaff)
            ->get(route('api.global-search', ['query' => 'Charlie']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Charlie Blue Mug',
            ])
            ->assertJsonMissing([
                'title' => 'Alice Worker',
            ]);

        // Create a staff user with HR permission ONLY
        /** @var \App\Models\User $hrStaff */
        $hrStaff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['hr' => true],
        ]);

        // Search with HR staff - should see employee but NOT product
        $this->actingAs($hrStaff)
            ->get(route('api.global-search', ['query' => 'Alice']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Alice Worker',
            ]);

        $this->actingAs($hrStaff)
            ->get(route('api.global-search', ['query' => 'Charlie']))
            ->assertOk()
            ->assertJsonMissing([
                'title' => 'Charlie Blue Mug',
            ]);
    }
}
