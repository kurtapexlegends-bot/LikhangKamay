<?php

namespace Tests\Feature\Emails;

use App\Actions\Seller\HR\ProvisionStaffAccount;
use App\Mail\ArtisanApplicationReceivedMail;
use App\Mail\BuyerOrderConfirmationMail;
use App\Mail\PaymentReceiptMail;
use App\Mail\StaffWelcomeInviteMail;
use App\Mail\SubscriptionBillingReceiptMail;
use App\Models\EmailTemplate;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MissingEmailDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_mail_studio_lists_all_five_new_system_templates(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson(route('admin.email-templates.index'));

        $response->assertOk();

        $templates = collect($response->json('templates'));
        $slugs = $templates->pluck('slug')->all();

        $expectedSlugs = [
            'buyer_order_confirmation',
            'artisan_application_received',
            'payment_receipt',
            'subscription_billing_receipt',
            'staff_welcome_invite',
        ];

        foreach ($expectedSlugs as $expectedSlug) {
            $this->assertContains($expectedSlug, $slugs, "Failed asserting that email template [{$expectedSlug}] is returned by Mail Studio.");

            $template = $templates->firstWhere('slug', $expectedSlug);
            $this->assertEquals('system', $template['category']);
            $this->assertTrue((bool) $template['is_active']);
        }
    }

    public function test_buyer_order_confirmation_mailable_rendering_and_placeholders(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Bulacan Pottery Studio',
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Clara',
            'email' => 'buyer-receipt-test@likhangkamay.app',
        ]);

        $order = Order::create([
            'order_number' => 'LK-ORD-88219',
            'customer_name' => 'Maria Clara',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'total_amount' => 2450.00,
            'status' => 'pending',
            'payment_method' => 'GCash (PayMongo)',
            'payment_status' => 'paid',
            'shipping_recipient_name' => 'Maria Clara',
            'shipping_address' => '123 Rizal St, Malolos, Bulacan',
        ]);

        $product = Product::factory()->create([
            'user_id' => $artisan->id,
            'name' => 'Handcrafted Terracotta Planter',
            'sku' => 'SKU-TERRA-101',
            'category' => 'Pottery',
            'price' => 1225.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Handcrafted Terracotta Planter',
            'quantity' => 2,
            'price' => 1225.00,
        ]);

        $order->load(['items.product', 'artisan', 'user']);

        $mailable = new BuyerOrderConfirmationMail($order);
        $rendered = $mailable->render();

        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('LK-ORD-88219', $rendered);
        $this->assertStringContainsString('Bulacan Pottery Studio', $rendered);
    }

    public function test_artisan_application_received_mailable_rendering_and_placeholders(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Diego Silang',
            'shop_name' => 'Ilocos Weaving Hub',
            'email' => 'diego-artisan-test@likhangkamay.app',
        ]);

        $mailable = new ArtisanApplicationReceivedMail($artisan);
        $rendered = $mailable->render();

        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('Ilocos Weaving Hub', $rendered);
        $this->assertStringContainsString('Diego Silang', $rendered);
    }

    public function test_payment_receipt_mailable_rendering_and_placeholders(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Cebu Woodcraft Works',
        ]);

        $buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Juan Sumulong',
            'email' => 'juan-payment-test@likhangkamay.app',
        ]);

        $order = Order::create([
            'order_number' => 'LK-ORD-99100',
            'customer_name' => 'Juan Sumulong',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'total_amount' => 3800.00,
            'status' => 'processing',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_recipient_name' => 'Juan Sumulong',
            'shipping_address' => '456 Mango Ave, Cebu City',
        ]);
        $order->payment_id = 'pay_test_ref_998877';
        $order->save();

        $mailable = new PaymentReceiptMail($order);
        $rendered = $mailable->render();

        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('LK-ORD-99100', $rendered);
        $this->assertStringContainsString('3,800.00', $rendered);
        $this->assertStringContainsString('pay_test_ref_998877', $rendered);
    }

    public function test_subscription_billing_receipt_mailable_rendering_and_placeholders(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'name' => 'Gabriela Silang',
            'shop_name' => 'Gabriela Heritage Crafts',
            'email' => 'gabriela-billing-test@likhangkamay.app',
            'premium_tier' => 'premium',
        ]);

        $mailable = new SubscriptionBillingReceiptMail(
            $artisan,
            null,
            'Premium',
            499.00
        );
        $rendered = $mailable->render();

        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('Premium', $rendered);
        $this->assertStringContainsString('499.00', $rendered);
    }

    public function test_staff_welcome_invite_mailable_rendering_and_placeholders(): void
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Paete Woodcarvers Guild',
        ]);

        $staffUser = User::factory()->create([
            'role' => 'staff',
            'name' => 'Mateo Santos',
            'email' => 'mateo-staff-test@likhangkamay.app',
            'seller_owner_id' => $seller->id,
        ]);

        $mailable = new StaffWelcomeInviteMail(
            $staffUser,
            null,
            $seller->shop_name,
            'TempSecret@2026'
        );
        $rendered = $mailable->render();

        $this->assertNotEmpty($rendered);
        $this->assertStringContainsString('Paete Woodcarvers Guild', $rendered);
        $this->assertStringContainsString('mateo-staff-test@likhangkamay.app', $rendered);
        $this->assertStringContainsString('TempSecret@2026', $rendered);
    }

    public function test_provision_staff_account_dispatches_welcome_email(): void
    {
        Mail::fake();

        $seller = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Bicol Abaca Works',
            'premium_tier' => 'premium',
            'email_verified_at' => now(),
        ]);

        $provisioner = app(ProvisionStaffAccount::class);

        $validated = [
            'name' => 'Staff Member One',
            'email' => 'staffone@gmail.com',
            'default_password' => 'StaffPass@2026!',
            'role' => 'Production Assistant',
            'salary' => 18000,
            'create_login_account' => true,
            'staff_role_preset_key' => 'staff',
            'staff_user_level' => 'staff',
            'staff_access_permission_level' => 'can_view',
            'module_overrides' => [],
        ];

        $result = $provisioner->create(
            $validated,
            ['inventory', 'orders'],
            $seller,
            $seller,
            null
        );

        $this->assertNotNull($result['staffAccount']);

        Mail::assertSent(StaffWelcomeInviteMail::class, function (StaffWelcomeInviteMail $mail) {
            return $mail->hasTo('staffone@gmail.com')
                && $mail->temporaryPassword === 'StaffPass@2026!';
        });
    }

    public function test_subscription_service_dispatches_subscription_billing_receipt_email(): void
    {
        Mail::fake();

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Mindanao Brass Studio',
            'email' => 'artisan-sub@likhangkamay.app',
            'premium_tier' => 'free',
            'email_verified_at' => now(),
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 499.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'reference_number' => 'SUB-TEST-9988',
        ]);

        $service = app(SubscriptionService::class);
        $service->activateSubscription($transaction);

        Mail::assertSent(SubscriptionBillingReceiptMail::class, function (SubscriptionBillingReceiptMail $mail) use ($artisan) {
            return $mail->hasTo($artisan->email)
                && $mail->tierLabel === 'Premium';
        });
    }

    public function test_artisan_setup_dispatches_application_received_email(): void
    {
        Mail::fake();

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'email' => 'applicant-received@likhangkamay.app',
            'shop_name' => 'Cordillera Weavers',
            'street_address' => 'Session Road',
            'city' => 'Baguio City',
            'region' => 'CAR',
            'zip_code' => '2600',
            'barangay' => 'Session',
            'phone_number' => '09123456789',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($artisan)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'gcash',
            'payout_account_name' => 'Cordillera Weavers',
            'payout_account_number' => '09123456789',
        ]);

        $response->assertRedirect(route('artisan.pending'));

        Mail::assertSent(ArtisanApplicationReceivedMail::class, function (ArtisanApplicationReceivedMail $mail) use ($artisan) {
            return $mail->hasTo($artisan->email);
        });
    }

    public function test_admin_test_mail_dispatch_supports_all_five_templates(): void
    {
        Mail::fake();

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $templates = [
            'buyer_order_confirmation' => BuyerOrderConfirmationMail::class,
            'artisan_application_received' => ArtisanApplicationReceivedMail::class,
            'payment_receipt' => PaymentReceiptMail::class,
            'subscription_billing_receipt' => SubscriptionBillingReceiptMail::class,
            'staff_welcome_invite' => StaffWelcomeInviteMail::class,
        ];

        foreach ($templates as $templateKey => $mailableClass) {
            $targetEmail = "test-{$templateKey}@likhangkamay.app";

            $response = $this->actingAs($admin)->postJson(route('admin.settings.mail.test'), [
                'email' => $targetEmail,
                'template' => $templateKey,
            ]);

            $response->assertOk()
                ->assertJson([
                    'success' => true,
                    'template' => $templateKey,
                    'target' => $targetEmail,
                ]);

            Mail::assertSent($mailableClass, function ($mail) use ($targetEmail) {
                return $mail->hasTo($targetEmail);
            });
        }
    }

    public function test_all_five_mailables_support_queue_serialization_in_production(): void
    {
        $artisan = User::factory()->create(['role' => 'artisan', 'shop_name' => 'Studio Artisan']);
        $buyer = User::factory()->create(['role' => 'buyer', 'name' => 'Juana Cruz']);
        $order = Order::create([
            'order_number' => 'LK-ORD-SERIALIZE-1',
            'customer_name' => 'Juana Cruz',
            'shipping_address' => '456 Aguinaldo Highway, Imus, Cavite',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'total_amount' => 1250.00,
            'status' => 'paid',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'PAY-TEST-999',
        ]);
        $subTx = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'amount' => 499.00,
            'tier' => 'premium',
            'status' => 'paid',
            'reference_number' => 'SUB-SER-101',
        ]);
        $staff = User::factory()->create(['role' => 'artisan_staff', 'name' => 'Staff Member']);

        $mailables = [
            new BuyerOrderConfirmationMail($order),
            new ArtisanApplicationReceivedMail($artisan),
            new PaymentReceiptMail($order),
            new SubscriptionBillingReceiptMail($artisan, $subTx, 'Premium', 499.00),
            new StaffWelcomeInviteMail($staff, null, 'Studio Artisan', 'Secret@123'),
        ];

        foreach ($mailables as $mailable) {
            // Test PHP serialization round-trip (which Laravel's database queue uses)
            $serialized = serialize($mailable);
            $this->assertNotEmpty($serialized);

            /** @var \Illuminate\Mail\Mailable $unserialized */
            $unserialized = unserialize($serialized);
            $this->assertInstanceOf(get_class($mailable), $unserialized);

            $html = $unserialized->render();
            $this->assertNotEmpty($html);
            $this->assertStringNotContainsString('Fatal error', $html);
        }
    }

    public function test_mailables_handle_null_attributes_with_accurate_fallbacks(): void
    {
        // Order with empty customer_name and missing artisan shop
        $emptyArtisan = User::factory()->create(['role' => 'artisan', 'name' => 'Master Juan', 'shop_name' => null]);
        $emptyBuyer = User::factory()->create(['role' => 'buyer', 'name' => 'Buyer Anonymous']);
        $sparseOrder = Order::create([
            'order_number' => 'LK-ORD-EMPTY-001',
            'customer_name' => '',
            'shipping_address' => '789 Tirona Hwy, Bacoor, Cavite',
            'user_id' => $emptyBuyer->id,
            'artisan_id' => $emptyArtisan->id,
            'total_amount' => 500.00,
            'status' => 'pending',
            'payment_method' => 'GCash',
            'payment_id' => null,
        ]);

        $sparseMail = new BuyerOrderConfirmationMail($sparseOrder);
        $sparseHtml = $sparseMail->render();

        // Customer name should safely fallback to user name
        $this->assertStringContainsString('Buyer Anonymous', $sparseHtml);
        // Artisan shop should safely fallback to artisan user name
        $this->assertStringContainsString('Master Juan', $sparseHtml);
        // Total amount must be formatted in Philippine Pesos
        $this->assertStringContainsString('₱500.00', $sparseHtml);
        // No raw unresolved placeholders
        $this->assertStringNotContainsString('{user_name}', $sparseHtml);
        $this->assertStringNotContainsString('{shop_name}', $sparseHtml);
        $this->assertStringNotContainsString('{order_number}', $sparseHtml);

        // Payment receipt with null payment_id
        $sparsePaymentMail = new PaymentReceiptMail($sparseOrder);
        $sparsePaymentHtml = $sparsePaymentMail->render();
        $this->assertStringContainsString('₱500.00', $sparsePaymentHtml);
        $this->assertStringNotContainsString('{payment_id}', $sparsePaymentHtml);

        // Staff welcome invite with null employee and null temporary password
        $sparseStaff = User::factory()->create(['name' => 'New Staff', 'role' => 'artisan_staff']);
        $staffMail = new StaffWelcomeInviteMail($sparseStaff, null, null, null);
        $staffHtml = $staffMail->render();
        $this->assertStringContainsString('New Staff', $staffHtml);
        $this->assertStringContainsString('Staff Member', $staffHtml);
        $this->assertStringNotContainsString('{role_name}', $staffHtml);
        $this->assertStringNotContainsString('{temporary_password}', $staffHtml);
    }

    public function test_fallback_view_rendering_when_dynamic_template_is_inactive(): void
    {
        EmailTemplate::whereIn('slug', [
            'buyer_order_confirmation',
            'artisan_application_received',
            'payment_receipt',
            'subscription_billing_receipt',
            'staff_welcome_invite',
        ])->update(['is_active' => false]);

        $artisan = User::factory()->create(['role' => 'artisan', 'name' => 'Juan Dela Cruz', 'shop_name' => 'Tanza Woodcraft']);
        $buyer = User::factory()->create(['role' => 'buyer', 'name' => 'Emilio Aguinaldo']);
        $order = Order::create([
            'order_number' => 'LK-ORD-FALLBACK-101',
            'customer_name' => 'Emilio Aguinaldo',
            'shipping_address' => 'Kawit, Cavite',
            'user_id' => $buyer->id,
            'artisan_id' => $artisan->id,
            'total_amount' => 880.00,
            'status' => 'paid',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'payment_id' => 'PAY-FALLBACK-99',
        ]);
        $subTx = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'amount' => 999.00,
            'tier' => 'elite',
            'status' => 'paid',
            'reference_number' => 'SUB-ELITE-77',
        ]);
        $staff = User::factory()->create(['role' => 'artisan_staff', 'name' => 'Jose Rizal', 'email' => 'jose@tanza.ph']);

        $buyerMail = new BuyerOrderConfirmationMail($order);
        $buyerHtml = $buyerMail->render();
        $this->assertStringContainsString('Emilio Aguinaldo', $buyerHtml);
        $this->assertStringContainsString('Tanza Woodcraft', $buyerHtml);
        $this->assertStringContainsString('₱880.00', $buyerHtml);

        $artisanMail = new ArtisanApplicationReceivedMail($artisan);
        $artisanHtml = $artisanMail->render();
        $this->assertStringContainsString($artisan->name, $artisanHtml);
        $this->assertStringContainsString('Tanza Woodcraft', $artisanHtml);

        $paymentMail = new PaymentReceiptMail($order);
        $paymentHtml = $paymentMail->render();
        $this->assertStringContainsString('Emilio Aguinaldo', $paymentHtml);
        $this->assertStringContainsString('PAY-FALLBACK-99', $paymentHtml);
        $this->assertStringContainsString('₱880.00', $paymentHtml);

        $subMail = new SubscriptionBillingReceiptMail($artisan, $subTx, 'Elite', 999.00);
        $subHtml = $subMail->render();
        $this->assertStringContainsString($artisan->name, $subHtml);
        $this->assertStringContainsString('Elite', $subHtml);
        $this->assertStringContainsString('₱999.00', $subHtml);

        $staffMail = new StaffWelcomeInviteMail($staff, null, 'Tanza Woodcraft', 'TempPass@2026');
        $staffHtml = $staffMail->render();
        $this->assertStringContainsString('Jose Rizal', $staffHtml);
        $this->assertStringContainsString('jose@tanza.ph', $staffHtml);
        $this->assertStringContainsString('TempPass@2026', $staffHtml);
        $this->assertStringContainsString('Tanza Woodcraft', $staffHtml);
    }
}
