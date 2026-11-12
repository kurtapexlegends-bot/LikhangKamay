<?php

declare(strict_types=1);

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\PlatformPolicy;
use App\Services\PolicyService;
use Inertia\Inertia;
use Inertia\Response;

class LegalPolicyController extends Controller
{
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
}
