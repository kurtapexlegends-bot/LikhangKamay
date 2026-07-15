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
    public function index(Request $request)
    {
        Gate::authorize('admin-action');

        $statusFilter = $request->input('product_status', 'pending_review');
        $search = $request->input('search');

        $productQuery = Product::with(['user:id,name,shop_name', 'latestResubmission'])
            ->when($statusFilter && $statusFilter !== 'all', function ($q) use ($statusFilter) {
                $q->where('status', $statusFilter);
            })
            ->when($search, function ($q) use ($search) {
                $q->search($search, ['name', 'sku']);
            })
            ->latest();

        $statusCounts = [
            'pending_review' => Product::where('status', 'pending_review')->count(),
            'Active' => Product::where('status', 'Active')->count(),
            'flagged' => Product::where('status', 'flagged')->count(),
            'rejected' => Product::where('status', 'rejected')->count(),
            'all' => Product::count(),
        ];

        return Inertia::render('Admin/Catalog/CatalogManager', [
            'categories' => Inertia::defer(fn() => Category::withCount('products')->orderBy('name')->get()),
            'requests' => SponsorshipRequest::with(['user:id,name,shop_name', 'product:id,name,slug,cover_photo_path'])
                ->latest()
                ->paginate(10, ['*'], 'requests_page'),
            'products' => $productQuery->paginate(10, ['*'], 'products_page'),
            'statusCounts' => $statusCounts,
            'filters' => [
                'product_status' => $statusFilter,
                'search' => $search
            ]
        ]);
    }

    /**
     * Store a new category
     */
    public function storeTaxonomy(Request $request)
    {
        Gate::authorize('admin-action');

        $name = strip_tags($request->name);
        $slug = Str::slug($name);

        Category::withTrashed()
            ->where(function ($q) use ($name, $slug) {
                $q->where('name', $name)->orWhere('slug', $slug);
            })
            ->forceDelete();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'icon' => 'nullable|string|max:255'
        ]);

        Category::create([
            'name' => $name,
            'slug' => $slug,
            'icon' => $request->input('icon')
        ]);

        \Illuminate\Support\Facades\Cache::forget('home_categories');
        \Illuminate\Support\Facades\Cache::forget('catalog_categories');

        return back()->with('success', 'Category created successfully.');
    }

    /**
     * Update an existing category
     */
    public function updateTaxonomy(Request $request, Category $category)
    {
        Gate::authorize('admin-action');

        $newName = strip_tags($request->name);
        $newSlug = Str::slug($newName);

        Category::withTrashed()
            ->where('id', '!=', $category->id)
            ->where(function ($q) use ($newName, $newSlug) {
                $q->where('name', $newName)->orWhere('slug', $newSlug);
            })
            ->forceDelete();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'icon' => 'nullable|string|max:255'
        ]);

        $oldName = $category->name;

        $category->update([
            'name' => $newName,
            'slug' => $newSlug,
            'icon' => $request->input('icon')
        ]);

        // Mass update existing products
        Product::where('category', $oldName)->update(['category' => $newName]);

        \Illuminate\Support\Facades\Cache::forget('home_categories');
        \Illuminate\Support\Facades\Cache::forget('catalog_categories');

        return back()->with('success', 'Category updated and all associated products updated.');
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

        \Illuminate\Support\Facades\Cache::forget('home_categories');
        \Illuminate\Support\Facades\Cache::forget('catalog_categories');

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

    /**
     * Bulk moderate products (approve, reject, flag)
     */
    public function bulkModerateProducts(Request $request)
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
            'action' => 'required|string|in:approve,reject,flag',
            'feedback' => 'nullable|string|max:1000',
        ]);

        $action = $validated['action'];
        $feedback = $validated['feedback'] ?? null;

        if (in_array($action, ['reject', 'flag']) && empty(trim($feedback ?? ''))) {
            return back()->withErrors(['feedback' => 'Feedback/reason is required when rejecting or flagging products.']);
        }

        $products = Product::with('user')->whereIn('id', $validated['ids'])->get();

        DB::transaction(function () use ($products, $action, $feedback) {
            Product::$bypassReview = true;

            foreach ($products as $product) {
                $status = match ($action) {
                    'approve' => 'Active',
                    'reject' => 'rejected',
                    'flag' => 'flagged',
                };

                $product->update([
                    'status' => $status,
                    'rejection_reason' => $action === 'approve' ? null : strip_tags($feedback),
                ]);

                // Notify seller
                $product->user?->notify(new \App\Notifications\ProductModerationNotification(
                    $product,
                    $action === 'approve' ? 'approved' : $action,
                    $feedback
                ));
            }
        });

        $actionLabel = match ($action) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'flag' => 'flagged',
        };

        return back()->with('success', count($validated['ids']) . " product(s) successfully {$actionLabel}.");
    }
}
