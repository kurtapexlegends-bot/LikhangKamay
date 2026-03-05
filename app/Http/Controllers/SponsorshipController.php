<?php

namespace App\Http\Controllers;

use App\Models\SponsorshipRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class SponsorshipController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $requests = SponsorshipRequest::where('seller_id', $user->id)
            ->with('product:id,name,cover_photo_path,slug')
            ->orderBy('created_at', 'desc')
            ->get();

        $eligibleProducts = $user->products()
            ->where('status', 'Active')
            ->where('is_sponsored', false)
            ->get(['id', 'name']);

        return Inertia::render('Seller/Sponsorships', [
            'requests' => $requests,
            'eligible_products' => $eligibleProducts,
            'sponsorship_credits' => $user->sponsorship_credits,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'requested_duration_days' => 'required|integer|min:1|max:30',
        ]);

        $user = Auth::user();

        if ($user->sponsorship_credits <= 0) {
            return back()->withErrors(['credits' => 'You do not have enough sponsorship credits.']);
        }

        // Ensure the product belongs to the user
        $product = $user->products()->where('id', $request->product_id)->first();
        if (!$product) {
            return back()->withErrors(['product_id' => 'Product not found or does not belong to you.']);
        }

        // Check if the product already has a pending request
        $existingRequest = SponsorshipRequest::where('product_id', $request->product_id)
            ->where('status', 'pending')
            ->first();

        if ($existingRequest) {
            return back()->withErrors(['product_id' => 'This product already has a pending sponsorship request.']);
        }

        // Deduct 1 credit
        $user->decrement('sponsorship_credits');

        SponsorshipRequest::create([
            'seller_id' => $user->id,
            'product_id' => $request->product_id,
            'status' => 'pending',
            'requested_duration_days' => $request->requested_duration_days,
        ]);

        return redirect()->route('seller.sponsorships')->with('success', 'Sponsorship request submitted!');
    }
}
