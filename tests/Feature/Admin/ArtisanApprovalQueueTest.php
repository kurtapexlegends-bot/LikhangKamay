<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Support\ArtisanDocumentReviews;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ArtisanApprovalQueueTest extends TestCase
{
    use RefreshDatabase;

    private function pendingArtisanWithAllDocuments(): User
    {
        return User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'shop_name' => 'Area C Pottery',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
            'business_permit' => 'legal_docs/business-permit.pdf',
            'dti_registration' => 'legal_docs/dti-registration.pdf',
            'valid_id' => 'legal_docs/valid-id.png',
            'tin_id' => 'legal_docs/tin-id.png',
        ]);
    }

    private function admin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);
    }

    public function test_approved_artisan_disappears_from_the_pending_queue(): void
    {
        $admin = $this->admin();
        $artisan = $this->pendingArtisanWithAllDocuments();

        $this->actingAs($admin)
            ->withSession(["artisan_review_docs_{$artisan->id}" => [
                'business_permit', 'dti_registration', 'valid_id', 'tin_id',
            ]])
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertRedirect();

        $this->assertSame('approved', $artisan->fresh()->artisan_status);

        $this->actingAs($admin)
            ->get(route('admin.users.manager', ['tab' => 'approvals']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users/UserManager')
                ->where('artisans', fn ($artisans) => collect($artisans)->pluck('id')->doesntContain($artisan->id))
            );
    }

    public function test_document_previews_are_persisted_and_survive_an_empty_session(): void
    {
        $admin = $this->admin();
        $artisan = $this->pendingArtisanWithAllDocuments();

        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $document) {
            $this->actingAs($admin)
                ->postJson(route('admin.artisan.documents.viewed', $artisan->id), ['document' => $document])
                ->assertOk();
        }

        $this->assertDatabaseCount('artisan_document_reviews', 4);

        // Simulate a fresh serverless request where the session mirror was lost.
        session()->forget("artisan_review_docs_{$artisan->id}");

        $this->actingAs($admin)
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertRedirect();

        $this->assertSame('approved', $artisan->fresh()->artisan_status);
    }

    public function test_document_previews_accumulate_when_the_review_table_is_missing(): void
    {
        $admin = $this->admin();
        $artisan = $this->pendingArtisanWithAllDocuments();

        // Production may not have run the migration yet; the session mirror
        // must still accumulate instead of being overwritten with old keys.
        Schema::shouldReceive('hasTable')
            ->with('artisan_document_reviews')
            ->andReturn(false);

        $keys = [];
        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $document) {
            $keys = ArtisanDocumentReviews::mark($artisan->id, $document, $admin->id);
        }

        $this->assertSame(
            ['business_permit', 'dti_registration', 'valid_id', 'tin_id'],
            $keys,
        );
        $this->assertSame($keys, session("artisan_review_docs_{$artisan->id}"));
    }

    public function test_approval_without_previewing_documents_is_rejected_and_keeps_the_queue(): void
    {
        $admin = $this->admin();
        $artisan = $this->pendingArtisanWithAllDocuments();

        $this->actingAs($admin)
            ->post(route('admin.artisan.approve', $artisan->id))
            ->assertSessionHasErrors('documents');

        $this->assertSame('pending', $artisan->fresh()->artisan_status);

        $this->actingAs($admin)
            ->get(route('admin.users.manager', ['tab' => 'approvals']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('artisans', fn ($artisans) => collect($artisans)->pluck('id')->contains($artisan->id))
            );
    }
}
