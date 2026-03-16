<?php

namespace App\Http\Controllers;

use App\Models\UserTierLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $activeProductsCount = $user->products()->where('status', 'Active')->count();
        $limit = $user->getActiveProductLimit();

        return Inertia::render('Seller/Subscription', [
            'currentPlan' => $user->premium_tier,
            'activeProductsCount' => $activeProductsCount,
            'limit' => $limit,
            // Only send active products in case they need to manage downgrades
            'activeProducts' => $user->products()->where('status', 'Active')->select('id', 'name', 'sku', 'cover_photo_path', 'price')->get(),
        ]);
    }

    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:premium,super_premium'
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        if ($user->premium_tier === $validated['plan']) {
             return back()->with('error', 'You are already on this plan.');
        }
        UserTierLog::create([
            'user_id' => $user->id,
            'previous_tier' => $user->premium_tier,
            'new_tier' => $validated['plan'],
        ]);

        $user->update(['premium_tier' => $validated['plan']]);
        $planName = $validated['plan'] === 'super_premium' ? 'Elite' : ucfirst($validated['plan']);
        return back()->with('success', "Successfully upgraded to {$planName}!");
    }

    public function downgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:free,premium',
            'keep_active_ids' => 'nullable|array',
            'keep_active_ids.*' => [
                'nullable',
                \Illuminate\Validation\Rule::exists('products', 'id')->where('user_id', \Illuminate\Support\Facades\Auth::id())
            ]
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $newTier = $validated['plan'];
        $previousUrl = url()->previous();

        // Determine new limit from User model
        $user->premium_tier = $newTier;
        $newLimit = $user->getActiveProductLimit();

        $activeIds = $user->products()
            ->where('status', 'Active')
            ->pluck('id')
            ->toArray();

        $keepIds = $validated['keep_active_ids'] ?? [];

        // If no keep list is provided and seller is already within target limit,
        // keep all active products by default (for quick downgrade from plan modal).
        if (empty($keepIds)) {
            if (count($activeIds) <= $newLimit) {
                $keepIds = $activeIds;
            } else {
                return redirect()
                    ->route('seller.subscription')
                    ->with('error', 'Please choose which products to keep active before downgrading.');
            }
        }
        
        if (count($keepIds) > $newLimit) {
             return back()->withErrors(['limit' => 'You selected too many products to keep active. The limit for this tier is ' . $newLimit]);
        }

        // Verify that the requested IDs belong to the user
        $validKeepIds = $user->products()->whereIn('id', $keepIds)->where('status', 'Active')->pluck('id')->toArray();

        // Draft all active products NOT in the keep list
        $user->products()
            ->where('status', 'Active')
            ->whereNotIn('id', $validKeepIds)
            ->update(['status' => 'Draft']);
        UserTierLog::create([
            'user_id' => $user->id,
            'previous_tier' => $user->premium_tier,
            'new_tier' => $newTier,
        ]);

        $user->update(['premium_tier' => $newTier]);

        $redirectTo = $this->getSafePostDowngradeRedirect($user, $previousUrl);

        return redirect()
            ->to($redirectTo)
            ->with('success', 'Plan downgraded successfully. Excess products set to Draft.');
    }

    private function getSafePostDowngradeRedirect(\App\Models\User $user, string $previousUrl): string
    {
        $path = parse_url($previousUrl, PHP_URL_PATH) ?? '';

        $pathModuleMap = [
            '/orders' => 'orders',
            '/analytics' => 'analytics',
            '/products' => 'products',
            '/3d-manager' => '3d',
            '/shop-settings' => 'shop_settings',
            '/sponsorships' => 'sponsorships',
            '/chat' => 'messages',
            '/reviews' => 'reviews',
            '/hr' => 'hr',
            '/accounting' => 'accounting',
            '/procurement/stock-requests' => 'stock_requests',
            '/procurement' => 'procurement',
        ];

        foreach ($pathModuleMap as $pathPrefix => $module) {
            if (str_starts_with($path, $pathPrefix) && !$user->canAccessSellerModule($module)) {
                return route('dashboard');
            }
        }

        // Keep the current page when still allowed (fixes forced /subscription redirects).
        // Use path-only redirect to avoid external redirect targets.
        return $path ?: route('dashboard');
    }
}
