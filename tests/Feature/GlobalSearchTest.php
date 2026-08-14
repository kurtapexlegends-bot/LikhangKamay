<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\SponsorshipRequest;
use App\Models\PlatformActivity;
use App\Models\Discount;
use App\Models\Payout;
use App\Models\EmailTemplate;
use App\Models\TeamChannel;
use App\Models\SellerActivityLog;
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
        $buyer = User::factory()->create(['name' => 'Alice Buyer', 'email' => 'alice@buyer.com', 'role' => 'buyer']);
        $pendingArtisan = User::factory()->create([
            'name' => 'Pending Artisan Kurt',
            'shop_name' => 'Kurt Artisan Workshop',
            'role' => 'artisan',
            'artisan_status' => 'pending',
        ]);
        
        $activity = PlatformActivity::create([
            'user_id' => $admin->id,
            'action' => 'updated_config',
            'description' => 'Updated the global taxes config',
        ]);

        $flagged = \App\Models\FlaggedContent::create([
            'reporter_id' => $buyer->id,
            'reportable_type' => \App\Models\User::class,
            'reportable_id' => $pendingArtisan->id,
            'reason' => 'Inappropriate shop banner',
            'status' => 'pending',
        ]);

        $payout = Payout::create([
            'user_id' => $pendingArtisan->id,
            'amount' => 1500.00,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Kurt Payout',
            'payout_account_number' => '09123456789',
            'reference_number' => 'PO-TEST-888',
            'status' => 'pending',
        ]);

        $emailTemplate = EmailTemplate::create([
            'slug' => 'artisan-welcome-promo',
            'name' => 'Artisan Welcome Promo',
            'subject' => 'Welcome to the artisan collective',
            'headline' => 'Get Started Handcrafting',
            'body' => 'Welcome to our platform.',
            'category' => 'Marketing',
            'is_active' => true,
            'created_by_user_id' => $admin->id,
        ]);

        // Search for Activity Log
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Global']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Audit: Updated the global taxes config',
            ]);

        // Search for User
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Alice']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Alice Buyer',
            ]);

        // Search for Pending Artisan Application
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Kurt Artisan Workshop']))
            ->assertOk()
            ->assertJsonFragment([
                'type' => 'Artisan Application',
                'title' => 'Application: Kurt Artisan Workshop',
            ]);

        // Search for Moderation Flag
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Inappropriate']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Flagged Content #' . $flagged->id . ': Inappropriate shop banner...',
            ]);

        // Search for Payout Record
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'PO-TEST-888']))
            ->assertOk()
            ->assertJsonFragment([
                'type' => 'Payout',
            ]);

        // Search for Email Template
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'Artisan Welcome Promo']))
            ->assertOk()
            ->assertJsonFragment([
                'type' => 'Email Template',
                'title' => 'Email Template: Artisan Welcome Promo',
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

        $discount = Discount::create([
            'user_id' => $artisan->id,
            'name' => 'Charlie Summer Sale',
            'type' => 'percentage',
            'value' => 20,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(7),
            'is_active' => true,
        ]);

        // Other Artisan's entities (should NOT show up in Charlie's search)
        $otherProduct = Product::factory()->create([
            'user_id' => $otherArtisan->id,
            'name' => 'Charlie Red Mug',
            'sku' => 'OT-RED-MUG',
            'status' => 'Active',
            'category' => 'Stoneware',
            'price' => 150.00,
        ]);

        $otherDiscount = Discount::create([
            'user_id' => $otherArtisan->id,
            'name' => 'Charlie Other Sale',
            'type' => 'percentage',
            'value' => 15,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(7),
            'is_active' => true,
        ]);

        $this->actingAs($artisan)
            ->get(route('api.global-search', ['query' => 'Charlie']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Charlie Blue Mug',
            ])
            ->assertJsonFragment([
                'title' => 'Supply: Charlie Glaze Ink',
            ])
            ->assertJsonFragment([
                'title' => 'Discount: Charlie Summer Sale',
            ])
            ->assertJsonMissing([
                'title' => 'Charlie Red Mug',
            ])
            ->assertJsonMissing([
                'title' => 'Discount: Charlie Other Sale',
            ]);
    }

    public function test_super_admin_can_search_products_disputes_and_review_disputes(): void
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

        $review = Review::create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'rating' => 1,
            'comment' => 'Broken on arrival',
            'customer' => 'John Doe',
        ]);

        $reviewDispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $artisan->id,
            'reported_by_user_id' => $artisan->id,
            'status' => 'pending',
            'reason' => 'Unfair malicious 1-star review',
            'details' => 'Customer never messaged us before posting',
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

        // Search for review dispute
        $this->actingAs($admin)
            ->get(route('api.global-search', ['query' => 'malicious']))
            ->assertOk()
            ->assertJsonFragment([
                'type' => 'Review Dispute',
            ]);
    }

    public function test_staff_search_is_strictly_restricted_by_permissions_and_rbac(): void
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

        // Create a team channel
        $teamChannel = TeamChannel::create([
            'seller_owner_id' => $artisan->id,
            'name' => 'operations-alerts',
            'description' => 'Daily workshop alerts and coordination',
            'created_by_id' => $artisan->id,
        ]);

        // Create seller audit log (owner only)
        SellerActivityLog::create([
            'seller_owner_id' => $artisan->id,
            'user_id' => $artisan->id,
            'category' => 'Security',
            'event_type' => 'password_updated',
            'title' => 'Secret Security Log',
            'summary' => 'Owner changed main secret credentials',
        ]);

        // 1. Staff user with products permission ONLY
        /** @var \App\Models\User $productsStaff */
        $productsStaff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['products' => true],
        ]);

        // Products staff sees product, but NOT employee, NOT team channel, NOT owner audit log
        $this->actingAs($productsStaff)
            ->get(route('api.global-search', ['query' => 'Charlie']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Charlie Blue Mug',
            ])
            ->assertJsonMissing([
                'title' => 'Alice Worker',
            ]);

        $this->actingAs($productsStaff)
            ->get(route('api.global-search', ['query' => 'operations-alerts']))
            ->assertOk()
            ->assertJsonMissing([
                'title' => 'Channel: #operations-alerts',
            ]);

        $this->actingAs($productsStaff)
            ->get(route('api.global-search', ['query' => 'Secret Security']))
            ->assertOk()
            ->assertJsonMissing([
                'title' => 'Log: Secret Security Log',
            ]);

        // 2. Staff user with HR permission ONLY
        /** @var \App\Models\User $hrStaff */
        $hrStaff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['hr' => true],
        ]);

        // HR staff sees employee, but NOT product
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

        // 3. Staff user with messages permission ONLY
        /** @var \App\Models\User $messagesStaff */
        $messagesStaff = User::factory()->staff($artisan)->create([
            'staff_module_permissions' => ['messages' => true],
        ]);

        $this->actingAs($messagesStaff)
            ->get(route('api.global-search', ['query' => 'operations-alerts']))
            ->assertOk()
            ->assertJsonFragment([
                'title' => 'Channel: #operations-alerts',
            ]);
    }
}
