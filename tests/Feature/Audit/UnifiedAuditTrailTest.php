<?php

namespace Tests\Feature\Audit;

use App\Actions\Admin\Users\ApproveArtisan;
use App\Actions\Admin\Users\RejectArtisan;
use App\Models\Order;
use App\Models\PlatformActivity;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnifiedAuditTrailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $artisan;
    private User $buyer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'name' => 'Admin Controller',
            'email' => 'admin@likhangkamay.com',
            'email_verified_at' => now(),
        ]);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Artisan Juan',
            'shop_name' => 'Juan Potteries',
            'artisan_status' => 'pending',
            'email_verified_at' => now(),
            'business_permit' => 'permit.pdf',
            'dti_registration' => 'dti.pdf',
            'valid_id' => 'id.png',
            'tin_id' => 'tin.png',
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Buyer Maria',
            'email' => 'maria@likhangkamay.com',
            'email_verified_at' => now(),
        ]);
    }

    public function test_artisan_approval_records_standardized_audit_activity(): void
    {
        // Simulate viewing all required review documents in session
        session([
            "artisan_review_docs_{$this->artisan->id}" => [
                'business_permit',
                'dti_registration',
                'valid_id',
                'tin_id',
            ],
        ]);

        $action = app(ApproveArtisan::class);
        $this->actingAs($this->admin);
        $action->execute($this->artisan->id, $this->admin->id);

        $activity = PlatformActivity::forSubject(User::class, $this->artisan->id)->first();

        $this->assertNotNull($activity);
        $this->assertEquals('artisan.approved', $activity->action);
        $this->assertEquals($this->admin->id, $activity->user_id);
        $this->assertEquals('pending', $activity->metadata['diff']['before']['artisan_status']);
        $this->assertEquals('approved', $activity->metadata['diff']['after']['artisan_status']);
    }

    public function test_artisan_rejection_records_standardized_audit_activity(): void
    {
        $action = app(RejectArtisan::class);
        $this->actingAs($this->admin);
        $action->execute($this->artisan->id, 'Missing clear DTI permit stamp');

        $activity = PlatformActivity::forSubject(User::class, $this->artisan->id)->first();

        $this->assertNotNull($activity);
        $this->assertEquals('artisan.rejected', $activity->action);
        $this->assertEquals($this->admin->id, $activity->user_id);
        $this->assertEquals('Missing clear DTI permit stamp', $activity->metadata['diff']['after']['reason']);
    }

    public function test_order_status_transition_triggers_audit_observer(): void
    {
        $this->artisan->update(['artisan_status' => 'approved']);

        $product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'sku' => 'AUD-TEST-001',
            'category' => 'Pottery',
            'name' => 'Audit Test Pot',
            'price' => 300,
            'stock' => 5,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-AUD-100',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'status' => 'Pending',
            'merchandise_subtotal' => 300.00,
            'shipping_fee_amount' => 45.00,
            'convenience_fee_amount' => 10.00,
            'total_amount' => 355.00,
            'seller_net_amount' => 300.00,
        ]);

        // Transition order status
        $this->actingAs($this->artisan);
        $order->update(['status' => 'Accepted']);

        $activity = PlatformActivity::forSubject(Order::class, $order->id)
            ->where('action', 'order.status_changed')
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals('Pending', $activity->metadata['diff']['before']['status']);
        $this->assertEquals('Accepted', $activity->metadata['diff']['after']['status']);
    }

    public function test_admin_can_fetch_subject_activity_history(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-AUD-200',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'status' => 'Accepted',
            'merchandise_subtotal' => 200.00,
            'shipping_fee_amount' => 0.00,
            'convenience_fee_amount' => 0.00,
            'total_amount' => 200.00,
            'seller_net_amount' => 200.00,
        ]);

        $order->update(['status' => 'Shipped']);

        $response = $this->actingAs($this->admin)->getJson(route('admin.operations.subject-history', [
            'subject_type' => Order::class,
            'subject_id' => $order->id,
        ]));

        $response->assertOk();
        $response->assertJsonStructure([
            'activities' => [
                '*' => ['id', 'action', 'description', 'metadata', 'created_at', 'user']
            ]
        ]);
        $this->assertCount(1, $response->json('activities'));
    }

    public function test_payout_disbursement_records_audit_activity(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        $this->artisan->update([
            'artisan_status' => 'approved',
        ]);

        Order::create([
            'order_number' => 'ORD-AUD-PAYOUT-01',
            'artisan_id' => $this->artisan->id,
            'user_id' => $this->buyer->id,
            'customer_name' => $this->buyer->name,
            'status' => 'Completed',
            'payment_method' => 'Maya',
            'payment_status' => 'paid',
            'total_amount' => 2000.00,
            'seller_net_amount' => 2000.00,
            'merchandise_subtotal' => 2000.00,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.payouts.store'), [
            'user_id' => $this->artisan->id,
            'amount' => 1500.00,
            'payout_method' => 'Maya',
            'payout_account_name' => 'Artisan Juan',
            'payout_account_number' => '09191234567',
            'reference_number' => 'MYA-TXN-998877',
        ]);

        $response->assertSessionHasNoErrors();

        $activity = PlatformActivity::where('action', 'payout.disbursed')
            ->where('user_id', $this->admin->id)
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals(1500.00, $activity->metadata['diff']['amount']);
        $this->assertEquals('Maya', $activity->metadata['diff']['payout_method']);
        $this->assertEquals('MYA-TXN-998877', $activity->metadata['diff']['reference_number']);
    }
}
