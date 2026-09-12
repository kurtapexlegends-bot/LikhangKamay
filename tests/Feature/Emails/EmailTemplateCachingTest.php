<?php

namespace Tests\Feature\Emails;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Mail\BuyerOrderConfirmationMail;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class EmailTemplateCachingTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_template_is_cached_and_invalidated_on_save(): void
    {
        Cache::flush();

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'superadmin@likhangkamay.test',
        ]);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Artisan Maker',
            'shop_name' => 'Artisan Crafts',
        ]);

        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Clay Vase',
            'sku' => 'SKU-VASE-001',
            'category' => 'Pottery',
            'stock' => 10,
            'price' => 500,
        ]);

        $order = Order::create([
            'order_number' => 'LK-ORD-CACHE-001',
            'customer_name' => 'Customer Jane',
            'shipping_recipient_name' => 'Customer Jane',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Courier',
            'user_id' => $artisan->id,
            'artisan_id' => $artisan->id,
            'total_amount' => 500,
            'status' => 'pending',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Clay Vase',
            'quantity' => 1,
            'price' => 500,
        ]);

        $template = EmailTemplate::updateOrCreate(
            ['slug' => 'buyer_order_confirmation'],
            [
                'name' => 'Buyer Order Confirmation',
                'subject' => 'Original Subject #{order_number}',
                'headline' => 'Original Headline',
                'body' => 'Original Body {order_number}',
                'category' => 'system',
                'is_active' => true,
            ]
        );

        // 1. Initial render populates cache
        $this->assertFalse(Cache::has('email_template_buyer_order_confirmation'));
        $mailable = new BuyerOrderConfirmationMail($order);
        $mailable->render();
        $this->assertTrue(Cache::has('email_template_buyer_order_confirmation'));

        // 2. Admin saves updated template via EmailStudioController
        $response = $this->actingAs($admin)->postJson(route('admin.email-templates.store'), [
            'id' => $template->id,
            'name' => 'Buyer Order Confirmation',
            'subject' => 'Updated Subject #{order_number}',
            'headline' => 'Updated Headline',
            'body' => 'Updated Body {order_number}',
            'category' => 'system',
        ]);

        $response->assertOk();

        // Cache must have been invalidated!
        $this->assertFalse(Cache::has('email_template_buyer_order_confirmation'));

        // Next render must reflect the updated template
        $updatedMailable = new BuyerOrderConfirmationMail($order);
        $html = $updatedMailable->render();
        $this->assertStringContainsString('Updated Headline', $html);
        $this->assertTrue(Cache::has('email_template_buyer_order_confirmation'));
    }

    public function test_handle_inertia_requests_evaluates_with_micro_caching(): void
    {
        Cache::flush();

        $user = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Test Buyer',
        ]);

        $response = $this->actingAs($user)->get('/');
        $response->assertOk();

        // Cached keys should now be present
        $this->assertTrue(Cache::has("user_{$user->id}_unread_notif_count"));
        $this->assertTrue(Cache::has("user_{$user->id}_unread_msg_count"));
    }
}
