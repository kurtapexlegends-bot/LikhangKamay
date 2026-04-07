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

        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 2,
            'business_permit' => UploadedFile::fake()->image('business-permit.jpg'),
            'dti_registration' => UploadedFile::fake()->image('dti-registration.jpg'),
            'valid_id' => UploadedFile::fake()->image('valid-id.jpg'),
            'tin_id' => UploadedFile::fake()->image('tin-id.jpg'),
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

        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 2,
            'business_permit' => UploadedFile::fake()->image('business-permit.jpg'),
            'dti_registration' => UploadedFile::fake()->image('dti-registration.jpg'),
            'valid_id' => UploadedFile::fake()->image('valid-id.jpg'),
            'tin_id' => UploadedFile::fake()->image('tin-id.jpg'),
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

        $user = User::factory()->create([
            'role' => 'artisan',
            'email_verified_at' => now(),
            'shop_name' => 'Clay Studio',
        ]);

        $response = $this->actingAs($user)->post(route('artisan.setup.store'), [
            'current_step' => 2,
            'business_permit' => UploadedFile::fake()->image('business-permit.jpg'),
            'dti_registration' => UploadedFile::fake()->image('dti-registration.jpg'),
            'valid_id' => UploadedFile::fake()->image('valid-id.jpg'),
            'tin_id' => UploadedFile::fake()->image('tin-id.jpg'),
        ]);

        $response->assertRedirect(route('artisan.pending', absolute: false));
        $response->assertSessionHas('warning');
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'artisan_status' => 'pending',
        ]);
        Notification::assertSentTo($admin, NewArtisanApplicationNotification::class);
    }
}
