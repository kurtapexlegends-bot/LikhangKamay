<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ArtisanDocumentReview;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;

/**
 * Durable record of which KYC documents an admin has actually opened.
 *
 * The review gate used to live only in the session. On serverless production
 * (database sessions, one request per lambda) a dropped session write made a
 * blocked approval look successful, so the artisan stayed pending even though
 * the admin saw "approved". Reviews are now persisted, with the session kept
 * as a fast mirror for the current request.
 */
class ArtisanDocumentReviews
{
    public static function sessionKey(int|string $userId): string
    {
        return "artisan_review_docs_{$userId}";
    }

    /**
     * Allows the code to ship before the migration has run (Vercel does not
     * migrate on deploy); reviews fall back to the session until then.
     */
    public static function available(): bool
    {
        return (bool) rescue(fn () => Schema::hasTable('artisan_document_reviews'), false, false);
    }

    /**
     * @return array<int, string>
     */
    public static function keysFor(int|string $userId): array
    {
        $persisted = self::available()
            ? ArtisanDocumentReview::query()->where('user_id', $userId)->pluck('document_key')->all()
            : [];

        $mirrored = session()->get(self::sessionKey($userId), []);
        $mirrored = is_array($mirrored) ? $mirrored : [];

        return array_values(array_unique(array_merge($persisted, $mirrored)));
    }

    /**
     * @return array<int, string>
     */
    public static function mark(int|string $userId, string $documentKey, ?int $reviewerId = null): array
    {
        try {
            if (self::available()) {
                ArtisanDocumentReview::query()->updateOrCreate(
                    [
                        'user_id' => $userId,
                        'document_key' => $documentKey,
                    ],
                    [
                        'reviewed_by' => $reviewerId,
                        'reviewed_at' => now(),
                    ],
                );
            }
        } catch (QueryException $e) {
            // A concurrent double-click may insert the same review first; the
            // unique index makes that harmless, so re-read instead of failing.
            report($e);
        }

        $keys = self::keysFor($userId);

        // The database write is the durable path, but it may be unavailable
        // (migration not yet run) or fail. The key the admin just opened must
        // always be part of the mirror, otherwise the session is rewritten
        // without it and the progress bar resets to zero.
        if (!in_array($documentKey, $keys, true)) {
            $keys[] = $documentKey;
        }

        session()->put(self::sessionKey($userId), $keys);

        return $keys;
    }

    public static function forgetSession(int|string $userId): void
    {
        session()->forget(self::sessionKey($userId));
    }
}
