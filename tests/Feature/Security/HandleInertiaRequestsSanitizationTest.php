<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HandleInertiaRequestsSanitizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_user_strips_sensitive_document_paths_and_payout_account_numbers(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'payout_method' => 'GCash',
            'payout_account_name' => 'Juan Dela Cruz',
            'payout_account_number' => '09171234567',
            'business_permit' => 'legal_docs/permit.pdf',
            'dti_registration' => 'legal_docs/dti.jpg',
            'valid_id' => 'legal_docs/id.png',
            'tin_id' => 'legal_docs/tin.pdf',
        ]);

        $response = $this->actingAs($artisan)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(function (Assert $page) {
            $page->has('auth.user', function (Assert $user) {
                // Must expose safe boolean flags
                $user->where('has_payout_account', true)
                    ->where('has_business_permit', true)
                    ->where('has_dti_registration', true)
                    ->where('has_valid_id', true)
                    ->where('has_tin_id', true)
                    // Must strip raw document columns and URLs
                    ->missing('payout_account_number')
                    ->missing('business_permit')
                    ->missing('business_permit_url')
                    ->missing('dti_registration')
                    ->missing('dti_registration_url')
                    ->missing('valid_id')
                    ->missing('valid_id_url')
                    ->missing('tin_id')
                    ->missing('tin_id_url')
                    ->etc();
            });
        });
    }

    public function test_auth_user_boolean_flags_are_false_when_documents_and_payout_are_empty(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'payout_account_number' => null,
            'business_permit' => null,
            'dti_registration' => null,
            'valid_id' => null,
            'tin_id' => null,
        ]);

        $response = $this->actingAs($buyer)->get(route('home'));

        $response->assertOk();
        $response->assertInertia(function (Assert $page) {
            $page->has('auth.user', function (Assert $user) {
                $user->where('has_payout_account', false)
                    ->where('has_business_permit', false)
                    ->where('has_dti_registration', false)
                    ->where('has_valid_id', false)
                    ->where('has_tin_id', false)
                    ->missing('payout_account_number')
                    ->missing('business_permit')
                    ->missing('valid_id')
                    ->etc();
            });
        });
    }

    public function test_artisan_setup_page_supplies_existing_documents_and_payout_number_via_page_props(): void
    {
        // Unapproved artisan accessing onboarding setup wizard
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Maria Clara',
            'payout_account_number' => '09189876543',
            'business_permit' => 'legal_docs/permit_preview.pdf',
            'dti_registration' => 'legal_docs/dti_preview.jpg',
            'valid_id' => 'legal_docs/id_preview.png',
            'tin_id' => 'legal_docs/tin_preview.pdf',
        ]);

        $response = $this->actingAs($artisan)->get(route('artisan.setup'));

        $response->assertOk();
        $response->assertInertia(function (Assert $page) {
            $page->component('Auth/ArtisanSetup')
                ->where('existingPayoutAccountNumber', '09189876543')
                ->has('existingDocuments', function (Assert $docs) {
                    $docs->has('business_permit_url')
                        ->has('dti_registration_url')
                        ->has('valid_id_url')
                        ->has('tin_id_url');
                });
        });
    }
}
