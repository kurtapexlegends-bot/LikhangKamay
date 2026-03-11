<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\UserTierLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
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
            'keep_active_ids.*' => 'exists:products,id'
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $newTier = $validated['plan'];

        // Determine new limit
        $newLimit = match($newTier) {
            'premium' => 10,
            default => 3,
        };

        $keepIds = $validated['keep_active_ids'] ?? [];
        
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

        return redirect()->route('seller.subscription')->with('success', 'Plan downgraded successfully. Excess products set to Draft.');
    }
}
