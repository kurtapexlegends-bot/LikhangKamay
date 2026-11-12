<?php

declare(strict_types=1);

namespace App\Services;

use App\Casts\PostgresCompatibleBoolean;
use App\Models\Order;
use App\Models\PlatformActivity;
use App\Models\PlatformPolicy;
use App\Models\User;
use App\Models\UserPolicyConsent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PolicyService
{
    private const CACHE_TTL_SECONDS = 300;

    public static function cacheKey(string $type): string
    {
        return "platform_policy_active_{$type}";
    }

    public function clearPolicyCache(?string $type = null): void
    {
        if ($type !== null) {
            Cache::forget(self::cacheKey($type));
            return;
        }

        foreach (PlatformPolicy::ALL_TYPES as $policyType) {
            Cache::forget(self::cacheKey($policyType));
        }
    }

    private function tableExists(string $table): bool
    {
        $cacheKey = "policy_service_table_exists_{$table}";
        if (Cache::get($cacheKey) === true) {
            return true;
        }

        $exists = rescue(fn () => Schema::hasTable($table), false, report: false);
        if ($exists) {
            Cache::put($cacheKey, true, self::CACHE_TTL_SECONDS);
        }

        return $exists;
    }

    public function getActivePolicy(string $type): ?PlatformPolicy
    {
        return rescue(function () use ($type) {
            $cached = Cache::get(self::cacheKey($type));
            if ($cached instanceof PlatformPolicy) {
                return $cached;
            }
            if ($cached === false) {
                return null;
            }

            $lookup = function () use ($type) {
                if (!$this->tableExists('platform_policies')) {
                    return null;
                }

                return PlatformPolicy::query()
                    ->ofType($type)
                    ->active()
                    ->orderByDesc('published_at')
                    ->orderByDesc('id')
                    ->first();
            };

            $policy = DB::transactionLevel() > 0
                ? DB::transaction($lookup)
                : $lookup();

            Cache::put(self::cacheKey($type), $policy ?? false, self::CACHE_TTL_SECONDS);

            return $policy;
        }, null, report: false);
    }

    /**
     * @return array<string, mixed>
     */
    public function getSerializedActivePolicy(string $type): array
    {
        $policy = $this->getActivePolicy($type);
        $fallback = self::defaultPolicyDefinitions()[$type] ?? [
            'title' => Str::headline($type),
            'version' => '1.0',
            'content_markdown' => '',
            'structured_criteria' => null,
        ];

        $contentMarkdown = $policy?->content_markdown ?? $fallback['content_markdown'];
        $parsed = self::parseMarkdownSections($contentMarkdown);
        $criteria = $policy?->structured_criteria ?? $fallback['structured_criteria'];

        if ($type === PlatformPolicy::TYPE_RETURN_REFUND) {
            $criteria = $this->normalizeReturnCriteria(is_array($criteria) ? $criteria : []);
        }

        return [
            'id' => $policy?->id,
            'type' => $type,
            'title' => $policy?->title ?? $fallback['title'],
            'version' => $policy?->version ?? $fallback['version'],
            'content_markdown' => $contentMarkdown,
            'intro' => $parsed['intro'],
            'sections' => $parsed['sections'],
            'structured_criteria' => $criteria,
            'published_at' => $policy?->published_at?->toIso8601String(),
            'published_at_formatted' => $policy?->published_at?->format('F j, Y'),
        ];
    }

    /**
     * @param  array<int, string>  $types
     * @return array<string, array<string, mixed>>
     */
    public function getSerializedActivePolicies(array $types): array
    {
        $result = [];
        foreach ($types as $type) {
            $result[$type] = $this->getSerializedActivePolicy($type);
        }

        return $result;
    }

    public function getReturnWindowHours(): int
    {
        $policy = $this->getSerializedActivePolicy(PlatformPolicy::TYPE_RETURN_REFUND);
        $hours = (int) ($policy['structured_criteria']['return_window_hours'] ?? 24);

        return max(1, $hours);
    }

    public function getWarrantyExpirationTimestamp(?Carbon $from = null): Carbon
    {
        return ($from ?? now())->copy()->addHours($this->getReturnWindowHours());
    }

    public function resolveDeliveryWindowHoursForOrder(Order $order): int
    {
        if ($order->delivered_at && $order->warranty_expires_at && $order->warranty_expires_at->greaterThan($order->delivered_at)) {
            $hours = (int) round($order->delivered_at->diffInMinutes($order->warranty_expires_at) / 60);
            if ($hours >= 1) {
                return $hours;
            }
        }

        return $this->getReturnWindowHours();
    }

    /**
     * Publish a new policy version and mark it active.
     *
     * @param  array<string, mixed>  $data
     */
    public function publishPolicyVersion(string $type, array $data, User $actor): PlatformPolicy
    {
        if (!in_array($type, PlatformPolicy::ALL_TYPES, true)) {
            throw new \InvalidArgumentException("Unsupported policy type: {$type}");
        }

        $policy = DB::transaction(function () use ($type, $data, $actor) {
            $existingVersions = PlatformPolicy::query()
                ->ofType($type)
                ->pluck('version')
                ->all();

            $version = trim((string) ($data['version'] ?? ''));
            if ($version === '') {
                $version = $this->suggestNextVersion($existingVersions);
            }

            if (PlatformPolicy::query()->ofType($type)->where('version', $version)->exists()) {
                throw new \RuntimeException("Version {$version} already exists for this policy. Please provide a new version number.");
            }

            PlatformPolicy::query()
                ->ofType($type)
                ->where('is_active', PostgresCompatibleBoolean::dbVal(true))
                ->update(['is_active' => PostgresCompatibleBoolean::dbVal(false)]);

            $structuredCriteria = $data['structured_criteria'] ?? null;
            if ($type === PlatformPolicy::TYPE_RETURN_REFUND) {
                $structuredCriteria = $this->normalizeReturnCriteria(is_array($structuredCriteria) ? $structuredCriteria : []);
            }

            return PlatformPolicy::create([
                'type' => $type,
                'title' => trim((string) $data['title']),
                'version' => $version,
                'content_markdown' => trim((string) $data['content_markdown']),
                'structured_criteria' => $structuredCriteria,
                'is_active' => true,
                'published_at' => now(),
                'created_by' => $actor->id,
            ]);
        });

        $this->clearPolicyCache($type);

        rescue(function () use ($policy, $actor) {
            PlatformActivity::log(
                'POLICY_PUBLISHED',
                "Published {$policy->title} v{$policy->version} ({$policy->type})",
                [
                    'policy_id' => $policy->id,
                    'type' => $policy->type,
                    'version' => $policy->version,
                    'actor_id' => $actor->id,
                ]
            );
        }, report: false);

        return $policy;
    }

    public function activatePolicyVersion(PlatformPolicy $policy, User $actor): PlatformPolicy
    {
        DB::transaction(function () use ($policy) {
            PlatformPolicy::query()
                ->ofType($policy->type)
                ->where('is_active', PostgresCompatibleBoolean::dbVal(true))
                ->update(['is_active' => PostgresCompatibleBoolean::dbVal(false)]);

            $policy->update([
                'is_active' => true,
                'published_at' => $policy->published_at ?? now(),
            ]);
        });

        $this->clearPolicyCache($policy->type);

        rescue(function () use ($policy, $actor) {
            PlatformActivity::log(
                'POLICY_ACTIVATED',
                "Activated {$policy->title} v{$policy->version} ({$policy->type})",
                [
                    'policy_id' => $policy->id,
                    'type' => $policy->type,
                    'version' => $policy->version,
                    'actor_id' => $actor->id,
                ]
            );
        }, report: false);

        return $policy->fresh();
    }

    /**
     * @param  array<string, mixed>|null  $criteriaAcknowledged
     */
    public function recordUserConsent(
        User $user,
        string $type,
        string $context,
        ?Request $request = null,
        ?int $orderId = null,
        ?array $criteriaAcknowledged = null,
        ?PlatformPolicy $explicitPolicy = null
    ): ?UserPolicyConsent {
        return rescue(function () use ($user, $type, $context, $request, $orderId, $criteriaAcknowledged, $explicitPolicy) {
            $persist = function () use ($user, $type, $context, $request, $orderId, $criteriaAcknowledged, $explicitPolicy) {
                if (!$this->tableExists('user_policy_consents')) {
                    return null;
                }

                $policy = $explicitPolicy ?? $this->getActivePolicy($type);
                $fallback = self::defaultPolicyDefinitions()[$type] ?? ['version' => '1.0'];
                $req = $request ?? request();

                return UserPolicyConsent::create([
                    'user_id' => $user->id,
                    'platform_policy_id' => $policy?->id,
                    'policy_type' => $type,
                    'policy_version' => $policy?->version ?? ($fallback['version'] ?? '1.0'),
                    'context' => $context,
                    'order_id' => $orderId,
                    'criteria_acknowledged' => $criteriaAcknowledged,
                    'accepted_at' => now(),
                    'ip_address' => $req?->ip(),
                    'user_agent' => $req?->userAgent() ? Str::limit((string) $req->userAgent(), 1000, '') : null,
                ]);
            };

            return DB::transactionLevel() > 0
                ? DB::transaction($persist)
                : $persist();
        }, null, report: false);
    }

    /**
     * Dynamically evaluate active return/refund criteria before buyer dispute creation.
     *
     * @param  array<string, mixed>  $input
     * @param  array<int, mixed>  $photos
     * @return array<string, mixed>
     * @throws \RuntimeException
     */
    public function evaluateReturnCriteria(Order $order, array $input, array $photos, bool $requireStructuredFields = false): array
    {
        if ($order->status !== 'Completed') {
            throw new \RuntimeException('This order is not completed.');
        }

        $activePolicy = $this->getActivePolicy(PlatformPolicy::TYPE_RETURN_REFUND);
        $serialized = $this->getSerializedActivePolicy(PlatformPolicy::TYPE_RETURN_REFUND);
        $criteria = $serialized['structured_criteria'] ?? [];
        $windowHours = max(1, (int) ($criteria['return_window_hours'] ?? 24));

        $completionDate = $order->received_at ?? $order->updated_at;
        if ($order->warranty_expires_at) {
            if ($order->received_at && $order->warranty_expires_at->lessThanOrEqualTo($order->received_at)) {
                $warrantyExpires = $order->received_at->copy()->addHours($windowHours);
            } else {
                $warrantyExpires = $order->warranty_expires_at;
            }
        } else {
            $warrantyExpires = $completionDate ? $completionDate->copy()->addHours($windowHours) : null;
        }

        if (!$warrantyExpires || now()->greaterThan($warrantyExpires)) {
            $windowLabel = $windowHours % 24 === 0
                ? (($windowHours / 24) === 1 ? '1 day' : ($windowHours / 24) . ' days')
                : "{$windowHours} hours";
            throw new \RuntimeException("Dispute window has expired. Disputes must be filed within {$windowLabel} of receiving the order.");
        }

        if (empty($photos)) {
            throw new \RuntimeException('At least 1 proof photo is required.');
        }

        $maxPhotos = max(1, min(5, (int) ($criteria['max_photos'] ?? 5)));
        if (count($photos) > $maxPhotos) {
            throw new \RuntimeException("You may upload at most {$maxPhotos} proof photos.");
        }

        $mandatoryAngles = collect($criteria['mandatory_photo_angles'] ?? [])
            ->filter(fn ($angle) => is_array($angle) && ($angle['required'] ?? true))
            ->values();

        $hasStructuredSubmission = $requireStructuredFields
            || array_key_exists('policy_id', $input)
            || array_key_exists('damage_reason_code', $input)
            || array_key_exists('checklist_confirmations', $input)
            || array_key_exists('photo_angle_keys', $input);

        if ($hasStructuredSubmission && $mandatoryAngles->isNotEmpty() && count($photos) < $mandatoryAngles->count()) {
            $labels = $mandatoryAngles->pluck('label')->filter()->implode(', ');
            throw new \RuntimeException(
                "At least {$mandatoryAngles->count()} proof photos are required ({$labels})."
            );
        }

        $enabledReasons = collect($criteria['eligible_reasons'] ?? [])
            ->filter(fn ($r) => is_array($r) && ($r['enabled'] ?? true))
            ->keyBy('code');

        $selectedReasonCode = isset($input['damage_reason_code']) ? trim((string) $input['damage_reason_code']) : null;
        $selectedReasonLabel = null;

        if ($hasStructuredSubmission) {
            if ($enabledReasons->isNotEmpty()) {
                if (!$selectedReasonCode || !$enabledReasons->has($selectedReasonCode)) {
                    throw new \RuntimeException('Please select an eligible return/refund reason from the active policy criteria.');
                }
                $selectedReasonLabel = (string) ($enabledReasons->get($selectedReasonCode)['label'] ?? $selectedReasonCode);
            }

            $requiredChecklist = collect($criteria['checklist_items'] ?? [])
                ->filter(fn ($item) => is_array($item) && ($item['required'] ?? true))
                ->values();

            $confirmedKeys = collect($input['checklist_confirmations'] ?? [])
                ->map(fn ($k) => (string) $k)
                ->filter()
                ->values()
                ->all();

            foreach ($requiredChecklist as $item) {
                $key = (string) ($item['key'] ?? '');
                if ($key !== '' && !in_array($key, $confirmedKeys, true)) {
                    throw new \RuntimeException('All required return eligibility criteria must be confirmed before filing a dispute.');
                }
            }

            $providedAngleKeys = collect($input['photo_angle_keys'] ?? [])
                ->map(fn ($k) => (string) $k)
                ->values()
                ->all();

            foreach ($mandatoryAngles as $angle) {
                $angleKey = (string) ($angle['key'] ?? '');
                if ($angleKey !== '' && !in_array($angleKey, $providedAngleKeys, true)) {
                    $label = (string) ($angle['label'] ?? $angleKey);
                    throw new \RuntimeException("Missing required proof photo for angle: {$label}.");
                }
            }
        }

        $allAnglesByKey = collect($criteria['mandatory_photo_angles'] ?? [])->keyBy('key');
        $providedAngleKeys = array_values((array) ($input['photo_angle_keys'] ?? []));
        $photoAngleRecords = [];
        foreach (array_values($photos) as $index => $photo) {
            $angleKey = $providedAngleKeys[$index] ?? ($index < $mandatoryAngles->count() ? ($mandatoryAngles[$index]['key'] ?? "angle_{$index}") : "extra_{$index}");
            $angleDef = $allAnglesByKey->get($angleKey);
            $photoAngleRecords[] = [
                'index' => $index,
                'angle_key' => (string) $angleKey,
                'angle_label' => is_array($angleDef) ? (string) ($angleDef['label'] ?? $angleKey) : 'Additional Angle',
            ];
        }

        $confirmedKeys = array_values(array_filter(array_map('strval', (array) ($input['checklist_confirmations'] ?? []))));
        $checklistSnapshot = collect($criteria['checklist_items'] ?? [])
            ->filter(fn ($item) => is_array($item))
            ->map(function ($item) use ($confirmedKeys, $hasStructuredSubmission) {
                $key = (string) ($item['key'] ?? '');
                return [
                    'key' => $key,
                    'label' => (string) ($item['label'] ?? $key),
                    'required' => (bool) ($item['required'] ?? true),
                    'confirmed' => $hasStructuredSubmission ? in_array($key, $confirmedKeys, true) : true,
                ];
            })
            ->values()
            ->all();

        return [
            'policy' => $activePolicy,
            'policy_id' => $activePolicy?->id,
            'policy_version' => $serialized['version'],
            'damage_reason_code' => $selectedReasonCode,
            'damage_reason_label' => $selectedReasonLabel,
            'criteria_checklist' => $checklistSnapshot,
            'photo_angles' => $photoAngleRecords,
            'has_explicit_consent' => $hasStructuredSubmission,
        ];
    }

    /**
     * @param  array<string, mixed>  $criteria
     * @return array<string, mixed>
     */
    public function normalizeReturnCriteria(array $criteria): array
    {
        $defaults = self::defaultReturnCriteria();

        $windowHours = max(1, min(720, (int) ($criteria['return_window_hours'] ?? $defaults['return_window_hours'])));
        $maxPhotos = max(1, min(5, (int) ($criteria['max_photos'] ?? $defaults['max_photos'])));

        $reasons = collect($criteria['eligible_reasons'] ?? $defaults['eligible_reasons'])
            ->filter(fn ($item) => is_array($item) && trim((string) ($item['label'] ?? '')) !== '')
            ->map(function ($item, $idx) {
                $label = trim((string) $item['label']);
                $code = trim((string) ($item['code'] ?? ''));
                if ($code === '') {
                    $code = Str::slug($label, '_') ?: "reason_{$idx}";
                }
                return [
                    'code' => $code,
                    'label' => $label,
                    'requires_description' => (bool) ($item['requires_description'] ?? true),
                    'enabled' => (bool) ($item['enabled'] ?? true),
                ];
            })
            ->values()
            ->all();

        $angles = collect($criteria['mandatory_photo_angles'] ?? $defaults['mandatory_photo_angles'])
            ->filter(fn ($item) => is_array($item) && trim((string) ($item['label'] ?? '')) !== '')
            ->take(5)
            ->map(function ($item, $idx) {
                $label = trim((string) $item['label']);
                $key = trim((string) ($item['key'] ?? ''));
                if ($key === '') {
                    $key = Str::slug($label, '_') ?: "angle_{$idx}";
                }
                return [
                    'key' => $key,
                    'label' => $label,
                    'required' => (bool) ($item['required'] ?? true),
                ];
            })
            ->values()
            ->all();

        $checklist = collect($criteria['checklist_items'] ?? $defaults['checklist_items'])
            ->filter(fn ($item) => is_array($item) && trim((string) ($item['label'] ?? '')) !== '')
            ->map(function ($item, $idx) {
                $label = trim((string) $item['label']);
                $key = trim((string) ($item['key'] ?? ''));
                if ($key === '') {
                    $key = Str::slug($label, '_') ?: "criterion_{$idx}";
                }
                return [
                    'key' => $key,
                    'label' => $label,
                    'required' => (bool) ($item['required'] ?? true),
                ];
            })
            ->values()
            ->all();

        $requiredAnglesCount = collect($angles)->filter(fn ($angle) => (bool) ($angle['required'] ?? false))->count();
        $maxPhotos = max($maxPhotos, min(5, $requiredAnglesCount));

        return [
            'return_window_hours' => $windowHours,
            'max_photos' => $maxPhotos,
            'eligible_reasons' => $reasons,
            'mandatory_photo_angles' => $angles,
            'checklist_items' => $checklist,
        ];
    }

    /**
     * @param  array<int, string>  $existingVersions
     */
    private function suggestNextVersion(array $existingVersions): string
    {
        $maxMajor = 1;
        $maxMinor = 0;

        foreach ($existingVersions as $ver) {
            if (preg_match('/^(\d+)\.(\d+)/', (string) $ver, $matches)) {
                $major = (int) $matches[1];
                $minor = (int) $matches[2];
                if ($major > $maxMajor || ($major === $maxMajor && $minor >= $maxMinor)) {
                    $maxMajor = $major;
                    $maxMinor = $minor + 1;
                }
            }
        }

        if (empty($existingVersions)) {
            return '1.0';
        }

        return "{$maxMajor}.{$maxMinor}";
    }

    /**
     * @return array{intro: string, sections: array<int, array{title: string, content: string}>}
     */
    public static function parseMarkdownSections(string $markdown): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($markdown));
        if ($normalized === '') {
            return ['intro' => '', 'sections' => []];
        }

        $lines = explode("\n", $normalized);
        $introLines = [];
        $sections = [];
        $currentTitle = null;
        $currentLines = [];

        foreach ($lines as $line) {
            if (preg_match('/^##\s+(.+)$/', $line, $matches)) {
                if ($currentTitle !== null) {
                    $sections[] = [
                        'title' => trim($currentTitle),
                        'content' => trim(implode("\n", $currentLines)),
                    ];
                }
                $currentTitle = trim($matches[1]);
                $currentLines = [];
                continue;
            }

            if ($currentTitle === null) {
                $introLines[] = $line;
            } else {
                $currentLines[] = $line;
            }
        }

        if ($currentTitle !== null) {
            $sections[] = [
                'title' => trim($currentTitle),
                'content' => trim(implode("\n", $currentLines)),
            ];
        } elseif (empty($sections) && !empty($introLines)) {
            $sections[] = [
                'title' => 'Policy Overview',
                'content' => trim(implode("\n", $introLines)),
            ];
            $introLines = [];
        }

        return [
            'intro' => trim(implode("\n", $introLines)),
            'sections' => $sections,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultReturnCriteria(): array
    {
        return [
            'return_window_hours' => 24,
            'max_photos' => 5,
            'eligible_reasons' => [
                [
                    'code' => 'damaged_in_transit',
                    'label' => 'Item arrived damaged or broken',
                    'requires_description' => true,
                    'enabled' => true,
                ],
                [
                    'code' => 'defective_craftsmanship',
                    'label' => 'Structural or glaze defect',
                    'requires_description' => true,
                    'enabled' => true,
                ],
                [
                    'code' => 'wrong_item',
                    'label' => 'Wrong item or variant received',
                    'requires_description' => true,
                    'enabled' => true,
                ],
                [
                    'code' => 'missing_parts',
                    'label' => 'Missing components or incomplete order',
                    'requires_description' => true,
                    'enabled' => true,
                ],
                [
                    'code' => 'significantly_not_as_described',
                    'label' => 'Significantly different from listing',
                    'requires_description' => true,
                    'enabled' => true,
                ],
            ],
            'mandatory_photo_angles' => [
                [
                    'key' => 'item_defect',
                    'label' => 'Item Defect / Damage Close-up',
                    'required' => true,
                ],
                [
                    'key' => 'shipping_packaging',
                    'label' => 'Shipping Packaging & Waybill',
                    'required' => true,
                ],
            ],
            'checklist_items' => [
                [
                    'key' => 'within_window',
                    'label' => 'I am submitting this claim within the active return inspection window after delivery.',
                    'required' => true,
                ],
                [
                    'key' => 'unmodified_item',
                    'label' => 'The item has not been altered, used, or intentionally damaged after receipt.',
                    'required' => true,
                ],
                [
                    'key' => 'accurate_evidence',
                    'label' => 'My uploaded photos accurately show the defect and shipping packaging.',
                    'required' => true,
                ],
            ],
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function defaultPolicyDefinitions(): array
    {
        return [
            PlatformPolicy::TYPE_RETURN_REFUND => [
                'title' => 'Return, Refund & Replacement Policy',
                'version' => '1.0',
                'structured_criteria' => self::defaultReturnCriteria(),
                'content_markdown' => <<<'MD'
LikhangKamay protects buyers and artisans with clear, verifiable return and replacement standards for handcrafted pottery, ceramics, and clay products.

## Inspection & Return Window
Delivered orders carry a 24-hour (1-day) inspection window from delivery and completion, unless an order was delivered under a longer active policy window. Claims submitted after the order's recorded warranty expiration cannot be filed.

## Eligible Claim Reasons
Returns, replacements, or refunds are eligible when an item arrives damaged or broken in transit, exhibits a structural or glaze defect, does not match the ordered item or variant, arrives with missing components, or is significantly different from the listing description.

## Mandatory Photographic Evidence
Buyers must attach clear photographic evidence covering the required angles: (1) Item Defect / Damage Close-up and (2) Shipping Packaging & Waybill. Additional supporting angles may be attached up to 5 photos total.

## Dispute Resolution Process
Once submitted, the artisan shop may approve a full refund, propose a replacement piece, or explain a decline. If unresolved, buyers may escalate the claim for platform review and arbitration.
MD,
            ],
            PlatformPolicy::TYPE_TERMS_OF_SERVICE => [
                'title' => 'Terms of Service',
                'version' => '1.0',
                'structured_criteria' => null,
                'content_markdown' => <<<'MD'
Welcome to LikhangKamay. These Terms of Service govern your access and use of our platform. Please read them carefully before creating an account or making any transactions.

## Acceptance of Terms
By creating an account, browsing products, or making purchases on LikhangKamay, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please discontinue use of our services immediately.

## Eligibility
You must be at least 18 years of age to create an account and use our services. By using LikhangKamay, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding agreements.

## User Accounts
You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration. LikhangKamay reserves the right to suspend or terminate accounts that contain false or misleading information.

## Platform Services
LikhangKamay is an online marketplace that connects buyers with local Filipino artisans specializing in handcrafted pottery, ceramics, and clay products, alongside a dedicated B2B Supply Hub connecting craft studios with raw material and equipment suppliers. We facilitate transactions but are not a party to the sale agreement between buyers and sellers. The Platform provides product and supply listings, secure payment processing, messaging services, integrated logistics, and order tracking.

## B2B Sourcing & Commercial Transactions
Transactions conducted within the B2B Supply Hub are intended for artisan workshop production, studio operations, and wholesale procurement. Supply buyers must verify wholesale order quantities, delivery specifications, and material suitability upon delivery. Return or replacement requests for wholesale supplies must be submitted within 24 hours of delivery with photographic evidence of defects or contamination.

## Purchases and Payments
All prices are displayed in Philippine Peso (₱) and are inclusive of applicable taxes unless otherwise stated. We accept secure payment methods including Cash on Delivery (COD) and digital payments (GCash, Maya, cards via PayMongo). A transparent service fee applies to checkout orders to cover payment gateway processing and platform support. Once an order is confirmed, it constitutes a binding agreement between buyer and artisan.

## Shipping and Delivery
Shipping costs and delivery times vary depending on the seller's location and the chosen fulfillment method. Orders may be dispatched via integrated third-party on-demand couriers (such as Lalamove) or authorized artisan in-house delivery personnel with electronic proof of delivery. Sellers are responsible for packaging fragile ceramic and pottery items securely. LikhangKamay provides tracking updates but is not liable for carrier delays or force majeure events. Delivered orders initiate an inspection window prior to automatic completion.

## Returns and Refunds
Returns are accepted for items that arrive damaged, defective, or significantly different from their description. Buyers must report issues within the active inspection window (default 24 hours / 1 day from delivery) with required photo evidence matching the active return criteria. Refunds and dispute resolutions are processed through our internal dispute resolution center. Custom or personalized items may not be eligible for returns unless defective.

## Subscriptions and Billing
Sellers may subscribe to Premium or Elite membership plans. All subscription fees are billed in advance on a monthly basis, processed securely via PayMongo, and are strictly non-refundable once processed. Tier entitlements include active product limits (3 for Standard, 10 for Premium, 50 for Elite), automated thank-you messages on order completion (Premium & Elite), and the Discounts & Campaign Engine (Elite) alongside Sponsorship credits.

## User Conduct & Account Standing
Users agree not to post fraudulent information, harass others, manipulate reviews, or conduct off-platform fee circumvention. LikhangKamay enforces a 3-stage review model: (1) Stage 1: Advisory Notice with educational guidance, (2) Stage 2: Temporary Hold (3–30 days) pausing checkout, review submissions, or storefront discovery, and (3) Stage 3: Account Closure. Zero-tolerance offenses bypass progressive stages and result in immediate account closure.

## Intellectual Property
All content on LikhangKamay, including logos, text, graphics, images, and software, is the property of LikhangKamay or its content suppliers and is protected by Philippine and international intellectual property laws. Users retain ownership of content they submit but grant LikhangKamay a non-exclusive, royalty-free license to use and display such content on the Platform.

## Limitation of Liability
LikhangKamay shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. We do not guarantee the quality, safety, or legality of products sold by third-party sellers. Our total liability shall not exceed the amount paid by you for the specific transaction in question.

## Dispute Resolution
Any disputes arising from these Terms or your use of the Platform shall first be attempted to be resolved through our internal dispute resolution process. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of the Philippines.

## Modifications to Terms
LikhangKamay reserves the right to modify these Terms at any time. We will notify users of material changes via email or through the Platform. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
MD,
            ],
            PlatformPolicy::TYPE_PRIVACY_POLICY => [
                'title' => 'Privacy Policy',
                'version' => '1.0',
                'structured_criteria' => null,
                'content_markdown' => <<<'MD'
LikhangKamay is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you interact with our platform.

## Information We Collect
We collect personal information (name, email, phone, delivery addresses), transaction details, delivery coordinates for dispatch matching, payment information processed securely by partners, and automatically collected device, browsing, and purchase records on our Platform.

## How We Use Your Information
We use your data to process and fulfill orders, communicate about purchases and updates, improve the Platform, personalize recommendations, prevent fraud, ensure security, and comply with legal obligations.

## Information Sharing
We share data with: Sellers and Studio Drivers (delivery addresses and contact info for order drop-off), Payment Processors (for transactions), On-Demand Shipping Partners (such as Lalamove for dispatch), Service Providers (platform operations), and Legal Authorities (when required by law). We never sell your personal information.

## Data Security
We implement SSL/TLS encryption, secure server infrastructure, regular security audits, and strict access controls limiting data access to authorized personnel only.

## Your Rights Under the Data Privacy Act
Under RA 10173, you have the right to: be informed about data processing, access your personal data, correct inaccurate data, request erasure, object to processing, receive data in portable format, and file complaints with the National Privacy Commission.

## Cookies and Tracking
We use cookies to enhance browsing experience, remember preferences, analyze traffic, and deliver personalized content. You can manage cookie settings through your browser, though disabling may affect functionality.

## Data Retention
We retain data as long as your account is active or needed for services. After deletion, certain information may be kept for 5 years for legal, tax, or regulatory compliance as required by Philippine law.

## Children's Privacy
LikhangKamay is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If discovered, we will delete such data promptly.

## Changes to Policy
We may update this Privacy Policy periodically. We will notify you of material changes via email or Platform notification. Continued use constitutes acceptance of updates.

## Contact Our Data Protection Officer
For privacy inquiries or to exercise your data rights, contact: likhangkamaybusiness@gmail.com | Data Protection Officer: LikhangKamay Privacy Team | Address: Metro Manila, Philippines
MD,
            ],
            PlatformPolicy::TYPE_SELLER_AGREEMENT => [
                'title' => 'Seller Agreement',
                'version' => '1.0',
                'structured_criteria' => null,
                'content_markdown' => <<<'MD'
This agreement governs your status as an artisan partner on LikhangKamay. Please read this carefully to understand your obligations regarding product quality, fulfillment, payouts, and compliance.

## Seller Eligibility
To become a seller on LikhangKamay, you must: be at least 18 years old, be a legitimate artisan producing handmade pottery/ceramics, provide valid government-issued identification, have the legal right to sell the products listed, and comply with all applicable Philippine laws.

## Product Listings
All products listed must be authentic, handcrafted items made by you or your artisan team. Provide accurate descriptions including dimensions, materials, care instructions, and high-quality images. Listings must not contain misleading information or prohibited items.

## B2B Supply Hub & Wholesale Procurement
Artisans may list raw pottery materials (such as clay, glazes, stains, kiln supplies, and protective packaging) and procure workshop supplies at wholesale pricing through the B2B Supply Hub. Artisans listing supplies warrant that all materials are safe, non-hazardous, accurately graded, and sold with clear minimum order quantities (MOQ) and unit measures. Discrepancies, defective materials, or damaged goods must be reported within 24 hours of delivery with photo or video evidence.

## Pricing and Fees
You are solely responsible for setting product prices. LikhangKamay charges 0% platform commission on each successful sale, allowing artisans to keep 100% of their merchandise earnings. Platform operations are funded through seller subscription tiers.

## Membership Tiers & Subscriptions
Artisans may subscribe to Standard (Free), Premium, or Elite membership tiers. Subscription fees are billed monthly, processed via PayMongo, and are strictly non-refundable once processed. Tier inclusions include active listing limits (3 for Standard, 10 for Premium, 50 for Elite), automated thank-you messages on order completion for Premium & Elite tiers, and the Discounts & Campaign Engine for Elite tier alongside platform Sponsorship credits.

## Order Fulfillment
Upon receiving a retail or wholesale order, you agree to: confirm within 24 hours, process within 3 business days, ship within 7 business days (unless custom production schedules are declared), provide real-time tracking, and use appropriate packaging for fragile ceramic items.

## Studio Dispatch & Logistics
Artisans may fulfill customer and wholesale deliveries using either integrated on-demand third-party couriers (Lalamove API) or authorized in-house studio delivery personnel. Completed deliveries initiate the active customer inspection period before automated order completion.

## Quality Standards
Products must meet professional quality standards. Items should be free from defects unless marketed as 'seconds' or intentionally distressed. Maintain a rating of at least 4.0 stars. Consistent quality issues may result in account review or termination.

## Returns and Refunds
Accept returns for items that: arrive damaged, are significantly different from description, or are defective. Process returns within 1 day (24 hours) of customer request. Customer dispute claims filed within the active post-delivery window are adjudicated through our Resolution Center. Seller Protection may cover refunds for transit damage with verified packaging evidence.

## Communication Standards
Respond to customer inquiries within 24 hours during business days. All communications must be professional, courteous, and helpful. Resolve disputes through our resolution center. Abusive communication will result in immediate suspension.

## Payments and Payouts
Seller net payouts reflect 100% of merchandise sales subtotal without percentage commission deductions. Payouts are processed weekly for completed orders. Provide a valid GCash or Maya mobile number. LikhangKamay is not responsible for delays caused by incorrect account details.

## Prohibited Activities
Sellers may not: sell counterfeit or mass-produced items, manipulate reviews, create fake transactions, circumvent commission with off-platform deals, share customer information, or engage in fraudulent or illegal activities.

## Account Standing & Studio Guidelines
LikhangKamay enforces a progressive 3-stage review system: (1) Stage 1: Advisory Notice with educational guidance, (2) Stage 2: Temporary Hold (3 to 30 days), and (3) Stage 3: Account Closure. Zero-tolerance violations bypass progressive stages and result in immediate account closure.

## Intellectual Property
You retain ownership of your designs and content. By listing on LikhangKamay, you grant us a non-exclusive license to display and promote your products. You warrant that listings do not infringe on others' intellectual property.

## Modifications to Agreement
LikhangKamay may update this Agreement periodically. We will notify sellers via email at least 14 days before changes take effect. Continued platform use constitutes acceptance of the modified Agreement.

## Contact Seller Support
For questions about this Agreement: Email likhangkamaybusiness@gmail.com | Seller Hotline available in Seller Dashboard | Address: Metro Manila, Philippines
MD,
            ],
            PlatformPolicy::TYPE_SELLER_PRIVACY => [
                'title' => 'Seller Data Privacy Policy',
                'version' => '1.0',
                'structured_criteria' => null,
                'content_markdown' => <<<'MD'
As a partner artisan on LikhangKamay, we process your business and personal data to support your operations and remain compliant with local regulations.

## Seller Data We Collect
We collect: Personal info (name, ID, contact), Business info (shop name, registration, payout account details, TIN), and Product data (listings, images, 3D models, sales analytics, transaction records).

## Customer Data Access
To fulfill orders, you receive limited customer info: name, shipping address, contact number, and order details. This data must only be used for order fulfillment, not stored beyond the transaction, and never shared with third parties.

## Studio Staff & Attendance Data (RA 10173)
For artisans using Studio Staff Management, timekeeping records—including quick face photos and store location coordinates captured during clock-in and clock-out—are processed strictly for employment attendance verification under Republic Act 10173. This sensitive verification data is encrypted, accessible only to authorized studio administrators, never shared with third-party advertisers or commercial entities, and retained solely for the duration of active employment plus statutory labor record requirements.

## How We Use Seller Data
Your data is used to: verify identity, process orders, calculate and transfer earnings, provide analytics, communicate about orders and policies, investigate disputes, and comply with tax/legal requirements.

## Data Sharing
We share seller data with: Buyers (shop name, ratings, public profile), Payment Processors (e-wallet payout details for transfers), Shipping Partners (pickup addresses), Government Authorities (tax records as required), and Service Providers (platform operations). We never sell seller data.

## Financial Data Security
Your payout details are protected through: encryption at rest and in transit, PCI-DSS compliant payment processors, limited access on need-to-know basis, and regular security audits. We never store complete credit card numbers.

## Seller Analytics
We provide analytics including: sales trends, customer demographics (aggregated/anonymized), popular products, and conversion rates. This data helps you grow your business and is derived from your transactions.

## Data Retention
Seller data is retained for duration of active selling plus: 5 years for financial records (BIR requirement), 3 years for dispute records, and indefinitely for aggregated analytics.

## Your Rights as a Seller
Under RA 10173, you have the right to: access your data, correct inaccurate info, request erasure, receive data in portable format, object to processing, and withdraw consent for optional uses.

## Data Breach Response
In case of a data breach, we will: notify affected sellers within 72 hours, report to the National Privacy Commission, take immediate steps to mitigate, and provide protective guidance.

## Contact for Seller Privacy
For seller-specific privacy inquiries: Email likhangkamaybusiness@gmail.com | Data Protection Officer available via Seller Dashboard | NPC: complaints@privacy.gov.ph
MD,
            ],
        ];
    }
}
