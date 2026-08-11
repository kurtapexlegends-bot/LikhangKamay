<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\SellerLocation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SellerLocationController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request)
    {
        $seller = $this->sellerOwner();

        $locations = SellerLocation::where('user_id', $seller->id)
            ->withCount('employees')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'locations' => $locations
        ]);
    }

    public function store(Request $request)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_meters' => 'required|integer|min:20|max:5000',
            'enforce_strict_geofence' => 'nullable|boolean',
        ]);

        $location = SellerLocation::create([
            'user_id' => $seller->id,
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'radius_meters' => $validated['radius_meters'],
            'enforce_strict_geofence' => (bool) ($validated['enforce_strict_geofence'] ?? false),
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Workplace location created successfully.');
    }

    public function update(Request $request, SellerLocation $location)
    {
        $seller = $this->sellerOwner();
        abort_unless($location->user_id === $seller->id, 403, 'Unauthorized location access.');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_meters' => 'required|integer|min:20|max:5000',
            'enforce_strict_geofence' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $location->update($validated);

        return redirect()->back()->with('success', 'Workplace location updated successfully.');
    }

    public function destroy(Request $request, SellerLocation $location)
    {
        $seller = $this->sellerOwner();
        abort_unless($location->user_id === $seller->id, 403, 'Unauthorized location access.');

        $location->delete();

        return redirect()->back()->with('success', 'Workplace location removed.');
    }
}
