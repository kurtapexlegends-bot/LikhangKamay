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
}
