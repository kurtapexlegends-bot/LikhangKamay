<?php

namespace Tests\Feature\Audit;

use App\Actions\Disputes\AdminArbitrateDispute;
use App\Actions\Disputes\BuyerInitiateDispute;
use App\Actions\Seller\Orders\ApproveOrderReplacement;
use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Models\Discount;
use App\Models\Dispute;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\SellerLocation;
use App\Models\SponsorshipRequest;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Services\AccountingLedgerService;
use App\Services\PayMongoService;
use App\Services\StaffAttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class RemediationPlanAuditTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Phase 1: Treasury Solvency & Platform Payouts
     */
    public function test_phase1_ready_for_payout_deducts_expenses_excludes_cod_and_caps_at_balance(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'base_funds' => 0.00,
        ]);
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Online sales: 50,000
        Order::create([
            'order_number' => 'ORD-P1-001',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 50000.00,
            'seller_net_amount' => 50000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        // COD sales: 20,000 (direct collection, excluded from platform escrow)
        Order::create([
            'order_number' => 'ORD-P1-002',
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'total_amount' => 20000.00,
            'seller_net_amount' => 20000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Main St',
        ]);

        // Stock request expense: 30,000
        $supply = Supply::create([
            'user_id' => $artisan->id,
            'name' => 'Terra Cotta Clay',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'kg',
            'unit_price' => 100,
        ]);
        StockRequest::create([
            'user_id' => $artisan->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'total_cost' => 30000.00,
            'status' => StockRequest::STATUS_ACCOUNTING_APPROVED,
        ]);

        $ledger = app(AccountingLedgerService::class);
        $snapshot = $ledger->buildFinancialSnapshot($artisan);

        // Total revenue = 70,000
        $this->assertEquals(70000.00, $snapshot['revenue']);
        // Expenses = 30,000
        $this->assertEquals(30000.00, $snapshot['expenses']);
        // Balance = 70,000 - 30,000 = 40,000
        $this->assertEquals(40000.00, $snapshot['balance']);
        // Ready for payout = Online (50,000) - Expenses (30,000) = 20,000 (NOT 70,000 or 50,000!)
        $this->assertEquals(20000.00, $snapshot['ready_for_payout']);
    }

    /**
     * Phase 2: Order Lifecycle, Auto-Complete & Dispute Window
     */
    public function test_phase2_auto_complete_runs_full_lifecycle_and_grants_dispute_window(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Pot',
            'sku' => 'POT-AUTO-01',
            'category' => 'Pottery',
            'sold' => 0,
            'stock' => 10,
            'price' => 600.00,
            'status' => 'approved',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-AUTO-001',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Delivered',
            'auto_complete_at' => now()->subHour(),
            'delivered_at' => now()->subHours(25),
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'total_amount' => 1200.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Oak Lane',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'price' => 600.00,
            'cost' => 300.00,
        ]);

        // Run auto-complete command
        Artisan::call('orders:auto-complete');

        $order->refresh();
        $product->refresh();

        // 1. Order status is Completed
        $this->assertSame('Completed', $order->status);
        // 2. COD payment marked paid
        $this->assertSame('paid', $order->payment_status);
        // 3. received_at is set
        $this->assertNotNull($order->received_at);
        // 4. Product sold count incremented
        $this->assertEquals(2, (int) $product->sold);
        // 5. warranty_expires_at is set into the future
        $this->assertNotNull($order->warranty_expires_at);
        $this->assertTrue($order->warranty_expires_at->isFuture());

        // 6. Buyer can legitimately file a dispute within this new window
        $disputeAction = app(BuyerInitiateDispute::class);
        $photo = UploadedFile::fake()->image('defect.jpg');

        $disputeAction->execute(
            orderId: (string) $order->id,
            reason: 'Item arrived damaged despite auto-completion.',
            proofPhotos: [$photo],
            buyerId: $buyer->id
        );

        $this->assertDatabaseHas('disputes', [
            'order_id' => $order->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Phase 3: PayMongo Automated Refunds & Session Retention
     */
    public function test_phase3_admin_arbitrate_refund_invokes_paymongo_service(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $order = Order::create([
            'order_number' => 'ORD-PAYMONGO-REFUND-001',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'paymongo_session_id' => 'cs_test_session_audit_123',
            'payment_id' => 'pay_test_audit_payment_999',
            'total_amount' => 1500.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Pine St',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'reason' => 'Defective merchandise',
            'proof_photos' => ['disputes/defect.jpg'],
            'status' => 'escalated',
        ]);

        // Mock PayMongoService to expect createRefund
        $payMongoMock = Mockery::mock(PayMongoService::class);
        $payMongoMock->shouldReceive('createRefund')
            ->once()
            ->withArgs(function ($paymentId, $amountInCents, $reason, $notes) {
                return $paymentId === 'pay_test_audit_payment_999'
                    && $amountInCents === 150000
                    && $reason === 'requested_by_customer';
            })
            ->andReturn([
                'id' => 'ref_test_mock_123',
                'status' => 'success',
            ]);

        $this->app->instance(PayMongoService::class, $payMongoMock);

        $this->actingAs($admin);
        app(AdminArbitrateDispute::class)->execute(
            disputeId: $dispute->id,
            decision: 'refund',
            adminNotes: 'Confirmed merchant delivered defective batch. Approving full refund.',
            actor: $admin
        );

        $order->refresh();
        $dispute->refresh();

        $this->assertSame('Refunded', $order->status);
        $this->assertSame('refunded', $order->payment_status);
        $this->assertSame('resolved_refunded', $dispute->status);
        $this->assertSame('cs_test_session_audit_123', $order->paymongo_session_id); // Not nulled!
    }

    /**
     * Phase 4: BOM Supplies Restored on Shipped Cancellation & Discount Rollback
     */
    public function test_phase4_raw_materials_restored_when_order_cancelled_from_shipped(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Create supply (raw material)
        $clay = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Glaze',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'liters',
            'unit_price' => 200,
        ]);

        // Manufactured product requiring 2 units of glaze per product
        $vase = Product::create([
            'user_id' => $seller->id,
            'name' => 'Artisan Vase',
            'sku' => 'VASE-BOM-01',
            'category' => 'Pottery',
            'production_method' => 'manufactured',
            'stock' => 5,
            'price' => 1000.00,
            'status' => 'approved',
        ]);

        ProductRecipe::create([
            'product_id' => $vase->id,
            'supply_id' => $clay->id,
            'quantity_required' => 2,
        ]);

        // Create active discount
        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => 'Flash Sale',
            'type' => 'fixed',
            'value' => 50,
            'promo_stock' => 10,
            'promo_sold' => 3,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(5),
            'is_active' => true,
        ]);

        // Order with 2 vases, previously Shipped
        $order = Order::create([
            'order_number' => 'ORD-BOM-SHIPPED-001',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'total_amount' => 2000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '789 Elm St',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $vase->id,
            'discount_id' => $discount->id,
            'product_name' => $vase->name,
            'quantity' => 2,
            'price' => 1000.00,
            'cost' => 500.00,
        ]);

        // Cancel order from Shipped (e.g. failed delivery)
        app(UpdateOrderStatus::class)->execute($order, ['status' => 'Cancelled'], $seller, null);

        $clay->refresh();
        $vase->refresh();
        $discount->refresh();
        $order->refresh();

        $this->assertSame('Cancelled', $order->status);
        // Finished goods stock restored: 5 + 2 = 7
        $this->assertEquals(7, (int) $vase->stock);
        // BOM supply restored: 10 + (2 qty * 2 per vase) = 14 liters!
        $this->assertEquals(14, (int) $clay->quantity);
        // Discount promo_sold decremented deterministically: 3 - 2 = 1
        $this->assertEquals(1, (int) $discount->promo_sold);
    }

    /**
     * Phase 5: Expire Sponsorships Updates SponsorshipRequest Status
     */
    public function test_phase5_expire_sponsorships_marks_requests_expired(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Sponsored Pot',
            'sku' => 'SPON-POT-01',
            'category' => 'Pottery',
            'stock' => 5,
            'price' => 500,
            'is_sponsored' => true,
            'sponsored_until' => now()->subDay(),
            'status' => 'approved',
        ]);

        $request = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'approved',
            'daily_budget' => 100,
            'duration_days' => 7,
            'total_cost' => 700,
        ]);

        Artisan::call('sponsorships:expire');

        $product->refresh();
        $request->refresh();

        $this->assertFalse((bool) $product->is_sponsored);
        $this->assertSame('expired', $request->status);
    }

    /**
     * Phase 5: Staff Attendance Plain Language Exceptions
     */
    public function test_phase5_staff_attendance_enforces_plain_language(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Juan Driver',
            'role' => 'Logistics & Driver',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
            'allow_remote_clock_in' => false,
        ]);

        $staffUser = User::factory()->staff($seller)->create([
            'name' => $employee->name,
            'employee_id' => $employee->id,
        ]);

        $location = SellerLocation::create([
            'user_id' => $seller->id,
            'name' => 'Main Ceramic Studio',
            'address' => 'Dasmarinas Cavite',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'radius_meters' => 100,
            'enforce_strict_geofence' => true,
            'is_active' => true,
        ]);

        $attendanceService = app(StaffAttendanceService::class);

        // 1. Test Store Location Exception (far from studio)
        try {
            $attendanceService->ensureClockedIn($staffUser, [
                'latitude' => 14.5000,
                'longitude' => 121.0000,
            ]);
            $this->fail('Expected location ValidationException');
        } catch (ValidationException $e) {
            $errorMessage = $e->errors()['location'][0] ?? '';
            $this->assertStringContainsString('Store location enforcement', $errorMessage);
            $this->assertStringNotContainsString('Strict geofence', $errorMessage);
        }

        // 2. Test Email Security Code Exception
        try {
            $attendanceService->ensureClockedIn($staffUser, [
                'latitude' => 14.3294,
                'longitude' => 120.9367,
                'otp_code' => '999999', // Invalid code
            ]);
            $this->fail('Expected otp_code ValidationException');
        } catch (ValidationException $e) {
            $errorMessage = $e->errors()['otp_code'][0] ?? '';
            $this->assertStringContainsString('Email Security Code', $errorMessage);
            $this->assertStringNotContainsString('OTP', $errorMessage);
        }
    }

    /**
     * Phase 2 Edge Case: Stale pre-completion delivery warranty does not block dispute after completion
     */
    public function test_phase2_stale_delivery_warranty_does_not_block_dispute_after_completion(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Order was delivered 2 days ago, stale warranty_expires_at is from yesterday,
        // but order was completed today (received_at is today).
        $order = Order::create([
            'order_number' => 'ORD-DISPUTE-STALE-01',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'delivered_at' => now()->subDays(2),
            'warranty_expires_at' => now()->subDay(), // Stale delivery warranty
            'received_at' => now()->subHours(2),       // Completed 2 hours ago
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'total_amount' => 800.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '789 Pine Rd',
        ]);

        $disputeAction = app(BuyerInitiateDispute::class);
        $photo = UploadedFile::fake()->image('crack.jpg');

        $disputeAction->execute(
            orderId: (string) $order->id,
            reason: 'Item has internal structural crack discovered upon unboxing.',
            proofPhotos: [$photo],
            buyerId: $buyer->id
        );

        $this->assertDatabaseHas('disputes', [
            'order_id' => $order->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Phase 3 Edge Case: Admin arbitrate refund resolves payment_id from session if empty on order
     */
    public function test_phase3_admin_arbitrate_refund_resolves_payment_id_from_session_if_empty(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Order has paymongo_session_id but payment_id was not yet stored
        $order = Order::create([
            'order_number' => 'ORD-PAYMONGO-SESSION-01',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Completed',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'paymongo_session_id' => 'cs_test_session_audit_resolve_777',
            'payment_id' => null, // Intentionally null
            'total_amount' => 2500.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Pine St',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'reason' => 'Completely shattered ceramics',
            'proof_photos' => ['disputes/broken.jpg'],
            'status' => 'escalated',
        ]);

        // Mock PayMongoService to expect retrieveCheckoutSession then createRefund
        $payMongoMock = Mockery::mock(PayMongoService::class);
        $payMongoMock->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_session_audit_resolve_777')
            ->andReturn([
                'id' => 'cs_test_session_audit_resolve_777',
                'attributes' => [
                    'payments' => [
                        [
                            'id' => 'pay_resolved_from_session_888',
                            'status' => 'paid',
                        ]
                    ]
                ]
            ]);

        $payMongoMock->shouldReceive('createRefund')
            ->once()
            ->withArgs(function ($paymentId, $amountInCents, $reason, $notes) {
                return $paymentId === 'pay_resolved_from_session_888'
                    && $amountInCents === 250000;
            })
            ->andReturn([
                'id' => 'ref_test_resolved_888',
                'status' => 'success',
            ]);

        $this->app->instance(PayMongoService::class, $payMongoMock);

        $this->actingAs($admin);
        app(AdminArbitrateDispute::class)->execute(
            disputeId: $dispute->id,
            decision: 'refund',
            adminNotes: 'Package completely destroyed during transit. Issuing full refund.',
            actor: $admin
        );

        $order->refresh();
        $this->assertSame('Refunded', $order->status);
        $this->assertSame('pay_resolved_from_session_888', $order->payment_id);
    }

    /**
     * Phase 4 Edge Case: BOM restoration synchronizes linked supply product stock
     */
    public function test_phase4_bom_restoration_synchronizes_linked_supply_product_stock(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        // Supply tracked as product
        $supply = Supply::create([
            'user_id' => $seller->id,
            'name' => 'Raw Terracotta Clay',
            'category' => 'Raw Materials',
            'quantity' => 10,
            'unit' => 'kg',
            'unit_price' => 100,
        ]);

        $supplyProduct = Product::create([
            'user_id' => $seller->id,
            'name' => 'Raw Terracotta Clay (Retail)',
            'sku' => 'SUPPLY-CLAY-01',
            'category' => 'Raw Materials',
            'track_as_supply' => true,
            'stock' => 10,
            'price' => 150,
            'status' => 'approved',
        ]);
        $supply->update(['product_id' => $supplyProduct->id]);

        $pot = Product::create([
            'user_id' => $seller->id,
            'name' => 'Artisan Pot',
            'sku' => 'POT-BOM-SYNC-01',
            'category' => 'Pottery',
            'production_method' => 'manufactured',
            'stock' => 2,
            'price' => 500,
            'status' => 'approved',
        ]);

        ProductRecipe::create([
            'product_id' => $pot->id,
            'supply_id' => $supply->id,
            'quantity_required' => 3,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-BOM-SYNC-01',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Ready for Pickup',
            'payment_method' => 'COD',
            'total_amount' => 1000.00,
            'shipping_method' => 'Pick Up',
            'shipping_address' => 'Pick Up at Studio',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $pot->id,
            'product_name' => $pot->name,
            'quantity' => 2,
            'price' => 500.00,
            'cost' => 200.00,
        ]);

        // Cancel order
        app(UpdateOrderStatus::class)->execute($order, ['status' => 'Cancelled'], $seller, null);

        $supply->refresh();
        $supplyProduct->refresh();

        // 10 initial + (2 pots * 3 kg) = 16 kg
        $this->assertEquals(16, (int) $supply->quantity);
        // Linked product stock must also be synced to 16
        $this->assertEquals(16, (int) $supplyProduct->stock);
    }

    /**
     * Phase 5 Edge Case: Replacement preserves in-house delivery provider even after delivery row deletion
     */
    public function test_phase5_approve_order_replacement_respects_in_house_driver_after_delivery_deletion(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Handmade Plate',
            'sku' => 'PLATE-INHOUSE-01',
            'category' => 'Tableware',
            'stock' => 10,
            'price' => 400.00,
            'status' => 'approved',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-INHOUSE-REPLACE-01',
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'status' => 'Refund/Return',
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Studio Rd',
            'total_amount' => 800.00,
            'payment_method' => 'COD',
            'payment_status' => 'paid',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'price' => 400.00,
            'cost' => 200.00,
        ]);

        // In-house delivery record initially created
        OrderDelivery::create([
            'order_id' => $order->id,
            'seller_owner_id' => $seller->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_COMPLETED,
            'recipient_name' => $buyer->name,
            'recipient_phone' => '09123456789',
            'delivery_address' => '456 Studio Rd',
        ]);

        // Execute ApproveOrderReplacement
        $action = app(ApproveOrderReplacement::class);
        $result = $action->execute(
            order: $order,
            resolutionDescription: 'Sending replacement batch via studio driver.',
            actor: $seller
        );

        $this->assertSame('Replacement approved. Buyer notified. Dispatch replacement via your studio drivers.', $result);
    }
}
