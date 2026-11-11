<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FaceDescriptorService
{
    public const EXPECTED_DIMENSIONS = 128;

    // Euclidean distance below 0.50 strongly suggests the exact same person
    public const BANNED_MATCH_THRESHOLD = 0.50;

    /**
     * Validate and normalize an incoming 128-dimension face descriptor array.
     */
    public function normalizeDescriptor(mixed $input): ?array
    {
        if (is_string($input)) {
            $decoded = json_decode($input, true);
            $input = is_array($decoded) ? $decoded : null;
        }

        if (!is_array($input) || count($input) !== self::EXPECTED_DIMENSIONS) {
            return null;
        }

        $floats = [];
        foreach ($input as $val) {
            if (!is_numeric($val) || !is_finite((float) $val)) {
                return null;
            }
            $floats[] = round((float) $val, 6);
        }

        return $floats;
    }

    /**
     * Compute Euclidean distance between two 128-D normalized embeddings.
     */
    public function euclideanDistance(array $a, array $b): ?float
    {
        if (count($a) !== self::EXPECTED_DIMENSIONS || count($b) !== self::EXPECTED_DIMENSIONS) {
            return null;
        }

        $sum = 0.0;
        for ($i = 0; $i < self::EXPECTED_DIMENSIONS; $i++) {
            $diff = $a[$i] - $b[$i];
            $sum += $diff * $diff;
        }

        return sqrt($sum);
    }

    /**
     * Convert face-api Euclidean distance into a calibrated 0-100 similarity percentage.
     * Calibrated so d <= 0.56 maps >= 65% (Strong Match) and d >= 0.72 maps < 45% (Mismatch).
     */
    public function distanceToMatchPercentage(?float $distance): ?int
    {
        if ($distance === null || !is_finite($distance)) {
            return null;
        }

        $pct = (int) round(((1.05 - $distance) / 0.75) * 100);

        return max(0, min(100, $pct));
    }

    /**
     * Screen an incoming biometric descriptor against currently banned or suspended user accounts.
     */
    public function checkBannedDuplicate(array $descriptor, ?int $excludeUserId = null): array
    {
        $candidates = User::query()
            ->whereNotNull('face_descriptor')
            ->where(function ($query) {
                $query->whereNotNull('banned_at')
                    ->orWhere(function ($q) {
                        $q->whereNotNull('suspended_until')
                            ->where('suspended_until', '>', now());
                    });
            })
            ->when($excludeUserId !== null, fn ($q) => $q->where('id', '!=', $excludeUserId))
            ->select(['id', 'face_descriptor'])
            ->limit(250)
            ->get();

        foreach ($candidates as $candidate) {
            $candidateDesc = $this->normalizeDescriptor($candidate->face_descriptor);
            if (!$candidateDesc) {
                continue;
            }

            $distance = $this->euclideanDistance($descriptor, $candidateDesc);
            if ($distance !== null && $distance <= self::BANNED_MATCH_THRESHOLD) {
                return [
                    'matched_banned' => true,
                    'matched_user_id' => $candidate->id,
                    'distance' => round($distance, 4),
                ];
            }
        }

        return [
            'matched_banned' => false,
            'matched_user_id' => null,
            'distance' => null,
        ];
    }

    /**
     * Store a base64 JPEG/PNG live liveness snapshot onto the active public/cloud storage disk.
     */
    public function storeSelfieDataUrl(?string $dataUrl, int|string $ownerTag): ?string
    {
        if (!$dataUrl || !is_string($dataUrl)) {
            return null;
        }

        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i', $dataUrl, $matches)) {
            return null;
        }

        $ext = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
        $binary = base64_decode($matches[2], true);

        if ($binary === false || strlen($binary) < 512 || strlen($binary) > 1024 * 1024) {
            return null;
        }

        $filename = 'kyc_selfies/' . $ownerTag . '_' . Str::random(12) . '.' . $ext;
        $stored = rescue(fn () => Storage::disk('public')->put($filename, $binary), false, report: false);

        return $stored ? $filename : null;
    }
}
