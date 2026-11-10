<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;

class DocumentForensicsService
{
    private const AI_GENERATOR_SIGNATURES = [
        'dall-e',
        'openai',
        'midjourney',
        'stable diffusion',
        'comfyui',
        'automatic1111',
        'c2pa',
        'adobe firefly',
        'bing image creator',
        'dreamstudio',
        'leonardo.ai',
        'chatgpt',
    ];

    private const EDITOR_SOFTWARE_SIGNATURES = [
        'photoshop',
        'adobe photoshop',
        'canva',
        'gimp',
        'picsart',
        'pixlr',
        'remini',
        'fotor',
        'illustrator',
        'affinity photo',
    ];

    /**
     * Inspect an uploaded image file (Valid ID / Selfie / Permit) for AI generation or editing signals.
     */
    public function inspectUploadedFile(UploadedFile|string $fileOrPath, bool $isCameraCapture = false): array
    {
        $path = $fileOrPath instanceof UploadedFile ? $fileOrPath->getRealPath() : $fileOrPath;
        $extension = $fileOrPath instanceof UploadedFile
            ? strtolower($fileOrPath->getClientOriginalExtension())
            : strtolower(pathinfo((string) $fileOrPath, PATHINFO_EXTENSION));

        if ($extension === 'pdf' || !$path || !is_readable($path)) {
            return [
                'status' => 'clean',
                'points' => 15,
                'has_camera_exif' => false,
                'has_editor_or_ai_tag' => false,
                'signals' => $extension === 'pdf' ? ['Uploaded as PDF scan'] : [],
            ];
        }

        $signals = [];
        $hasCameraExif = false;
        $hasEditorOrAiTag = false;
        $points = 20;

        // 1. Dimension heuristic (AI outputs commonly produce square synthetic resolutions)
        $imageInfo = rescue(fn () => @getimagesize($path), null, report: false);
        if (is_array($imageInfo)) {
            $width = (int) ($imageInfo[0] ?? 0);
            $height = (int) ($imageInfo[1] ?? 0);
            $mime = (string) ($imageInfo['mime'] ?? '');

            if ($width > 0 && $width === $height && in_array($width, [512, 768, 1024, 1536, 2048], true) && !$isCameraCapture) {
                $signals[] = "Exact synthetic square resolution ({$width}×{$height}px) detected";
                $points -= 10;
            }

            if ($mime === 'image/png' && !$isCameraCapture) {
                $signals[] = 'PNG image without live camera framing';
                $points -= 5;
            }
        }

        // 2. Binary header / chunk scan (catches PNG tEXt/iTXt prompts & XMP software signatures safely)
        $headerSlice = rescue(fn () => @file_get_contents($path, false, null, 0, 131072), '', report: false);
        if (is_string($headerSlice) && $headerSlice !== '') {
            $lowerHeader = strtolower($headerSlice);

            foreach (self::AI_GENERATOR_SIGNATURES as $sig) {
                if (str_contains($lowerHeader, $sig)) {
                    $signals[] = 'AI generator metadata tag detected (' . strtoupper($sig) . ')';
                    $hasEditorOrAiTag = true;
                    $points = 0;
                    break;
                }
            }

            if (!$hasEditorOrAiTag) {
                foreach (self::EDITOR_SOFTWARE_SIGNATURES as $sig) {
                    if (str_contains($lowerHeader, $sig)) {
                        $signals[] = 'Image editing software tag detected (' . ucfirst($sig) . ')';
                        $hasEditorOrAiTag = true;
                        $points = min($points, 5);
                        break;
                    }
                }
            }
        }

        // 3. Hardware camera EXIF check on JPEG files
        if (function_exists('exif_read_data') && in_array($extension, ['jpg', 'jpeg'], true)) {
            $exif = rescue(fn () => @exif_read_data($path, 'IFD0', true), null, report: false);
            if (is_array($exif)) {
                $ifd0 = $exif['IFD0'] ?? [];
                $software = strtolower((string) ($ifd0['Software'] ?? ''));
                $make = trim((string) ($ifd0['Make'] ?? ''));
                $model = trim((string) ($ifd0['Model'] ?? ''));

                if ($make !== '' || $model !== '') {
                    $hasCameraExif = true;
                }

                if ($software !== '' && !$hasEditorOrAiTag) {
                    foreach (array_merge(self::AI_GENERATOR_SIGNATURES, self::EDITOR_SOFTWARE_SIGNATURES) as $sig) {
                        if (str_contains($software, $sig)) {
                            $signals[] = 'Software tag detected in camera header (' . ucfirst($sig) . ')';
                            $hasEditorOrAiTag = true;
                            $points = min($points, 5);
                            break;
                        }
                    }
                }
            }

            if (!$hasCameraExif && !$isCameraCapture && !$hasEditorOrAiTag) {
                $signals[] = 'No camera device metadata found (may be compressed or saved from messaging app)';
                $points = min($points, 12);
            }
        }

        $points = max(0, min(20, $points));
        $status = $hasEditorOrAiTag
            ? 'high_risk'
            : ($points < 15 ? 'review_flagged' : 'clean');

        return [
            'status' => $status,
            'points' => $points,
            'has_camera_exif' => $hasCameraExif || $isCameraCapture,
            'has_editor_or_ai_tag' => $hasEditorOrAiTag,
            'signals' => $signals,
        ];
    }

    /**
     * Compute calibrated 100-point composite KYC authenticity criteria score for Admin review.
     */
    public function computeCompositeScore(array $params): array
    {
        $livenessPassed = (bool) ($params['liveness_passed'] ?? false);
        $matchScore = isset($params['match_score']) && $params['match_score'] !== null
            ? (int) $params['match_score']
            : null;
        $idFaceDetected = (bool) ($params['id_face_detected'] ?? ($matchScore !== null));
        $forensics = is_array($params['forensics'] ?? null) ? $params['forensics'] : ['points' => 12, 'status' => 'clean', 'signals' => []];
        $bannedFaceMatch = (bool) ($params['banned_face_match'] ?? false);
        $cameraCaptured = (bool) ($params['camera_captured'] ?? false);

        // 1. Liveness (30 pts)
        $livenessPts = $livenessPassed ? 30 : 0;

        // 2. Selfie-to-ID Similarity (40 pts)
        if ($matchScore !== null) {
            if ($matchScore >= 65) {
                $matchPts = 40;
            } elseif ($matchScore >= 45) {
                $matchPts = 25;
            } else {
                $matchPts = 5;
            }
        } else {
            $matchPts = $idFaceDetected ? 15 : 10;
        }

        // 3. Document Authenticity Forensics (20 pts)
        $forensicsPts = (int) ($forensics['points'] ?? 12);
        if ($cameraCaptured && $forensicsPts < 18 && ($forensics['status'] ?? 'clean') !== 'high_risk') {
            $forensicsPts = 20;
        }

        // 4. Duplicate / Banned Face Check (10 pts)
        $duplicatePts = $bannedFaceMatch ? 0 : 10;

        $totalScore = max(0, min(100, $livenessPts + $matchPts + $forensicsPts + $duplicatePts));

        if ($totalScore >= 75 && !$bannedFaceMatch) {
            $band = 'strong';
            $bandLabel = 'Strong Verification';
        } elseif ($totalScore >= 50 && !$bannedFaceMatch) {
            $band = 'manual_review';
            $bandLabel = 'Needs Careful Check';
        } else {
            $band = 'high_risk';
            $bandLabel = 'High Risk — Inspect Carefully';
        }

        $signals = array_values($forensics['signals'] ?? []);
        if ($matchScore !== null && $matchScore < 45) {
            $signals[] = "Low face similarity between live selfie and Valid ID ({$matchScore}%)";
        } elseif ($matchScore !== null && $matchScore < 65) {
            $signals[] = "Borderline selfie-to-ID similarity ({$matchScore}%) — check lighting or age difference";
        } elseif ($idFaceDetected === false) {
            $signals[] = 'No portrait face clearly detected on uploaded Valid ID';
        }
        if ($bannedFaceMatch) {
            $signals[] = 'Face geometry resembles an existing suspended or banned account';
        }

        return [
            'confidence_score' => $totalScore,
            'band' => $band,
            'band_label' => $bandLabel,
            'liveness_passed' => $livenessPassed,
            'match_score' => $matchScore,
            'id_face_detected' => $idFaceDetected,
            'forensics_status' => $forensics['status'] ?? 'clean',
            'camera_captured' => $cameraCaptured,
            'banned_face_match' => $bannedFaceMatch,
            'signals' => array_values(array_unique($signals)),
        ];
    }
}
