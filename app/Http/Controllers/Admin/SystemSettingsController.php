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
    public function index(): Response|RedirectResponse
    {
        Gate::authorize('admin-action');

        if (request()->query('tab') === 'monetization') {
            return redirect()->route('admin.monetization');
        }

        if (request()->query('tab') === 'taxonomy' || request()->query('tab') === 'categories') {
            return redirect()->route('admin.categories.index');
        }

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
     * Display the administrative platform subscriptions and monetization dashboard.
     */
    public function monetization(): Response
    {
        Gate::authorize('admin-action');

        try {
            return Inertia::render('Admin/Monetization/Monetization', [
                'metrics' => $this->orchestrator->getMonetizationMetrics(),
                'recentSubscribers' => $this->orchestrator->getRecentSubscribers(),
                'recentSponsorships' => Inertia::defer(fn() => $this->orchestrator->getRecentSponsorships()),
            ]);
        } catch (\Throwable $e) {
            Log::error("Subscriptions & Billing dashboard error: " . $e->getMessage());

            $fallback = $this->orchestrator->getFallbackDashboardData();

            return Inertia::render('Admin/Monetization/Monetization', [
                'metrics' => $fallback['metrics'],
                'recentSubscribers' => $fallback['recentSubscribers'],
                'recentSponsorships' => $fallback['recentSponsorships'],
            ]);
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
