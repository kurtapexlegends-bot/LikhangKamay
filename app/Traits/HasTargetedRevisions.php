<?php

namespace App\Traits;

use App\Models\RevisionRequest;
use App\Support\RevisionSchemaRegistry;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Facades\Schema;

trait HasTargetedRevisions
{
    public function revisionRequests(): MorphMany
    {
        return $this->morphMany(RevisionRequest::class, 'revisable')->latest('id');
    }

    public function activeRevision(): MorphOne
    {
        return $this->morphOne(RevisionRequest::class, 'revisable')
            ->whereNull('resolved_at')
            ->latestOfMany();
    }

    public function latestRevision(): MorphOne
    {
        return $this->morphOne(RevisionRequest::class, 'revisable')->latestOfMany();
    }

    /**
     * Record a targeted revision request for this entity and supersede any older unresolved ones.
     */
    public function recordRevision(
        string $schemaKey,
        array $rawItems,
        ?string $summaryNote = null,
        ?int $reviewerId = null
    ): ?RevisionRequest {
        if (!rescue(fn () => Schema::hasTable('revision_requests'), false)) {
            return null;
        }

        $normalizedItems = RevisionSchemaRegistry::normalizeItems($schemaKey, $rawItems);
        $cleanNote = trim(strip_tags((string) $summaryNote));

        if (empty($normalizedItems) && $cleanNote === '') {
            return null;
        }

        // Attach snapshot of current values for deterministic diffing upon resubmission
        $normalizedItems = RevisionSchemaRegistry::attachSnapshots($this, $schemaKey, $normalizedItems);

        $this->revisionRequests()
            ->whereNull('resolved_at')
            ->update(['resolved_at' => now()]);

        return $this->revisionRequests()->create([
            'reviewer_id' => $reviewerId,
            'revision_items' => $normalizedItems,
            'summary_note' => $cleanNote !== '' ? $cleanNote : null,
            'resolved_at' => null,
        ]);
    }

    /**
     * Mark all open revision requests on this entity as resolved (called upon resubmission or approval).
     */
    public function resolveActiveRevisions(): void
    {
        if (!rescue(fn () => Schema::hasTable('revision_requests'), false)) {
            return;
        }

        $this->revisionRequests()
            ->whereNull('resolved_at')
            ->update(['resolved_at' => now()]);
    }

    /**
     * Format the currently active revision request for Inertia props/resources.
     */
    public function formatActiveRevisionForFrontend(): ?array
    {
        if (!rescue(fn () => Schema::hasTable('revision_requests'), false)) {
            return null;
        }

        $revision = $this->relationLoaded('activeRevision')
            ? $this->getRelation('activeRevision')
            : $this->activeRevision()->with('reviewer')->first();

        if (!$revision) {
            return null;
        }

        $items = is_array($revision->revision_items) ? $revision->revision_items : [];

        return [
            'id' => $revision->id,
            'summary_note' => $revision->summary_note,
            'items' => $items,
            'flagged_keys' => array_values(array_map(fn (array $item) => $item['key'] ?? '', $items)),
            'created_at' => $revision->created_at?->toIso8601String(),
            'reviewer_name' => $revision->reviewer?->name,
        ];
    }

    /**
     * Format revision review diff data for Super Admin inspection drawers.
     * Evaluates requested revision items and format feedback for reviewers.
     */
    public function formatRevisionReviewForAdmin(string $schemaKey): ?array
    {
        if (!rescue(fn () => Schema::hasTable('revision_requests'), false)) {
            return null;
        }

        /** @var \App\Models\RevisionRequest|null $latestRev */
        $latestRev = $this->relationLoaded('latestRevision')
            ? $this->getRelation('latestRevision')
            : $this->revisionRequests()->with('reviewer')->latest('id')->first();

        if (!$latestRev) {
            return null;
        }

        $items = is_array($latestRev->revision_items) ? $latestRev->revision_items : [];
        if (empty($items)) {
            return null;
        }

        // Determine if this is a resubmitted entity awaiting review
        $isPendingResubmission = false;
        if ($this instanceof \App\Models\User) {
            $isPendingResubmission = $this->artisan_status === 'pending'
                && $this->setup_completed_at !== null
                && ($latestRev->resolved_at !== null || $this->artisan_rejection_reason === null);
        } elseif ($this instanceof \App\Models\Product) {
            $isPendingResubmission = in_array($this->status, ['pending_review', 'Active'], true)
                && ($latestRev->resolved_at !== null || $this->rejection_reason === null);
        } elseif ($this instanceof \App\Models\SponsorshipRequest) {
            $isPendingResubmission = $this->status === 'pending'
                && ($latestRev->resolved_at !== null || $this->rejection_reason === null);
        } else {
            $isPendingResubmission = $latestRev->resolved_at !== null;
        }

        $evaluatedItems = [];

        foreach ($items as $item) {
            $key = $item['key'] ?? '';
            $summary = RevisionSchemaRegistry::summarizeChange($schemaKey, $key);

            $evaluatedItems[] = [
                'key' => $key,
                'label' => $item['label'] ?? $key,
                'group' => $item['group'] ?? 'General',
                'note' => $item['note'] ?? null,
                'is_changed' => true,
                'change_summary' => $summary,
            ];
        }

        $totalCount = count($evaluatedItems);

        return [
            'has_resubmitted_revision' => $isPendingResubmission,
            'revision_id' => $latestRev->id,
            'requested_at' => $latestRev->created_at?->format('M d, Y h:i A'),
            'resolved_at' => $latestRev->resolved_at?->format('M d, Y h:i A'),
            'reviewer_name' => $latestRev->reviewer?->name ?? 'Administrator',
            'summary_note' => $latestRev->summary_note,
            'total_items_count' => $totalCount,
            'items' => $evaluatedItems,
            'revised_keys' => array_values(array_map(fn ($it) => $it['key'], $evaluatedItems)),
        ];
    }
}
