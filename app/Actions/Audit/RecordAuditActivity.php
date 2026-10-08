<?php

namespace App\Actions\Audit;

use App\Models\PlatformActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RecordAuditActivity
{
    /**
     * Record a standardized audit activity with actor, subject, diff, and network telemetry.
     *
     * @param string $action Domain action identifier (e.g. 'payout.disbursed', 'order.status_updated')
     * @param string $description Plain-language human-readable description
     * @param Model|null $subject The subject model being modified (e.g. Payout, Order, Product, User)
     * @param array $diff Keyed array with ['before' => [...], 'after' => [...]] or contextual metadata
     * @param int|null $actorId Explicit actor ID (falls back to auth()->id())
     * @param Request|null $request Explicit request (falls back to request())
     * @return PlatformActivity
     */
    public function execute(
        string $action,
        string $description,
        ?Model $subject = null,
        array $diff = [],
        ?int $actorId = null,
        ?Request $request = null
    ): PlatformActivity {
        $req = $request ?: (app()->bound('request') ? request() : null);

        $metadata = array_merge([
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'diff' => $diff,
            'ip_address' => $req?->ip(),
            'user_agent' => $req?->userAgent() ? substr((string) $req->userAgent(), 0, 255) : null,
        ], $diff);

        return PlatformActivity::create([
            'user_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }
}
