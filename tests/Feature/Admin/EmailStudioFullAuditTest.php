<?php

namespace Tests\Feature\Admin;

use App\Models\EmailTemplate;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Mail\LowStockAlert;
use App\Mail\OrderAccepted;
use App\Mail\OrderCancelled;
use App\Mail\OrderDelivered;
use App\Mail\OrderPlaced;
use App\Mail\OrderShipped;
use App\Mail\ProductModerationResult;
use App\Mail\RefundProcessed;
use App\Mail\ReturnRequestRejected;
use App\Mail\ReturnRequested;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailStudioFullAuditTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test 1: Editing existing system templates strictly updates dispatched email contents.
     */
    public function test_editing_system_templates_strictly_updates_dispatched_emails(): void
    {
        // 1. Verify Email
        $verifyTemplate = EmailTemplate::where('slug', 'verify_email')->first();
        $this->assertNotNull($verifyTemplate);
        $verifyTemplate->update([
            'subject' => 'SECURITY CODE: {verification_code}',
            'body' => 'Hello {user_name}, enter {verification_code} to verify at {site_name}.',
        ]);

        $user = User::factory()->create(['name' => 'Emilio Aguinaldo']);
        $notification = new VerifyEmailNotification('998877', now()->addMinutes(10));
        $mailable = $notification->toMail($user);
        $this->assertEquals('SECURITY CODE: 998877', $mailable->subject);

        // 2. Artisan Approved
        $approvedTemplate = EmailTemplate::where('slug', 'artisan_approved')->first();
        $approvedTemplate->update([
            'subject' => 'CONGRATS {user_name}: {shop_name} IS APPROVED!',
            'body' => 'Welcome {user_name} to LikhangKamay! Your shop {shop_name} is active.',
        ]);

        $artisan = User::factory()->create(['name' => 'Juan Luna', 'shop_name' => 'Spoliarium Art Studio']);
        $mailableApprove = new ArtisanApproved($artisan);
        $mailableApprove->build();
        $this->assertEquals('CONGRATS Juan Luna: Spoliarium Art Studio IS APPROVED!', $mailableApprove->subject);
        $renderedApprove = $mailableApprove->render();
        $this->assertStringContainsString('Welcome Juan Luna to LikhangKamay! Your shop Spoliarium Art Studio is active.', $renderedApprove);

        // 3. Order Shipped
        $shippedTemplate = EmailTemplate::where('slug', 'order_shipped')->first();
        $shippedTemplate->update([
            'subject' => 'TRACKING #{tracking_number} FOR ORDER #{order_number}',
            'body' => 'Hi {user_name}, your package from {shop_name} shipped under {tracking_number}.',
        ]);

        $buyer = User::factory()->create(['name' => 'Gregoria de Jesus']);
        $seller = User::factory()->create(['role' => 'artisan', 'shop_name' => 'Caloocan Crafts']);
        $order = Order::create([
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'seller_id' => $seller->id,
            'customer_name' => 'Gregoria de Jesus',
            'order_number' => 'ORD-777111',
            'shipping_address' => 'Caloocan, Philippines',
            'status' => 'shipped',
            'total_amount' => 890.00,
            'tracking_number' => 'TRACK-CAL-55',
        ]);

        $mailableShipped = new OrderShipped($order);
        $mailableShipped->build();
        $this->assertEquals('TRACKING #TRACK-CAL-55 FOR ORDER #ORD-777111', $mailableShipped->subject);
        $renderedShipped = $mailableShipped->render();
        $this->assertStringContainsString('Hi Gregoria de Jesus, your package from Caloocan Crafts shipped under TRACK-CAL-55.', $renderedShipped);
    }

    /**
     * Test 2: Creating a new custom email template via API stores it cleanly.
     */
    public function test_super_admin_can_create_and_manage_new_custom_template(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        $payload = [
            'name' => 'Holiday Promotion Announcement',
            'subject' => 'Special Holiday Handcrafted Sales on {site_name}',
            'headline' => 'Holiday Festival Sale',
            'body' => 'Hello {user_name}, check out special discounts from artisan shops like {shop_name}!',
            'button_label' => 'Shop Holiday Collection',
            'button_url' => '{action_url}',
            'category' => 'custom',
        ];

        $response = $this->actingAs($admin)
            ->postJson(route('admin.email-templates.store'), $payload);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('template.name', 'Holiday Promotion Announcement');

        $this->assertDatabaseHas('email_templates', [
            'name' => 'Holiday Promotion Announcement',
            'category' => 'custom',
        ]);
    }

    /**
     * Test 3: Audience Broadcast dispatch to role groups & specific users works smoothly.
     */
    public function test_super_admin_can_dispatch_broadcast_to_user_and_role_groups(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $buyer = User::factory()->create(['name' => 'Marcelo H. del Pilar', 'email' => 'marcelo@example.com']);

        // Dispatch to specific user
        $userBroadcastPayload = [
            'target_type' => 'user',
            'target_user_id' => $buyer->id,
            'subject' => 'Personal Broadcast Notice',
            'headline' => 'Important Message',
            'body' => 'Hello {user_name}, your account is active on {site_name}.',
            'button_label' => 'View Account',
            'button_url' => '{action_url}',
        ];

        $res1 = $this->actingAs($admin)
            ->postJson(route('admin.email-templates.dispatch'), $userBroadcastPayload);

        $res1->assertStatus(200);
        $res1->assertJsonPath('success', true);
        $res1->assertJsonPath('dispatched_count', 1);

        // Dispatch to role group
        $roleBroadcastPayload = [
            'target_type' => 'role',
            'target_role' => 'all_buyers',
            'subject' => 'Platform Newsletter for Buyers',
            'headline' => 'Monthly Highlights',
            'body' => 'Hello {user_name}, explore top handcrafted creations.',
        ];

        $res2 = $this->actingAs($admin)
            ->postJson(route('admin.email-templates.dispatch'), $roleBroadcastPayload);

        $res2->assertStatus(200);
        $res2->assertJsonPath('success', true);
        $this->assertGreaterThanOrEqual(1, $res2->json('dispatched_count'));
    }
}
