<?php

namespace Tests\Feature\Auth;

use App\Models\Product;
use App\Models\User;
use App\Services\DocumentForensicsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KycBiometricsAndForensicsTest extends TestCase
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

    public function test_buyer_registering_without_camera_is_flagged_for_one_time_checkout_face_check_across_all_payment_methods(): void
    {
        Notification::fake();
        Mail::fake();
        Storage::fake('public');

        $this->post('/register', [
            'first_name' => 'Cameraless',
            'last_name' => 'Buyer',
            'email' => 'nocam@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => true,
        ])->assertRedirect(route('verification.notice', absolute: false));

        /** @var User $buyer */
        $buyer = User::where('email', 'nocam@example.com')->firstOrFail();
        $buyer->forceFill([
            'email_verified_at' => now(),
            'current_session_id' => null,
        ])->save();

        $this->assertTrue((bool) $buyer->requires_checkout_face_check);
        $this->assertNull($buyer->kyc_liveness_verified_at);

        $seller = User::factory()->artisanApproved()->create();
        Product::$bypassReview = true;
        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'KYC-CHK-01',
            'name' => 'Handpainted Mug',
            'description' => 'Stoneware ceramic mug',
            'category' => 'Mugs',
            'status' => 'Active',
            'price' => 350,
            'cost_price' => 150,
            'stock' => 15,
        ]);

        foreach (['COD', 'GCash', 'Maya'] as $paymentMethod) {
            $this->actingAs($buyer)->post(route('checkout.store'), [
                'items' => [
                    ['id' => $product->id, 'artisan_id' => $seller->id, 'name' => $product->name, 'qty' => 1, 'variant' => 'Standard'],
                ],
                'shipping_method' => 'Delivery',
                'recipient_name' => 'Cameraless Buyer',
                'phone_number' => '09171234567',
                'shipping_address' => '123 Aguinaldo Hwy, Dasmarinas City, Cavite',
                'shipping_address_type' => 'home',
                'payment_method' => $paymentMethod,
                'total' => 450,
            ])->assertSessionHasErrors('face_verification');
        }

        // Complete one-time quick face check via Profile endpoint
        $this->actingAs($buyer)->post(route('profile.verify-face'), [
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => $this->sampleDescriptor(0.15),
        ])->assertSessionHasNoErrors();

        $buyer->refresh();
        $this->assertFalse((bool) $buyer->requires_checkout_face_check);
        $this->assertNotNull($buyer->kyc_liveness_verified_at);
        Storage::disk('public')->assertExists($buyer->kyc_selfie_path);

        // Subsequent checkout now succeeds permanently without asking again
        $this->actingAs($buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $product->id, 'artisan_id' => $seller->id, 'name' => $product->name, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Delivery',
            'recipient_name' => 'Cameraless Buyer',
            'phone_number' => '09171234567',
            'shipping_address' => '123 Aguinaldo Hwy, Dasmarinas City, Cavite',
            'shipping_address_type' => 'home',
            'payment_method' => 'COD',
            'total' => 450,
        ])->assertRedirect(route('my-orders.index', absolute: false));
    }

    public function test_buyer_registering_with_live_selfie_and_descriptor_bypasses_checkout_gate_immediately(): void
    {
        Notification::fake();
        Storage::fake('public');

        $this->post('/register', [
            'first_name' => 'Verified',
            'last_name' => 'Shopper',
            'email' => 'verified.shopper@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => $this->sampleDescriptor(0.22),
            'terms' => true,
        ])->assertRedirect(route('verification.notice', absolute: false));

        $buyer = User::where('email', 'verified.shopper@example.com')->firstOrFail();
        $this->assertFalse((bool) $buyer->requires_checkout_face_check);
        $this->assertNotNull($buyer->kyc_liveness_verified_at);
        Storage::disk('public')->assertExists($buyer->kyc_selfie_path);
    }

    public function test_banned_user_duplicate_face_blocks_new_registration(): void
    {
        Notification::fake();

        User::factory()->create([
            'suspended_until' => now()->addYear(),
            'face_descriptor' => $this->sampleDescriptor(0.31),
        ]);

        $this->post('/register', [
            'first_name' => 'Duplicate',
            'last_name' => 'Account',
            'email' => 'dup.banned@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => $this->sampleDescriptor(0.31),
            'terms' => true,
        ])->assertSessionHasErrors('face_verification');

        $this->assertDatabaseMissing('users', ['email' => 'dup.banned@example.com']);
    }

    public function test_document_forensics_flags_synthetic_ai_metadata_and_computes_calibrated_matrix(): void
    {
        $forensics = app(DocumentForensicsService::class);

        $tmpAiFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lk_ai_test_' . uniqid() . '.png';
        $img = imagecreatetruecolor(1024, 1024);
        imagepng($img, $tmpAiFile);
        imagedestroy($img);

        // Append simulated AI generator software metadata signature
        file_put_contents($tmpAiFile, file_get_contents($tmpAiFile) . "\0tEXtSoftware\0DALL-E 3 Generator");

        try {
            $result = $forensics->inspectUploadedFile($tmpAiFile, false);
            $this->assertTrue($result['has_editor_or_ai_tag']);
            $this->assertSame('high_risk', $result['status']);
            $this->assertSame(0, $result['points']);

            $highRiskComposite = $forensics->computeCompositeScore([
                'liveness_passed' => true,
                'match_score' => 70,
                'id_face_detected' => true,
                'forensics' => $result,
                'banned_face_match' => false,
                'camera_captured' => false,
            ]);
            // Still receives >= 50 or high_risk indicator cleanly without hard-blocking
            $this->assertSame(80, $highRiskComposite['confidence_score']); // 30 liveness + 40 match + 0 forensics + 10 non-banned
            $this->assertSame('high_risk', $highRiskComposite['forensics_status']);
        } finally {
            @unlink($tmpAiFile);
        }

        // Camera-captured ID + strong match => Strong Verification (>= 75)
        $strongComposite = $forensics->computeCompositeScore([
            'liveness_passed' => true,
            'match_score' => 78,
            'id_face_detected' => true,
            'forensics' => ['status' => 'clean', 'points' => 20, 'signals' => []],
            'banned_face_match' => false,
            'camera_captured' => true,
        ]);

        $this->assertSame(100, $strongComposite['confidence_score']);
        $this->assertSame('strong', $strongComposite['band']);
    }

    public function test_artisan_kyc_persists_selfie_to_id_score_and_forensics_meta(): void
    {
        Storage::fake('public');

        $artisan = User::factory()->artisanPending()->create();
        $idPhoto = UploadedFile::fake()->image('valid_id.jpg', 800, 500);

        $this->actingAs($artisan)->postJson(route('artisan.setup.upload-document', ['type' => 'valid_id']), [
            'document' => $idPhoto,
            'camera_captured' => 1,
            'selfie_data_url' => $this->sampleSelfieDataUrl(),
            'face_descriptor' => json_encode($this->sampleDescriptor(0.20)),
            'id_face_descriptor' => json_encode($this->sampleDescriptor(0.22)),
            'id_face_detected' => 1,
        ])->assertOk()->assertJsonPath('type', 'valid_id');

        $artisan->refresh();

        $this->assertNotNull($artisan->kyc_selfie_path);
        $this->assertNotNull($artisan->kyc_liveness_verified_at);
        $this->assertIsArray($artisan->kyc_verification_meta);
        $this->assertSame('strong', $artisan->kyc_verification_meta['band']);
        $this->assertGreaterThanOrEqual(75, $artisan->kyc_verification_meta['confidence_score']);
    }

    public function test_backfill_migration_flags_existing_unverified_buyers_but_skips_test_and_verified_accounts(): void
    {
        $unverifiedBuyer = User::factory()->create([
            'role' => 'buyer',
            'is_test' => false,
            'kyc_liveness_verified_at' => null,
            'requires_checkout_face_check' => false,
        ]);

        $verifiedBuyer = User::factory()->create([
            'role' => 'buyer',
            'is_test' => false,
            'kyc_liveness_verified_at' => now(),
            'requires_checkout_face_check' => false,
        ]);

        $testBuyer = User::factory()->create([
            'role' => 'buyer',
            'is_test' => true,
            'kyc_liveness_verified_at' => null,
            'requires_checkout_face_check' => false,
        ]);

        $approvedSeller = User::factory()->artisanApproved()->create([
            'is_test' => false,
            'kyc_liveness_verified_at' => null,
            'requires_checkout_face_check' => false,
        ]);

        $migration = require database_path('migrations/2026_11_10_000003_backfill_requires_checkout_face_check_for_existing_buyers.php');
        $migration->up();

        $this->assertTrue((bool) $unverifiedBuyer->fresh()->requires_checkout_face_check);
        $this->assertTrue($unverifiedBuyer->fresh()->requiresCheckoutFaceVerification());
        $this->assertFalse((bool) $verifiedBuyer->fresh()->requires_checkout_face_check);
        $this->assertFalse((bool) $testBuyer->fresh()->requires_checkout_face_check);
        $this->assertFalse((bool) $approvedSeller->fresh()->requires_checkout_face_check);
    }

    public function test_social_buyer_complete_profile_sets_one_time_checkout_face_check(): void
    {
        $this->withSession([
            'social_auth' => [
                'provider' => 'google',
                'id' => 'google-oauth-12345',
                'email' => 'social.buyer@example.com',
                'name' => 'Social Buyer',
                'avatar' => null,
                'role' => 'buyer',
                'remember' => false,
            ],
        ])->post(route('auth.complete-profile.store'), [
            'first_name' => 'Social',
            'last_name' => 'Buyer',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'terms' => true,
        ])->assertRedirect();

        $socialBuyer = User::where('email', 'social.buyer@example.com')->firstOrFail();
        $this->assertTrue((bool) $socialBuyer->requires_checkout_face_check);
        $this->assertTrue($socialBuyer->requiresCheckoutFaceVerification());
    }
}
