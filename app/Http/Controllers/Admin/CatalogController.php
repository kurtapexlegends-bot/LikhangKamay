<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use App\Notifications\SponsorshipStatusNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CatalogController extends Controller
{
    /**
     * Display unified Product Catalog & Promotions Control Center
     */
    public function index()
    {
        Gate::authorize('admin-action');
        return Inertia::render('Admin/Catalog/CatalogManager', [
            'categories' => Inertia::defer(fn() => Category::withCount('products')->orderBy('name')->get()),
            'requests' => SponsorshipRequest::with(['user:id,name,shop_name', 'product:id,name,slug,cover_photo_path'])
                ->latest()
                ->paginate(10)
        ]);
    }

    /**
     * Store a new category
     */
    public function storeTaxonomy(Request $request)
    {
        Gate::authorize('admin-action');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name'
        ]);

        $name = strip_tags($validated['name']);

        Category::create([
            'name' => $name,
            'slug' => Str::slug($name)
        ]);

        return back()->with('success', 'Category created successfully.');
    }

    /**
     * Update an existing category
     */
    public function updateTaxonomy(Request $request, Category $category)
    {
        Gate::authorize('admin-action');
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id
        ]);

        $oldName = $category->name;
        $newName = strip_tags($validated['name']);

        $category->update([
            'name' => $newName,
            'slug' => Str::slug($newName)
        ]);

        // Mass update existing products
        Product::where('category', $oldName)->update(['category' => $newName]);

        return back()->with('success', 'Category renamed and all associated products updated.');
    }

    /**
     * Remove a category
     */
    public function destroyTaxonomy(Category $category)
    {
        Gate::authorize('admin-action');
        if ($category->products()->count() > 0) {
            return back()->with('error', 'Cannot delete a category that contains products. Please reassign the products first.');
        }

        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    }

    /**
     * Check if category name exists (Ajax)
     */
    public function checkCategoryName(Request $request)
    {
        Gate::authorize('admin-action');
        $exists = Category::where('name', $request->name)
            ->when($request->exclude_id, fn($q) => $q->where('id', '!=', $request->exclude_id))
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    /**
     * Approve a sponsorship request
     */
    public function approveSponsorship(SponsorshipRequest $sponsorshipRequest)
    {
        Gate::authorize('admin-action');
        if ($sponsorshipRequest->status !== 'pending') {
            return back()->with('error', 'Request is not pending.');
        }

        if (!$sponsorshipRequest->product) {
            return back()->with('error', 'The requested product could not be found.');
        }

        DB::transaction(function () use ($sponsorshipRequest) {
            $approvedAt = now();

            $sponsorshipRequest->update([
                'status' => 'approved',
                'approved_at' => $approvedAt,
                'rejection_reason' => null,
            ]);

            // Sponsor for 7 days
            $sponsorshipRequest->product->update([
                'is_sponsored' => true,
                'sponsored_until' => $approvedAt->copy()->addDays(7),
            ]);
        });

        $sponsorshipRequest->loadMissing('product');
        $sponsorshipRequest->user?->notify(new SponsorshipStatusNotification($sponsorshipRequest));

        return back()->with('success', 'Sponsorship approved for 7 days.');
    }

    /**
     * Reject a sponsorship request
     */
    public function rejectSponsorship(Request $request, SponsorshipRequest $sponsorshipRequest)
    {
        Gate::authorize('admin-action');
        if ($sponsorshipRequest->status !== 'pending') {
            return back()->with('error', 'Request is not pending.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $sponsorshipRequest->update([
            'status' => 'rejected',
            'approved_at' => null,
            'rejection_reason' => strip_tags($validated['rejection_reason']),
        ]);

        $sponsorshipRequest->loadMissing('product');
        $sponsorshipRequest->user?->notify(new SponsorshipStatusNotification($sponsorshipRequest));

        return back()->with('success', 'Sponsorship rejected.');
    }
}
