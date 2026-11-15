<?php

declare(strict_types=1);

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\PlatformPolicy;
use App\Services\PolicyService;
use App\Support\HelpCenterDirectory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HelpCenterController extends Controller
{
    public function __construct(
        protected PolicyService $policyService
    ) {}

    /**
     * Render the centralized Help Center & FAQ Hub.
     */
    public function index(Request $request): Response
    {
        $returnPolicy = rescue(
            fn () => $this->policyService->getSerializedActivePolicy(PlatformPolicy::TYPE_RETURN_REFUND),
            null,
            report: false
        );

        $returnWindowHours = (int) ($returnPolicy['structured_criteria']['return_window_hours'] ?? 24);
        $dynamicParams = [
            'return_window_hours' => $returnWindowHours,
        ];

        $user = $request->user();
        $role = $user?->role;

        // Strict Persona Isolation:
        // - Artisans / Staff are strictly locked to 'artisan'
        // - Buyers are strictly locked to 'buyer'
        // - Super Admins can toggle 'all'
        // - Guests default to 'buyer', but can view 'artisan' if requested via ?tab=artisan
        if (in_array($role, ['artisan', 'staff', 'rider'], true) || (bool) $user?->is_workspace_owner) {
            $allowedPersona = 'artisan';
            $tab = 'artisan';
        } elseif ($role === 'buyer') {
            $allowedPersona = 'buyer';
            $tab = 'buyer';
        } elseif ($role === 'super_admin') {
            $allowedPersona = 'all';
            $tab = $request->query('tab', 'buyer');
        } else {
            // Guest browsing
            $requestedTab = $request->query('tab');
            $allowedPersona = ($requestedTab === 'artisan') ? 'artisan' : 'buyer';
            $tab = $allowedPersona;
        }

        return Inertia::render('Consumer/Help/HelpCenter', [
            'buyerFaqs' => HelpCenterDirectory::getBuyerFaqs($dynamicParams),
            'artisanFaqs' => HelpCenterDirectory::getArtisanFaqs($dynamicParams),
            'initialTab' => $tab,
            'allowedPersona' => $allowedPersona,
            'initialSearch' => $request->query('search', ''),
        ]);
    }
}
