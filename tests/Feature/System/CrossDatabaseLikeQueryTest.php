<?php

namespace Tests\Feature\System;

use App\Actions\Seller\SupplyHub\FetchB2BCatalog;
use App\Models\OwnerApproval;
use App\Models\PlatformActivity;
use App\Models\Product;
use App\Models\User;
use App\Services\AccountingLedgerService;
use App\Services\OwnerApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class CrossDatabaseLikeQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_b2b_catalog_fetch_supports_case_insensitive_like(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'shop_name' => 'TerraCotta Guild',
        ]);
        $buyer = User::factory()->create();

        Product::factory()->create([
            'user_id' => $artisan->id,
            'sku' => 'B2B-TEST-001',
            'name' => 'Red Clay Terracotta Mug',
            'clay_type' => 'Terracotta',
            'category' => 'Raw Clay & Slips',
            'is_b2b_supply' => true,
            'status' => 'Active',
            'stock' => 50,
            'price' => 150.00,
            'wholesale_price' => 120.00,
            'moq' => 1,
            'wholesale_min_qty' => 5,
        ]);

        $action = app(FetchB2BCatalog::class);
        $request = Request::create('/seller/supply-hub/catalog', 'GET', ['search' => 'terracotta']);

        $result = $action->execute($request, $buyer);
        $this->assertNotEmpty($result['supplies']->items());
    }

    public function test_email_studio_search_supports_like(): void
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->artisanApproved()->create([
            'name' => 'Artisan Test Subject',
            'email' => 'artisan.special@example.com',
        ]);

        $response = $this->actingAs($admin)->getJson(route('admin.email-templates.index', ['query' => 'special']));
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('users'));
    }

    public function test_platform_diagnostics_supports_like(): void
    {
        $admin = User::factory()->superAdmin()->create();
        PlatformActivity::create([
            'user_id' => $admin->id,
            'action' => 'user_status_updated',
            'description' => 'Admin updated disciplinary state for fraudulent user',
            'metadata' => ['user_id' => 999],
        ]);

        $response = $this->actingAs($admin)->get(route('admin.activity.export', ['search' => 'fraudulent']));
        $response->assertStatus(200);
    }

    public function test_owner_approval_service_supports_like(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        OwnerApproval::create([
            'seller_id' => $seller->id,
            'requester_id' => $seller->id,
            'domain' => OwnerApproval::DOMAIN_HR_PAYROLL,
            'title' => 'Release Funds for Potter Apprenticeship',
            'summary' => 'Weekly payroll disbursement for apprenticeship workshop',
            'status' => OwnerApproval::STATUS_PENDING,
        ]);

        $service = app(OwnerApprovalService::class);
        $paginator = $service->getPaginatedApprovals($seller, ['search' => 'Apprenticeship']);

        $this->assertEquals(1, $paginator->total());
    }

    public function test_accounting_ledger_service_supports_like(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $service = app(AccountingLedgerService::class);
        $ledgerData = $service->getLedgerData($seller, 'all', 'all', 'Order-1234');

        $this->assertIsArray($ledgerData);
        $this->assertArrayHasKey('history', $ledgerData);
        $this->assertArrayHasKey('pendingRequests', $ledgerData);
    }

    public function test_b2b_supply_hub_controller_search_queries_execute_cleanly(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $this->actingAs($seller)->get(route('seller.supply-hub.orders', ['search' => 'ORD-TEST']))
            ->assertStatus(200);

        $this->actingAs($seller)->get(route('seller.supply-hub.sales', ['search' => 'ORD-WHOLESALE']))
            ->assertStatus(200);
    }

    public function test_seller_order_listing_executes_without_schema_error(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = \App\Models\Order::create([
            'order_number' => 'ORD-SCHEMA-001',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Pending',
            'total_amount' => 100.00,
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Pickup',
            'shipping_address' => 'Cavite',
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Clay Pot',
            'price' => 100.00,
            'quantity' => 1,
            'is_b2b_supply' => false,
        ]);

        $action = app(\App\Actions\Seller\Orders\ListSellerOrders::class);
        $result = $action->execute($seller->id, $seller, []);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('orders', $result);
        $this->assertArrayHasKey('tabCounts', $result);
        $this->assertEquals(1, $result['tabCounts']['Pending']);
    }
}
