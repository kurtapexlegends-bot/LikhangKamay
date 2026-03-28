<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PendingArtisanApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_cannot_approve_artisan_before_viewing_any_documents(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = $this->createPendingArtisanWithDocuments();

        $this->actingAs($admin)
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertSessionHasErrors('documents');

        $artisan->refresh();

        $this->assertSame('pending', $artisan->artisan_status);
        $this->assertNull($artisan->approved_at);
    }

    public function test_super_admin_cannot_approve_artisan_after_viewing_only_some_documents(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = $this->createPendingArtisanWithDocuments();

        $this->actingAs($admin)
            ->post(route('admin.artisan.documents.viewed', $artisan->id), [
                'document' => 'business_permit',
            ])
            ->assertOk();

        $this->actingAs($admin)
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertSessionHasErrors('documents');

        $artisan->refresh();

        $this->assertSame('pending', $artisan->artisan_status);
        $this->assertNull($artisan->approved_at);
    }

    public function test_super_admin_can_approve_artisan_after_viewing_all_submitted_documents(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = $this->createPendingArtisanWithDocuments();

        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $documentKey) {
            $this->actingAs($admin)
                ->post(route('admin.artisan.documents.viewed', $artisan->id), [
                    'document' => $documentKey,
                ])
                ->assertOk();
        }

        $this->actingAs($admin)
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Artisan approved successfully!');

        $artisan->refresh();

        $this->assertSame('approved', $artisan->artisan_status);
        $this->assertNotNull($artisan->approved_at);
        $this->assertSame($admin->id, $artisan->approved_by);
    }

    public function test_super_admin_can_reject_artisan_from_review_flow(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = $this->createPendingArtisanWithDocuments();

        $this->actingAs($admin)
            ->post(route('admin.artisan.reject', $artisan->id), [
                'reason' => 'The uploaded permit details do not match the seller profile yet.',
            ])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Artisan application rejected.');

        $artisan->refresh();

        $this->assertSame('rejected', $artisan->artisan_status);
        $this->assertSame('The uploaded permit details do not match the seller profile yet.', $artisan->artisan_rejection_reason);
    }

    private function createPendingArtisanWithDocuments(): User
    {
        return User::factory()->artisanPending()->create([
            'business_permit' => 'legal_docs/business-permit.pdf',
            'dti_registration' => 'legal_docs/dti-registration.pdf',
            'valid_id' => 'legal_docs/valid-id.png',
            'tin_id' => 'legal_docs/tin-id.png',
        ]);
    }
}
