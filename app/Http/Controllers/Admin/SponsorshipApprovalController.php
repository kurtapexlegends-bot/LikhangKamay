<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SponsorshipRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SponsorshipApprovalController extends Controller
{
    public function index()
    {
        $requests = SponsorshipRequest::with([
            'seller:id,name,shop_name,avatar',
            'product:id,name,cover_photo_path,slug'
        ])
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->latest()
            ->get();

        return Inertia::render('Admin/Sponsorships', [
            'requests' => $requests,
        ]);
    }

    public function approve(Request $request, SponsorshipRequest $sponsorshipRequest)
    {
        $sponsorshipRequest->update([
            'status' => 'approved',
            'approved_at' => now(),
            'admin_notes' => $request->input('admin_notes'),
        ]);

        // Update the product's sponsored status
        $sponsorshipRequest->product->update([
            'is_sponsored' => true,
            'sponsored_until' => now()->addDays($sponsorshipRequest->requested_duration_days),
        ]);

        return redirect()->back()->with('success', 'Sponsorship approved!');
    }

    public function reject(Request $request, SponsorshipRequest $sponsorshipRequest)
    {
        $sponsorshipRequest->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'admin_notes' => $request->input('admin_notes'),
        ]);

        // Refund the credit
        $sponsorshipRequest->seller->increment('sponsorship_credits');

        return redirect()->back()->with('success', 'Sponsorship rejected and credit refunded.');
    }
}
