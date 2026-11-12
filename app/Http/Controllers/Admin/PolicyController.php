<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePolicyRequest;
use App\Models\PlatformPolicy;
use App\Models\User;
use App\Services\PolicyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PolicyController extends Controller
{
    public function __construct(
        protected PolicyService $policyService
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('admin-action');

        $selectedType = (string) $request->query('type', PlatformPolicy::TYPE_RETURN_REFUND);
        if (!in_array($selectedType, PlatformPolicy::ALL_TYPES, true)) {
            $selectedType = PlatformPolicy::TYPE_RETURN_REFUND;
        }

        return Inertia::render('Admin/Settings/Policies', [
            'selectedType' => $selectedType,
            'policiesByType' => fn () => $this->buildPoliciesByType(),
        ]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function buildPoliciesByType(): array
    {
        $grouped = PlatformPolicy::query()
            ->withCount('consents')
            ->orderByDesc('is_active')
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->groupBy('type');

        $policiesByType = [];
        foreach (PlatformPolicy::ALL_TYPES as $type) {
            $versions = ($grouped->get($type) ?? collect())
                ->map(fn (PlatformPolicy $p) => [
                    'id' => $p->id,
                    'type' => $p->type,
                    'title' => $p->title,
                    'version' => $p->version,
                    'content_markdown' => $p->content_markdown,
                    'structured_criteria' => $p->structured_criteria,
                    'is_active' => (bool) $p->is_active,
                    'published_at' => $p->published_at?->format('M d, Y h:i A'),
                    'consents_count' => (int) $p->consents_count,
                ]);

            $policiesByType[$type] = [
                'active' => $this->policyService->getSerializedActivePolicy($type),
                'versions' => $versions->values()->all(),
            ];
        }

        return $policiesByType;
    }

    public function store(StorePolicyRequest $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        try {
            $policy = $this->policyService->publishPolicyVersion($validated['type'], $validated, $actor);

            return redirect()
                ->route('admin.policies.index', ['type' => $policy->type])
                ->with('success', "Published {$policy->title} v{$policy->version}.");
        } catch (\Throwable $e) {
            return back()->withErrors(['version' => $e->getMessage()]);
        }
    }

    public function activate(Request $request, PlatformPolicy $policy): RedirectResponse
    {
        Gate::authorize('admin-action');

        /** @var User $actor */
        $actor = $request->user();
        $activated = $this->policyService->activatePolicyVersion($policy, $actor);

        return redirect()
            ->route('admin.policies.index', ['type' => $activated->type])
            ->with('success', "Activated {$activated->title} v{$activated->version}.");
    }
}
