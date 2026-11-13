<?php

declare(strict_types=1);

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\PlatformPolicy;
use App\Services\PolicyService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class LegalPolicyController extends Controller
{
    private const TYPE_MAP = [
        'terms' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
        'terms_of_service' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
        'terms-of-service' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
        'privacy' => PlatformPolicy::TYPE_PRIVACY_POLICY,
        'privacy_policy' => PlatformPolicy::TYPE_PRIVACY_POLICY,
        'privacy-policy' => PlatformPolicy::TYPE_PRIVACY_POLICY,
        'seller' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
        'seller-agreement' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
        'seller_agreement' => PlatformPolicy::TYPE_SELLER_AGREEMENT,
        'sellerPrivacy' => PlatformPolicy::TYPE_SELLER_PRIVACY,
        'seller-privacy' => PlatformPolicy::TYPE_SELLER_PRIVACY,
        'seller_privacy' => PlatformPolicy::TYPE_SELLER_PRIVACY,
        'returns' => PlatformPolicy::TYPE_RETURN_REFUND,
        'return_refund' => PlatformPolicy::TYPE_RETURN_REFUND,
        'return-refund' => PlatformPolicy::TYPE_RETURN_REFUND,
        'return_refund_policy' => PlatformPolicy::TYPE_RETURN_REFUND,
        'return-refund-policy' => PlatformPolicy::TYPE_RETURN_REFUND,
        PlatformPolicy::TYPE_TERMS_OF_SERVICE => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
        PlatformPolicy::TYPE_PRIVACY_POLICY => PlatformPolicy::TYPE_PRIVACY_POLICY,
        PlatformPolicy::TYPE_SELLER_AGREEMENT => PlatformPolicy::TYPE_SELLER_AGREEMENT,
        PlatformPolicy::TYPE_SELLER_PRIVACY => PlatformPolicy::TYPE_SELLER_PRIVACY,
        PlatformPolicy::TYPE_RETURN_REFUND => PlatformPolicy::TYPE_RETURN_REFUND,
    ];

    public function __construct(
        protected PolicyService $policyService
    ) {}

    public function terms(): Response
    {
        return Inertia::render('Consumer/Legal/TermsOfService', [
            'policy' => $this->policyService->getSerializedActivePolicy(PlatformPolicy::TYPE_TERMS_OF_SERVICE),
        ]);
    }

    public function privacy(): Response
    {
        return Inertia::render('Consumer/Legal/GeneralPrivacy', [
            'policy' => $this->policyService->getSerializedActivePolicy(PlatformPolicy::TYPE_PRIVACY_POLICY),
        ]);
    }

    public function sellerAgreement(): Response
    {
        return Inertia::render('Consumer/Legal/SellerAgreement', [
            'policy' => $this->policyService->getSerializedActivePolicy(PlatformPolicy::TYPE_SELLER_AGREEMENT),
        ]);
    }

    public function sellerPrivacy(): Response
    {
        return Inertia::render('Consumer/Legal/SellerPrivacy', [
            'policy' => $this->policyService->getSerializedActivePolicy(PlatformPolicy::TYPE_SELLER_PRIVACY),
        ]);
    }

    public function show(string $type): JsonResponse
    {
        $normalizedType = self::TYPE_MAP[$type] ?? null;

        if (!$normalizedType || !in_array($normalizedType, PlatformPolicy::ALL_TYPES, true)) {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        $policy = $this->policyService->getSerializedActivePolicy($normalizedType);

        return response()->json([
            'policy' => $policy,
            'type' => $normalizedType,
        ]);
    }
}
