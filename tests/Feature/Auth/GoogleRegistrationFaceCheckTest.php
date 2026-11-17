<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GoogleRegistrationFaceCheckTest extends TestCase
{
    use RefreshDatabase;

    private function sampleSelfieDataUrl(): string
    {
        $img = imagecreatetruecolor(120, 120);
        $bg = imagecolorallocate($img, 200, 180, 160);
        imagefill($img, 0, 0, $bg);
        ob_start();
        imagejpeg($img, null, 90);
        $bytes = ob_get_clean();
        imagedestroy($img);

        if (strlen((string) $bytes) < 512) {
            $bytes .= str_repeat("\0", 512 - strlen((string) $bytes));
        }

        return 'data:image/jpeg;base64,' . base64_encode((string) $bytes);
    }

    private function sampleDescriptor(float $baseValue = 0.12): array
    {
        return array_fill(0, 128, $baseValue);
    }

    public function test_buyer_completing_google_registration_with_face_check_is_verified_immediately(): void
    {
        Storage::fake('public');

        $sessionData = [
            'provider' => 'google',
            'id' => 'google-user-12345',
            'email' => 'googlebuyer.verified@example.com',
            'name' => 'Yashica Acosta',
            'avatar' => 'https://lh3.googleusercontent.com/a/avatar.jpg',
            'role' => 'buyer',
            'remember' => false,
        ];

        $response = $this->withSession([
            'social_auth' => $sessionData,
            'social_auth_role' => 'buyer',
        ])->post(route('auth.complete-profile.store'), [
            'first_name' => 'Yashica',
            'last_name' => 'Acosta',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => true,
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => $this->sampleDescriptor(0.18),
        ]);

        $response->assertSessionHasNoErrors();

        /** @var User $user */
        $user = User::where('email', 'googlebuyer.verified@example.com')->firstOrFail();
        $this->assertSame('buyer', $user->role);
        $this->assertFalse((bool) $user->requires_checkout_face_check);
        $this->assertNotNull($user->kyc_liveness_verified_at);
        $this->assertNotNull($user->face_descriptor);
        $this->assertNotNull($user->kyc_selfie_path);
        Storage::disk('public')->assertExists($user->kyc_selfie_path);
        $this->assertAuthenticatedAs($user);
    }

    public function test_buyer_completing_google_registration_without_camera_is_flagged_for_checkout_face_check(): void
    {
        $sessionData = [
            'provider' => 'google',
            'id' => 'google-user-67890',
            'email' => 'googlebuyer.skipped@example.com',
            'name' => 'Skipped Buyer',
            'avatar' => 'https://lh3.googleusercontent.com/a/avatar2.jpg',
            'role' => 'buyer',
            'remember' => false,
        ];

        $response = $this->withSession([
            'social_auth' => $sessionData,
            'social_auth_role' => 'buyer',
        ])->post(route('auth.complete-profile.store'), [
            'first_name' => 'Skipped',
            'last_name' => 'Buyer',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => true,
            'selfie_data_url' => '',
            'face_descriptor' => null,
        ]);

        $response->assertSessionHasNoErrors();

        /** @var User $user */
        $user = User::where('email', 'googlebuyer.skipped@example.com')->firstOrFail();
        $this->assertSame('buyer', $user->role);
        $this->assertTrue((bool) $user->requires_checkout_face_check);
        $this->assertNull($user->kyc_liveness_verified_at);
        $this->assertNull($user->face_descriptor);
        $this->assertAuthenticatedAs($user);
    }

    public function test_buyer_completing_google_registration_matching_banned_face_is_blocked(): void
    {
        User::factory()->create([
            'suspended_until' => now()->addYear(),
            'face_descriptor' => $this->sampleDescriptor(0.35),
        ]);

        $sessionData = [
            'provider' => 'google',
            'id' => 'google-user-banned-dup',
            'email' => 'googlebuyer.banned@example.com',
            'name' => 'Banned Duplicate',
            'avatar' => 'https://lh3.googleusercontent.com/a/avatar3.jpg',
            'role' => 'buyer',
            'remember' => false,
        ];

        $response = $this->withSession([
            'social_auth' => $sessionData,
            'social_auth_role' => 'buyer',
        ])->post(route('auth.complete-profile.store'), [
            'first_name' => 'Banned',
            'last_name' => 'Duplicate',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => true,
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => $this->sampleDescriptor(0.35),
        ]);

        $response->assertSessionHasErrors('face_verification');
        $this->assertDatabaseMissing('users', ['email' => 'googlebuyer.banned@example.com']);
    }
}
