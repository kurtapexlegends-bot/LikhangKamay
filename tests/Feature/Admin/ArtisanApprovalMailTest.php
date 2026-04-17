<?php

namespace Tests\Feature\Admin;

use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ArtisanApprovalMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_approval_sends_artisan_approved_email_immediately(): void
    {
        Mail::fake();

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'email' => 'artisan@example.com',
            'artisan_status' => 'pending',
            'shop_name' => 'Clay Studio',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
            'business_permit' => 'legal_docs/business-permit.pdf',
            'dti_registration' => 'legal_docs/dti-registration.pdf',
            'valid_id' => 'legal_docs/valid-id.png',
            'tin_id' => 'legal_docs/tin-id.png',
        ]);

        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $document) {
            $this->actingAs($admin)->post(route('admin.artisan.documents.viewed', $artisan->id), [
                'document' => $document,
            ])->assertOk();
        }

        $response = $this->actingAs($admin)->post(route('admin.artisan.approve', $artisan->id));

        $response->assertRedirect();
        Mail::assertSent(ArtisanApproved::class, fn (ArtisanApproved $mail) => $mail->artisan->is($artisan));
    }

    public function test_super_admin_rejection_sends_artisan_rejected_email_immediately(): void
    {
        Mail::fake();

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'email' => 'artisan@example.com',
            'artisan_status' => 'pending',
            'shop_name' => 'Clay Studio',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post(route('admin.artisan.reject', $artisan->id), [
            'reason' => 'Documents did not meet the verification requirements.',
        ]);

        $response->assertRedirect();
        Mail::assertSent(ArtisanRejected::class, function (ArtisanRejected $mail) use ($artisan) {
            return $mail->hasTo($artisan->email) && $mail->artisan->is($artisan);
        });
    }
}
