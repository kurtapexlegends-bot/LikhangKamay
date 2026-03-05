<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Count how many products the user has active
        $activeProductsCount = $user->products()->where('status', 'Active')->count();
        $activeProducts = $user->products()->where('status', 'Active')->get(['id', 'name', 'status']);

        return Inertia::render('Seller/Subscription', [
            'subscription_tier' => $user->subscription_tier,
            'sponsorship_credits' => $user->sponsorship_credits,
            'active_products_count' => $activeProductsCount,
            'product_limit' => $user->getProductLimit(),
            'active_products' => $activeProducts
        ]);
    }

    public function updateTier(Request $request)
    {
        $request->validate([
            'new_tier' => 'required|in:standard,premium,super_premium',
            'keep_product_ids' => 'present|array',
            'keep_product_ids.*' => 'exists:products,id'
        ]);

        $user = Auth::user();

        // Compute the new limit BEFORE changing the tier
        $tierLimits = ['standard' => 3, 'premium' => 10, 'super_premium' => 50];
        $newLimit = $tierLimits[$request->new_tier] ?? 3;

        if (count($request->keep_product_ids) > $newLimit) {
            return back()->with('error', 'You cannot keep more products than your new limit allows.');
        }

        // Now safe to update tier
        $user->update(['subscription_tier' => $request->new_tier]);

        // Archive products that were not selected to keep
        if (!empty($request->keep_product_ids)) {
            $user->products()->whereIn('id', $request->keep_product_ids)->update(['status' => 'Active']);
            $user->products()
                 ->whereNotIn('id', $request->keep_product_ids)
                 ->where('status', 'Active')
                 ->update(['status' => 'Archived']);
        }

        return redirect()->route('seller.subscription')->with('success', 'Subscription updated successfully.');
    }
}
