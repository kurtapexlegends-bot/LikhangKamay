<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderReceiptAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $otherBuyer;
    private User $artisan;
    private User $otherArtisan;
    private User $admin;
    private Order $order;
    private Payout $payout;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Clara',
            'email' => 'maria@example.com',
            'email_verified_at' => now(),
        ]);

        $this->otherBuyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Crisostomo Ibarra',
            'email' => 'ibarra@example.com',
            'email_verified_at' => now(),
        ]);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Kapitan Tiago',
            'shop_name' => 'Tiago Pottery Works',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->otherArtisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Elias Craft',
            'shop_name' => 'Elias Workshop',
            'artisan_status' => 'approved',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
        ]);

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'name' => 'Super Administrator',
            'email' => 'admin@likhangkamay.com',
            'email_verified_at' => now(),
        ]);

        $product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'sku' => 'PLT-001',
            'category' => 'Pottery',
            'name' => 'Handmade Terra Cotta Planter',
            'price' => 450,
            'stock' => 10,
        ]);

        $this->order = Order::create([
            'order_number' => 'ORD-TEST-001',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'shipping_method' => 'Delivery',
            'shipping_address' => '123 Calle Real, Dasmarinas, Cavite',
            'shipping_contact_phone' => '09171234567',
            'payment_method' => 'Maya',
            'payment_status' => 'paid',
            'status' => 'Accepted',
            'merchandise_subtotal' => 450.00,
            'shipping_fee_amount' => 50.00,
            'convenience_fee_amount' => 15.00,
            'total_amount' => 515.00,
            'seller_net_amount' => 450.00,
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'quantity' => 1,
            'price' => 450.00,
        ]);

        $this->payout = Payout::create([
            'user_id' => $this->artisan->id,
            'amount' => 2500.00,
            'payout_method' => 'Maya',
            'payout_account_name' => 'Kapitan Tiago',
            'payout_account_number' => '09181234567',
            'reference_number' => 'MYA-REF-884920',
            'status' => 'Completed',
        ]);
    }

    public function test_buyer_can_view_own_order_receipt(): void
    {
        $response = $this->actingAs($this->buyer)->get(route('my-orders.receipt', $this->order->id));

        $response->assertOk();
        $response->assertSee('LikhangKamay');
        $response->assertSee('Official E-Commerce Order Receipt');
        $response->assertSee('ORD-TEST-001');
        $response->assertSee('Maya');
        $response->assertSee('Handmade Terra Cotta Planter');
    }

    public function test_buyer_cannot_view_foreign_order_receipt(): void
    {
        $response = $this->actingAs($this->otherBuyer)->get(route('my-orders.receipt', $this->order->id));

        $response->assertNotFound();
    }

    public function test_artisan_can_view_own_shop_order_receipt(): void
    {
        $response = $this->actingAs($this->artisan)->get(route('orders.receipt', $this->order->id));

        $response->assertOk();
        $response->assertSee('ORD-TEST-001');
        $response->assertSee('Tiago Pottery Works');
    }

    public function test_artisan_cannot_view_foreign_shop_order_receipt(): void
    {
        $response = $this->actingAs($this->otherArtisan)->get(route('orders.receipt', $this->order->id));

        $response->assertNotFound();
    }

    public function test_admin_can_view_payout_disbursement_voucher(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.payouts.voucher', $this->payout->id));

        $response->assertOk();
        $response->assertSee('Official Payout Disbursement Voucher');
        $response->assertSee('MYA-REF-884920');
        $response->assertSee('2,500.00');
        $response->assertSee('Tiago Pottery Works');
    }

    public function test_recipient_artisan_can_view_own_payout_voucher(): void
    {
        $response = $this->actingAs($this->artisan)->get(route('seller.payouts.voucher', $this->payout->id));

        $response->assertOk();
        $response->assertSee('Official Payout Disbursement Voucher');
        $response->assertSee('MYA-REF-884920');
    }

    public function test_foreign_artisan_cannot_view_another_artisans_payout_voucher(): void
    {
        $response = $this->actingAs($this->otherArtisan)->get(route('seller.payouts.voucher', $this->payout->id));

        $response->assertForbidden();
    }
}
