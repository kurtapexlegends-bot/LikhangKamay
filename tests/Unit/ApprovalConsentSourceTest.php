<?php

namespace Tests\Unit;

use Tests\TestCase;

class ApprovalConsentSourceTest extends TestCase
{
    public function test_pending_artisan_review_source_tracks_document_previews_without_forcing_them_before_approval(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Admin/PendingArtisans.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString("route('admin.artisan.documents.viewed', viewingArtisan.id)", $source);
        $this->assertStringContainsString('disabled={processing}', $source);
        $this->assertStringContainsString('submitted documents previewed', $source);
        $this->assertStringNotContainsString('disabled={processing || !canApproveCurrentArtisan}', $source);
        $this->assertStringNotContainsString('Open every submitted document preview to enable approval.', $source);
        $this->assertStringNotContainsString('setApprovingArtisan', $source);
    }

    public function test_legal_modal_source_disables_accept_until_bottom_is_reached(): void
    {
        $source = file_get_contents(base_path('resources/js/Components/LegalModal.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString('setExpandedSections(buildExpandedSections(doc.sections));', $source);
        $this->assertStringContainsString('disabled={!hasReachedBottom}', $source);
        $this->assertStringContainsString('onScroll={handleContentScroll}', $source);
        $this->assertStringContainsString('Scroll to the bottom of this document before continuing.', $source);
    }

    public function test_registration_sources_open_legal_flow_from_checkbox_until_both_documents_are_accepted(): void
    {
        $buyerSource = file_get_contents(base_path('resources/js/Pages/Auth/Register.jsx'));
        $artisanSource = file_get_contents(base_path('resources/js/Pages/Auth/ArtisanRegister.jsx'));

        $this->assertNotFalse($buyerSource);
        $this->assertNotFalse($artisanSource);

        $this->assertStringContainsString('onChange={handleTermsCheckboxChange}', $buyerSource);
        $this->assertStringContainsString('onChange={handleTermsCheckboxChange}', $artisanSource);
        $this->assertStringContainsString('setIsGuidingTermsAcceptance(true);', $buyerSource);
        $this->assertStringContainsString('setIsGuidingTermsAcceptance(true);', $artisanSource);
        $this->assertStringContainsString('openNextRequiredLegalModal();', $buyerSource);
        $this->assertStringContainsString('openNextRequiredLegalModal();', $artisanSource);
        $this->assertStringNotContainsString('Open both documents and scroll to the bottom of each one to enable this checkbox.', $buyerSource);
        $this->assertStringNotContainsString('Open both documents and scroll to the bottom of each one to enable this checkbox.', $artisanSource);
    }
}
