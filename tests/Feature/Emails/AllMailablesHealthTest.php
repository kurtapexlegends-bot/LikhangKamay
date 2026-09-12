<?php

namespace Tests\Feature\Emails;

use App\Mail\ArtisanApplicationReceivedMail;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Mail\BuyerOrderConfirmationMail;
use App\Mail\CustomDynamicMail;
use App\Mail\DisputeArbitratedSellerWins;
use App\Mail\DisputeEscalated;
use App\Mail\LowStockAlert;
use App\Mail\NewArtisanApplication;
use App\Mail\OrderAccepted;
use App\Mail\OrderCancelled;
use App\Mail\OrderDelivered;
use App\Mail\OrderPlaced;
use App\Mail\OrderShipped;
use App\Mail\PaymentReceiptMail;
use App\Mail\PayoutDisbursedMail;
use App\Mail\ProductModerationResult;
use App\Mail\RefundProcessed;
use App\Mail\ReturnRequestRejected;
use App\Mail\ReturnRequested;
use App\Mail\ReviewReminder;
use App\Mail\ShipmentReminder;
use App\Mail\SponsorshipStatusUpdated;
use App\Mail\StaffClockInOtpMail;
use App\Mail\StaffWelcomeInviteMail;
use App\Mail\SubscriptionBillingReceiptMail;
use App\Models\EmailTemplate;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Notifications\LowStockNotification;
use App\Notifications\PayoutDisbursedNotification;
use App\Notifications\ProductModerationNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\SponsorshipStatusNotification;
use App\Notifications\UserDisciplinaryNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AllMailablesHealthTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private User $buyer;
    private User $staff;
    private Order $order;
    private Product $product;
    private Payout $payout;
    private SponsorshipRequest $sponsorship;
    private SubscriptionTransaction $subTx;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Artisan Juan',
            'shop_name' => 'Juan Pottery Studio',
            'email' => 'juan@artisan.test',
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Clara',
            'email' => 'maria@buyer.test',
        ]);

        $this->staff = User::factory()->create([
            'role' => 'artisan_staff',
            'name' => 'Pedro Associate',
            'email' => 'pedro@studio.test',
        ]);

        $this->product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Handcrafted Clay Mug',
            'sku' => 'SKU-MUG-001',
            'category' => 'Pottery',
            'stock' => 5,
            'price' => 350.00,
        ]);

        $this->order = Order::create([
            'order_number' => 'LK-ORD-ALL-1001',
            'customer_name' => 'Maria Clara',
            'shipping_recipient_name' => 'Maria Clara',
            'shipping_address' => '77 Cavite St, Dasmarinas, Cavite',
            'shipping_method' => 'Standard Delivery',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'total_amount' => 700.00,
            'status' => 'pending',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'PAY-ALL-1001',
            'cancellation_reason' => 'Buyer changed mind',
            'return_reason' => 'Item defective',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => 'Handcrafted Clay Mug',
            'quantity' => 2,
            'price' => 350.00,
        ]);

        $this->payout = Payout::create([
            'user_id' => $this->artisan->id,
            'amount' => 2500.00,
            'status' => 'completed',
            'payout_method' => 'GCash',
            'payout_account_name' => 'Artisan Juan',
            'payout_account_number' => '09171234567',
            'reference_number' => 'PAYOUT-REF-889',
        ]);

        $this->sponsorship = SponsorshipRequest::create([
            'user_id' => $this->artisan->id,
            'product_id' => $this->product->id,
            'status' => 'approved',
            'rejection_reason' => null,
            'days' => 7,
            'amount_paid' => 199.00,
            'approved_at' => now(),
            'starts_at' => now(),
            'expires_at' => now()->addDays(7),
        ]);

        $this->subTx = SubscriptionTransaction::create([
            'user_id' => $this->artisan->id,
            'amount' => 499.00,
            'tier' => 'premium',
            'status' => 'paid',
            'reference_number' => 'SUB-TX-551',
        ]);
    }

    /**
     * Build all 26 Mailable instances.
     *
     * @return array<\Illuminate\Mail\Mailable>
     */
    private function getAllMailables(): array
    {
        return [
            'BuyerOrderConfirmationMail' => new BuyerOrderConfirmationMail($this->order),
            'OrderPlaced' => new OrderPlaced($this->order),
            'OrderAccepted' => new OrderAccepted($this->order),
            'OrderShipped' => new OrderShipped($this->order),
            'OrderDelivered' => new OrderDelivered($this->order),
            'OrderCancelled' => new OrderCancelled($this->order),
            'ShipmentReminder' => new ShipmentReminder($this->order),
            'ReviewReminder' => new ReviewReminder($this->order),
            'ReturnRequested' => new ReturnRequested($this->order),
            'ReturnRequestRejected' => new ReturnRequestRejected($this->order),
            'RefundProcessed' => new RefundProcessed($this->order, 700.00),
            'PaymentReceiptMail' => new PaymentReceiptMail($this->order),
            'PayoutDisbursedMail' => new PayoutDisbursedMail($this->payout, $this->artisan),
            'ArtisanApplicationReceivedMail' => new ArtisanApplicationReceivedMail($this->artisan),
            'NewArtisanApplication' => new NewArtisanApplication($this->artisan),
            'ArtisanApproved' => new ArtisanApproved($this->artisan),
            'ArtisanRejected' => new ArtisanRejected($this->artisan),
            'ProductModerationResult' => new ProductModerationResult($this->product, 'approved'),
            'LowStockAlert' => new LowStockAlert($this->product),
            'SponsorshipStatusUpdated' => new SponsorshipStatusUpdated($this->sponsorship),
            'SubscriptionBillingReceiptMail' => new SubscriptionBillingReceiptMail($this->artisan, $this->subTx, 'Premium', 499.00),
            'StaffWelcomeInviteMail' => new StaffWelcomeInviteMail($this->staff, null, 'Juan Pottery Studio', 'Staff@2026'),
            'StaffClockInOtpMail' => new StaffClockInOtpMail($this->staff, '892014', 10),
            'DisputeEscalated' => new DisputeEscalated($this->order, 'Item damaged during courier transit'),
            'DisputeArbitratedSellerWins' => new DisputeArbitratedSellerWins($this->order, 'Seller provided valid packaging proof'),
            'CustomDynamicMail' => new CustomDynamicMail(
                subjectText: 'Special Announcement for {user_name}',
                headlineText: 'Platform Notice',
                bodyText: 'Hello {user_name}, welcome to {shop_name}!',
                buttonLabel: 'Learn More',
                buttonUrl: url('/'),
                replacements: ['{user_name}' => 'Maria Clara', '{shop_name}' => 'Juan Pottery Studio']
            ),
        ];
    }

    public function test_all_26_mailables_serialize_and_render_cleanly_for_production_queues(): void
    {
        $mailables = $this->getAllMailables();
        $this->assertCount(26, $mailables, 'Expected exactly 26 mailables to be tested.');

        foreach ($mailables as $name => $mailable) {
            // Test Queueable trait presence
            $traits = class_uses_recursive($mailable);
            $this->assertContains(
                \Illuminate\Bus\Queueable::class,
                $traits,
                "Mailable [{$name}] must use Illuminate\Bus\Queueable for production queue compatibility."
            );
            $this->assertContains(
                \Illuminate\Queue\SerializesModels::class,
                $traits,
                "Mailable [{$name}] must use Illuminate\Queue\SerializesModels."
            );

            // Test PHP serialization round-trip (which Laravel's database queue driver performs)
            $serialized = serialize($mailable);
            $this->assertNotEmpty($serialized, "Serialization failed for mailable [{$name}].");

            /** @var \Illuminate\Mail\Mailable $unserialized */
            $unserialized = unserialize($serialized);
            $this->assertInstanceOf(get_class($mailable), $unserialized);

            // Test render execution
            $html = $unserialized->render();
            $this->assertNotEmpty($html, "Render output was empty for mailable [{$name}].");
            $this->assertStringNotContainsString('Fatal error', $html);
            $this->assertStringNotContainsString('Exception:', $html);
        }
    }

    public function test_all_mailables_render_in_both_dynamic_and_fallback_modes(): void
    {
        // 1. Dynamic Mode (all email_templates is_active = true)
        EmailTemplate::query()->update(['is_active' => true]);
        foreach ($this->getAllMailables() as $name => $mailable) {
            $html = $mailable->render();
            $this->assertNotEmpty($html, "Dynamic render failed for [{$name}].");
        }

        // 2. Fallback Blade View Mode (all email_templates is_active = false)
        EmailTemplate::query()->update(['is_active' => false]);
        foreach ($this->getAllMailables() as $name => $mailable) {
            $html = $mailable->render();
            $this->assertNotEmpty($html, "Fallback render failed for [{$name}].");
        }
    }

    public function test_mail_based_notifications_render_valid_mail_messages(): void
    {
        // 1. VerifyEmailNotification
        $verifyNotif = new VerifyEmailNotification('654321', now()->addMinutes(15));
        $verifyMail = $verifyNotif->toMail($this->buyer);
        $this->assertInstanceOf(\Illuminate\Notifications\Messages\MailMessage::class, $verifyMail);
        $verifyHtml = (string) view($verifyMail->view, $verifyMail->viewData)->render();
        $this->assertStringContainsString('654321', $verifyHtml);

        // 2. ResetPasswordNotification
        $resetNotif = new ResetPasswordNotification('test-token-xyz');
        $resetMail = $resetNotif->toMail($this->buyer);
        $this->assertInstanceOf(\Illuminate\Notifications\Messages\MailMessage::class, $resetMail);
        $resetHtml = (string) view($resetMail->view, $resetMail->viewData)->render();
        $this->assertStringContainsString('test-token-xyz', $resetHtml);

        // 3. UserDisciplinaryNotification
        $discNotif = new UserDisciplinaryNotification('warning', 'Conduct violation review', 3, now()->addDays(3));
        $discMail = $discNotif->toMail($this->buyer);
        $this->assertInstanceOf(\Illuminate\Notifications\Messages\MailMessage::class, $discMail);
        $discHtml = (string) view($discMail->view, $discMail->viewData)->render();
        $this->assertStringContainsString('Conduct violation review', $discHtml);

        // 4. PayoutDisbursedNotification
        $payoutNotif = new PayoutDisbursedNotification($this->payout, $this->artisan);
        $payoutMail = $payoutNotif->toMail($this->artisan);
        $this->assertInstanceOf(PayoutDisbursedMail::class, $payoutMail);
        $payoutHtml = $payoutMail->render();
        $this->assertStringContainsString('2,500.00', $payoutHtml);

        // 5. ProductModerationNotification
        $modNotif = new ProductModerationNotification($this->product, 'approved');
        $modMail = $modNotif->toMail($this->artisan);
        $this->assertInstanceOf(ProductModerationResult::class, $modMail);
        $modHtml = $modMail->render();
        $this->assertStringContainsString('Handcrafted Clay Mug', $modHtml);

        // 6. LowStockNotification
        $lowNotif = new LowStockNotification($this->product);
        $lowMail = $lowNotif->toMail($this->artisan);
        $this->assertInstanceOf(LowStockAlert::class, $lowMail);
        $lowHtml = $lowMail->render();
        $this->assertStringContainsString('Handcrafted Clay Mug', $lowHtml);

        // 7. SponsorshipStatusNotification
        $sponNotif = new SponsorshipStatusNotification($this->sponsorship);
        $sponMail = $sponNotif->toMail($this->artisan);
        $this->assertInstanceOf(SponsorshipStatusUpdated::class, $sponMail);
        $sponHtml = $sponMail->render();
        $this->assertStringContainsString('Handcrafted Clay Mug', $sponHtml);
    }
}
