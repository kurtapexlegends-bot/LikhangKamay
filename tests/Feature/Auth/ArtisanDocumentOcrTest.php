<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ArtisanDocumentOcrTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_upload_persists_ocr_metadata_and_automated_permit_flag(): void
    {
        Storage::fake('public');

        /** @var User $artisan */
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'shop_name' => 'Likha Pottery Studio',
        ]);

        $this->actingAs($artisan);

        $file = UploadedFile::fake()->image('permit.jpg', 800, 800);

        $ocrPayload = [
            'status' => 'verified',
            'matched' => true,
            'badgeText' => "Mayor's Permit Verified: #2024-00192",
            'badgeTone' => 'emerald',
            'extractedValue' => '2024-00192',
            'confidence' => 92,
            'signals' => ["Mayor's / Business Permit", 'Cavite LGU: Imus', 'Permit #2024-00192'],
            'summaryText' => "Mayor's / Business Permit • Cavite LGU: Imus • Permit #2024-00192",
        ];

        $response = $this->postJson(route('artisan.setup.upload-document', ['type' => 'business_permit']), [
            'document' => $file,
            'ocr_status' => 'verified',
            'ocr_extracted_value' => '2024-00192',
            'ocr_summary' => "Mayor's Permit Verified: #2024-00192",
            'ocr_data' => json_encode($ocrPayload),
        ]);

        $response->assertOk();
        $response->assertJsonPath('type', 'business_permit');
        $response->assertJsonPath('kyc_verification_meta.ocr.business_permit.extracted_value', '2024-00192');
        $response->assertJsonPath('kyc_verification_meta.ocr.business_permit.matched', true);

        $artisan->refresh();
        $this->assertNotNull($artisan->business_permit);
        $this->assertEquals('2024-00192', $artisan->kyc_verification_meta['ocr']['business_permit']['extracted_value']);
        $this->assertTrue($artisan->kyc_verification_meta['ocr']['business_permit']['matched']);
        $this->assertContains('ocr_permit_verified', $artisan->document_flags['business_permit'] ?? []);
    }

    public function test_artisan_upload_persists_dti_and_tin_ocr_data(): void
    {
        Storage::fake('public');

        /** @var User $artisan */
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'shop_name' => 'Silang Terracotta',
        ]);

        $this->actingAs($artisan);

        // 1. DTI Upload
        $dtiFile = UploadedFile::fake()->image('dti.jpg', 800, 800);
        $dtiOcr = [
            'status' => 'verified',
            'matched' => true,
            'badgeText' => 'DTI Matched: "Silang Terracotta"',
            'badgeTone' => 'emerald',
            'extractedValue' => '05489214',
            'shopMatched' => true,
            'confidence' => 89,
            'signals' => ['DTI Philippines', 'Cert #05489214', 'Shop Matched: "Silang Terracotta"'],
        ];

        $res1 = $this->postJson(route('artisan.setup.upload-document', ['type' => 'dti_registration']), [
            'document' => $dtiFile,
            'ocr_data' => json_encode($dtiOcr),
        ]);
        $res1->assertOk();

        // 2. TIN Upload
        $tinFile = UploadedFile::fake()->image('tin.jpg', 800, 800);
        $tinOcr = [
            'status' => 'verified',
            'matched' => true,
            'badgeText' => 'TIN Detected: 948-120-334-000',
            'badgeTone' => 'emerald',
            'extractedValue' => '948-120-334-000',
            'confidence' => 95,
            'signals' => ['Bureau of Internal Revenue', 'TIN: 948-120-334-000'],
        ];

        $res2 = $this->postJson(route('artisan.setup.upload-document', ['type' => 'tin_id']), [
            'document' => $tinFile,
            'ocr_data' => json_encode($tinOcr),
        ]);
        $res2->assertOk();

        $artisan->refresh();
        $this->assertEquals('05489214', $artisan->kyc_verification_meta['ocr']['dti_registration']['extracted_value']);
        $this->assertTrue($artisan->kyc_verification_meta['ocr']['dti_registration']['shop_matched']);
        $this->assertContains('ocr_dti_matched', $artisan->document_flags['dti_registration'] ?? []);

        $this->assertEquals('948-120-334-000', $artisan->kyc_verification_meta['ocr']['tin_id']['extracted_value']);
        $this->assertContains('ocr_tin_matched', $artisan->document_flags['tin_id'] ?? []);
    }

    public function test_document_deletion_removes_ocr_metadata_and_flags(): void
    {
        Storage::fake('public');

        /** @var User $artisan */
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'business_permit' => 'legal_docs/sample_permit.jpg',
            'document_flags' => ['business_permit' => ['ocr_permit_verified']],
            'kyc_verification_meta' => [
                'ocr' => [
                    'business_permit' => [
                        'status' => 'verified',
                        'extracted_value' => '2024-00192',
                    ],
                ],
            ],
        ]);

        Storage::disk('public')->put('legal_docs/sample_permit.jpg', 'dummy');

        $this->actingAs($artisan);

        $res = $this->delete(route('artisan.setup.delete-document', ['type' => 'business_permit']));
        $res->assertSessionHas('success');

        $artisan->refresh();
        $this->assertNull($artisan->business_permit);
        $this->assertArrayNotHasKey('business_permit', $artisan->kyc_verification_meta['ocr'] ?? []);
        $this->assertArrayNotHasKey('business_permit', $artisan->document_flags ?? []);
    }

    public function test_step_two_wizard_submission_preserves_ocr_metadata(): void
    {
        Storage::fake('public');

        /** @var User $artisan */
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'business_permit' => 'legal_docs/sample_permit.jpg',
            'dti_registration' => 'legal_docs/sample_dti.jpg',
            'valid_id' => 'legal_docs/sample_id.jpg',
            'tin_id' => 'legal_docs/sample_tin.jpg',
            'kyc_verification_meta' => [
                'ocr' => [
                    'business_permit' => [
                        'status' => 'verified',
                        'matched' => true,
                        'extracted_value' => '2024-00192',
                    ],
                    'dti_registration' => [
                        'status' => 'verified',
                        'matched' => true,
                        'extracted_value' => '05489214',
                    ],
                ],
            ],
        ]);

        Storage::disk('public')->put('legal_docs/sample_permit.jpg', 'dummy');
        Storage::disk('public')->put('legal_docs/sample_dti.jpg', 'dummy');
        Storage::disk('public')->put('legal_docs/sample_id.jpg', 'dummy');
        Storage::disk('public')->put('legal_docs/sample_tin.jpg', 'dummy');

        $this->actingAs($artisan);

        $response = $this->post(route('artisan.setup.store'), [
            'current_step' => 2,
            'business_permit' => 'legal_docs/sample_permit.jpg',
            'dti_registration' => 'legal_docs/sample_dti.jpg',
            'valid_id' => 'legal_docs/sample_id.jpg',
            'tin_id' => 'legal_docs/sample_tin.jpg',
        ]);

        $response->assertSessionHasNoErrors();
        $artisan->refresh();

        $this->assertNotNull($artisan->kyc_verification_meta);
        $this->assertArrayHasKey('ocr', $artisan->kyc_verification_meta);
        $this->assertEquals('2024-00192', $artisan->kyc_verification_meta['ocr']['business_permit']['extracted_value']);
        $this->assertEquals('05489214', $artisan->kyc_verification_meta['ocr']['dti_registration']['extracted_value']);
    }
}
