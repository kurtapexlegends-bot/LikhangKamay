<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\SponsorshipRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SponsorshipController extends Controller
{
    // Seller View
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        // Count requests made in the last 30 days
        $creditsUsed = $user->sponsorshipRequests()
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        $creditsAvailable = max(0, 5 - $creditsUsed);

        // Get active products to sponsor
        $activeProducts = $user->products()
            ->where('status', 'Active')
            ->select('id', 'name', 'sku', 'cover_photo_path', 'is_sponsored', 'sponsored_until')
            ->get();

        // Get recent requests
        $requests = $user->sponsorshipRequests()
            ->with('product:id,name,cover_photo_path')
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('Seller/Sponsorships', [
            'creditsAvailable' => $creditsAvailable,
            'activeProducts' => $activeProducts,
            'requests' => $requests,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->premium_tier !== 'super_premium') {
             return back()->with('error', 'Only Elite sellers can request product sponsorship.');
        }

        $creditsUsed = $user->sponsorshipRequests()
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
            
        if ($creditsUsed >= 5) {
             return back()->with('error', 'You have used all 5 sponsorship credits for this 30-day cycle.');
        }
        
        // Ensure product belongs to user and is active
        $product = $user->products()->where('id', $validated['product_id'])->where('status', 'Active')->firstOrFail();

        // Ensure product isn't already sponsored or has a pending request
        $hasPending = $user->sponsorshipRequests()
             ->where('product_id', $product->id)
             ->where('status', 'pending')
             ->exists();

        if ($hasPending || $product->is_sponsored) {
             return back()->with('error', 'This product is already sponsored or has a pending request.');
        }

        SponsorshipRequest::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Sponsorship requested successfully! Used 1 credit.');
    }

    // Admin Views and Actions
    public function adminIndex()
    {
        $requests = SponsorshipRequest::with(['user:id,name,shop_name', 'product:id,name,cover_photo_path'])
            ->latest()
            ->paginate(20);

        return Inertia::render('Admin/SponsorshipRequests', [
            'requests' => $requests
        ]);
    }

    public function approve(SponsorshipRequest $sponsorshipRequest)
    {
        if ($sponsorshipRequest->status !== 'pending') {
            return back()->with('error', 'Request is not pending.');
        }

        $sponsorshipRequest->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // Sponsor for 7 days
        $sponsorshipRequest->product->update([
            'is_sponsored' => true,
            'sponsored_until' => now()->addDays(7),
        ]);

        return back()->with('success', 'Sponsorship approved for 7 days.');
    }

    public function reject(SponsorshipRequest $sponsorshipRequest)
    {
         if ($sponsorshipRequest->status !== 'pending') {
            return back()->with('error', 'Request is not pending.');
        }

        $sponsorshipRequest->update([
            'status' => 'rejected',
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Sponsorship rejected.');
    }
}
