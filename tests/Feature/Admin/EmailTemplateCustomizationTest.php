<?php

namespace Tests\Feature\Admin;

use App\Models\EmailTemplate;
use App\Models\Order;
use App\Models\User;
use App\Mail\ArtisanApproved;
use App\Mail\OrderPlaced;
use App\Mail\OrderShipped;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailTemplateCustomizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_20_system_templates_are_seeded_in_database(): void
    {
        $expectedSlugs = [
            'verify_email',
            'reset_password',
            'artisan_approved',
            'artisan_rejected',
            'artisan_new_application',
            'product_moderation',
            'sponsorship_status',
            'low_stock',
            'order_placed',
            'order_accepted',
            'order_shipped',
            'order_delivered',
            'order_cancelled',
            'refund_processed',
            'return_requested',
            'return_rejected',
            'dispute_escalated',
            'dispute_arbitrated',
            'review_reminder',
            'shipment_reminder',
        ];

        foreach ($expectedSlugs as $slug) {
            $this->assertDatabaseHas('email_templates', [
                'slug' => $slug,
                'category' => 'system',
            ]);
        }
    }

    public function test_customized_artisan_approved_template_updates_dispatched_email_content(): void
    {
        $template = EmailTemplate::where('slug', 'artisan_approved')->first();
        $template->update([
            'subject' => 'CUSTOM SUBJECT: Welcome Seller {user_name}',
            'body' => 'CUSTOM BODY: Your shop {shop_name} is 100% active!',
        ]);

        /** @var User $artisan */
        $artisan = User::factory()->create([
            'name' => 'Jose Rizal',
            'shop_name' => 'Laguna Handicrafts',
        ]);

        $mailable = new ArtisanApproved($artisan);
        $mailable->build();

        $this->assertEquals('CUSTOM SUBJECT: Welcome Seller Jose Rizal', $mailable->subject);
        $rendered = $mailable->render();
        $this->assertStringContainsString('CUSTOM BODY: Your shop Laguna Handicrafts is 100% active!', $rendered);
    }

    public function test_customized_order_shipped_template_updates_dispatched_email_content(): void
    {
        $template = EmailTemplate::where('slug', 'order_shipped')->first();
        $template->update([
            'subject' => 'SPECIAL DISPATCH: Order #{order_number} En Route!',
            'body' => 'Tracking code is {tracking_number} for customer {user_name}',
        ]);

        /** @var User $buyer */
        $buyer = User::factory()->create(['name' => 'Maria Clara']);
        /** @var User $seller */
        $seller = User::factory()->create(['role' => 'artisan']);

        $order = Order::create([
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'seller_id' => $seller->id,
            'customer_name' => 'Maria Clara',
            'order_number' => 'ORD-99999',
            'shipping_address' => 'Manila, Philippines',
            'status' => 'shipped',
            'total_amount' => 1250.00,
            'tracking_number' => 'TRACK-LK-888',
        ]);

        $mailable = new OrderShipped($order);
        $mailable->build();

        $this->assertEquals('SPECIAL DISPATCH: Order #ORD-99999 En Route!', $mailable->subject);
        $rendered = $mailable->render();
        $this->assertStringContainsString('Tracking code is TRACK-LK-888 for customer Maria Clara', $rendered);
    }

    public function test_customized_verify_email_notification_updates_dispatched_email_content(): void
    {
        $template = EmailTemplate::where('slug', 'verify_email')->first();
        $template->update([
            'subject' => 'CUSTOM VERIFY: Enter {verification_code}',
            'body' => 'Hello {user_name}, your custom code is {verification_code}',
        ]);

        /** @var User $user */
        $user = User::factory()->create(['name' => 'Andres Bonifacio']);
        $notification = new VerifyEmailNotification('777999', now()->addMinutes(15));
        
        $mailable = $notification->toMail($user);
        $this->assertEquals('CUSTOM VERIFY: Enter 777999', $mailable->subject);
    }
}
