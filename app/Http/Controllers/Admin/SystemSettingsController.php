<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSystemSettingsRequest;
use App\Services\Admin\SystemSettingsOrchestratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SystemSettingsController extends Controller
{
    public function __construct(
        protected SystemSettingsOrchestratorService $orchestrator
    ) {}

    /**
     * Display the administrative platform system configuration dashboard.
     */
    public function index(): Response
    {
        Gate::authorize('admin-action');

        try {
            return Inertia::render('Admin/Layout/SystemConfig/SystemConfig', array_merge(
                $this->orchestrator->getConfigDashboardData(),
                [
                    'recentSponsorships' => Inertia::defer(fn() => $this->orchestrator->getRecentSponsorships()),
                ]
            ));
        } catch (\Throwable $e) {
            Log::error("SystemSettings index error: " . $e->getMessage());

            return Inertia::render('Admin/Layout/SystemConfig/SystemConfig', $this->orchestrator->getFallbackDashboardData());
        }
    }

    /**
     * Stream a CSV export of monetization metrics and subscriptions.
     */
    public function exportMonetization(): StreamedResponse
    {
        Gate::authorize('admin-action');

        return $this->orchestrator->exportMonetizationReport();
    }

    /**
     * Update platform system configurations and dispatch audit activities.
     */
    public function update(UpdateSystemSettingsRequest $request): RedirectResponse
    {
        $this->orchestrator->updateSettings(
            $request->validated(),
            $request->file('platform_logo'),
            $request->file('favicon')
        );

        return back()->with('success', 'System settings synchronized successfully.');
    }
}
