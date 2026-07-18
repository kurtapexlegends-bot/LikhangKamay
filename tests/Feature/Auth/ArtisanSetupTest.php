<?php

namespace Tests\Feature\Auth;

use App\Mail\NewArtisanApplication;
use App\Models\User;
use App\Notifications\NewArtisanApplicationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ArtisanSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_setup_sends_new_application_mail_to_configured_recipient(): void
    {
        Storage::fake('public');
        Mail::fake();
        Notification::fake();
        config()->set('services.artisan_applications.notification_email', 'admin@example.com');

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'GCash',
            'payout_account_name' => 'John Doe',
            'payout_account_number' => '09123456789',
        ]);

        $response->assertRedirect(route('artisan.pending', absolute: false));
        Mail::assertSent(NewArtisanApplication::class, function (NewArtisanApplication $mail) {
            return $mail->hasTo('admin@example.com');
        });
        Notification::assertSentTo($admin, NewArtisanApplicationNotification::class);
    }

    public function test_artisan_setup_sends_new_application_mail_to_super_admin_email_when_config_is_missing(): void
    {
        Storage::fake('public');
        Mail::fake();
        Notification::fake();
        config()->set('services.artisan_applications.notification_email', null);

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'superadmin@example.com',
            'email_verified_at' => now(),
        ]);

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'GCash',
            'payout_account_name' => 'John Doe',
            'payout_account_number' => '09123456789',
        ]);

        $response->assertRedirect(route('artisan.pending', absolute: false));
        Mail::assertSent(NewArtisanApplication::class, function (NewArtisanApplication $mail) {
            return $mail->hasTo('superadmin@example.com');
        });
        Notification::assertSentTo($admin, NewArtisanApplicationNotification::class);
    }

    public function test_artisan_setup_still_completes_when_admin_notification_email_fails(): void
    {
        Storage::fake('public');
        Notification::fake();
        config()->set('services.artisan_applications.notification_email', 'admin@example.com');

        Mail::shouldReceive('to')
            ->once()
            ->with(Mockery::on(function ($recipients) {
                return is_array($recipients) && in_array('admin@example.com', $recipients, true);
            }))
            ->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('SMTP unavailable'));

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'GCash',
            'payout_account_name' => 'John Doe',
            'payout_account_number' => '09123456789',
        ]);

        $response->assertRedirect(route('artisan.pending', absolute: false));
        $response->assertSessionHas('warning');
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'artisan_status' => 'pending',
        ]);
        Notification::assertSentTo($admin, NewArtisanApplicationNotification::class);
    }

    public function test_artisan_setup_step_1_saves_shop_details_and_creates_default_address(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 1,
            'shop_name' => 'Johns Pottery Studio',
            'phone_number' => '09171234567',
            'street_address' => 'Blk 12 Lot 3',
            'region' => 'Cavite',
            'city' => 'Dasmarinas City',
            'barangay' => 'Sampaloc I',
            'zip_code' => '4114',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'shop_name' => 'Johns Pottery Studio',
            'phone_number' => '09171234567',
        ]);

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $user->id,
            'label' => 'Shop',
            'address_type' => 'office',
            'recipient_name' => $user->name,
            'phone_number' => '09171234567',
            'street_address' => 'Blk 12 Lot 3',
            'barangay' => 'Sampaloc I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'is_default' => true,
        ]);
    }

    public function test_artisan_setup_step_2_uploads_legal_documents(): void
    {
        Storage::fake('public');

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
        ]);

        $businessPermit = UploadedFile::fake()->image('permit.jpg', 600, 600);
        $dtiReg = UploadedFile::fake()->image('dti.png', 600, 600);
        $validId = UploadedFile::fake()->image('id.jpg', 600, 600);
        $tinId = UploadedFile::fake()->image('tin.jpg', 600, 600);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 2,
            'business_permit' => $businessPermit,
            'dti_registration' => $dtiReg,
            'valid_id' => $validId,
            'tin_id' => $tinId,
        ]);

        $response->assertRedirect();
        
        $user->refresh();
        $this->assertNotNull($user->business_permit);
        $this->assertNotNull($user->dti_registration);
        $this->assertNotNull($user->valid_id);
        $this->assertNotNull($user->tin_id);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        $disk->assertExists($user->business_permit);
    }

    public function test_artisan_setup_can_delete_legal_document(): void
    {
        Storage::fake('public');

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'business_permit' => 'legal_docs/permit.jpg',
        ]);

        Storage::disk('public')->put('legal_docs/permit.jpg', 'fake content');

        $response = $this->actingAs($user)->delete(route('artisan.setup.delete-document', ['type' => 'business_permit']));

        $response->assertRedirect();
        $user->refresh();
        $this->assertNull($user->business_permit);
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        $disk->assertMissing('legal_docs/permit.jpg');
    }

    public function test_artisan_setup_can_upload_single_legal_document(): void
    {
        Storage::fake('public');

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
        ]);

        $file = UploadedFile::fake()->image('permit.jpg', 600, 600);

        $response = $this->actingAs($user)->post(route('artisan.setup.upload-document', ['type' => 'business_permit']), [
            'document' => $file,
        ]);

        $response->assertRedirect();
        $user->refresh();
        $this->assertNotNull($user->business_permit);
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        $disk->assertExists($user->business_permit);
    }

    public function test_artisan_can_visit_pending_approval_page(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'artisan_status' => 'pending',
            'setup_completed_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('artisan.pending'));
        $response->assertOk();
    }

    public function test_artisan_can_complete_setup_and_render_pending_page(): void
    {
        Storage::fake('public');
        Mail::fake();
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'GCash',
            'payout_account_name' => 'John Doe',
            'payout_account_number' => '09123456789',
        ]);

        $response->assertRedirect(route('artisan.pending'));
        
        $followResponse = $this->actingAs($user)->get(route('artisan.pending'));
        $followResponse->assertOk();
    }

    public function test_pending_artisan_is_blocked_from_buyer_routes(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'artisan_status' => 'pending',
            'setup_completed_at' => now(),
        ]);

        // Attempting to visit profile should redirect to artisan.pending
        $response = $this->actingAs($user)->get(route('profile.edit'));
        $response->assertRedirect(route('artisan.pending'));

        // Attempting to visit cart should redirect to artisan.pending
        $response = $this->actingAs($user)->get(route('cart.index'));
        $response->assertRedirect(route('artisan.pending'));

        // Attempting to visit checkout should redirect to artisan.pending
        $response = $this->actingAs($user)->get(route('checkout.create'));
        $response->assertRedirect(route('artisan.pending'));
    }

    public function test_rejected_artisan_is_blocked_from_buyer_routes_before_conversion(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'artisan_status' => 'rejected',
            'setup_completed_at' => now(),
        ]);

        // Attempting to visit profile should redirect to artisan.setup (where setup form & convert button are shown)
        $response = $this->actingAs($user)->get(route('profile.edit'));
        $response->assertRedirect(route('artisan.setup'));
    }

    public function test_rejected_artisan_can_convert_to_buyer_account(): void
    {
        Storage::fake('public');

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'artisan_status' => 'rejected',
            'artisan_rejection_reason' => 'Invalid ID',
            'setup_completed_at' => now(),
            'shop_name' => 'My Shop',
            'shop_slug' => 'my-shop',
            'valid_id' => 'legal_docs/id.jpg',
        ]);

        // Convert to buyer
        $response = $this->actingAs($user)->post(route('artisan.convert-to-buyer'));
        $response->assertRedirect(route('home'));

        // Refresh user and assert columns are reset
        $user->refresh();
        $this->assertEquals('user', $user->role);
        $this->assertEquals('pending', $user->artisan_status);
        $this->assertNull($user->shop_name);
        $this->assertNull($user->valid_id);

        // Once converted, they should be able to access buyer routes without getting blocked
        $response = $this->actingAs($user)->get(route('profile.edit'));
        $response->assertOk();
    }
}
