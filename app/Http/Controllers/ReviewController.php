<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use App\Notifications\NewReviewNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function index()
    {
        $userId = Auth::id();

        // Get reviews for products owned by this seller
        $reviews = Review::whereHas('product', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
        ->with(['user', 'product'])
        ->latest()
        ->get()
        ->map(function ($review) {
            return [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'photos' => $review->photos ?? [],
                'date' => $review->created_at->format('M d, Y'),
                'customer' => $review->user->name ?? 'Unknown',
                'product_name' => $review->product->name ?? 'Unknown Product',
                'product_id' => $review->product_id,
                'product_image' => $review->product->cover_photo_path ? (str_starts_with($review->product->cover_photo_path, 'http') ? $review->product->cover_photo_path : '/storage/' . $review->product->cover_photo_path) : null,
                'seller_reply' => $review->seller_reply,
                'is_pinned' => $review->is_pinned,
            ];
        });

        // Calculate statistics
        $stats = [
            'total' => $reviews->count(),
            'average' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : 0,
            'stars' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ]
        ];

        return Inertia::render('Seller/Reviews', [
            'reviews' => $reviews,
            'stats' => $stats
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photos.*' => 'nullable|image|max:5120', // Max 5MB per photo
        ]);

        // [H3 Fix] Verification: check if the user actually purchased the product
        $hasPurchased = \App\Models\Order::where('user_id', Auth::id())
            ->where('status', 'Completed')
            ->whereHas('items', function ($query) use ($request) {
                $query->where('product_id', $request->product_id);
            })
            ->exists();

        if (!$hasPurchased) {
            abort(403, 'You can only review products you have purchased and received.');
        }

        $existingReview = Review::where('user_id', Auth::id())
            ->where('product_id', $request->product_id)
            ->first();

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }
            
            // Delete old photos from disk to prevent orphaned files
            if ($existingReview && $existingReview->photos) {
                foreach ($existingReview->photos as $oldPhoto) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPhoto);
                }
            }
        } else {
            // Retain existing photos if no new ones laid out
            $photoPaths = $existingReview ? $existingReview->photos : [];
        }

        $review = Review::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'product_id' => $request->product_id
            ],
            [
                'rating' => $request->rating,
                'comment' => $request->comment,
                'photos' => $photoPaths
            ]
        );

        // Notify the seller about the new review
        $product = Product::with('user')->find($request->product_id);
        if ($product && $product->user && $product->user->id !== Auth::id()) {
            $product->user->notify(new NewReviewNotification(
                $review,
                $product->name,
                Auth::user()->name
            ));
        }

        return back()->with('success', 'Review submitted successfully!');
    }

    /**
     * SELLER: Reply to a review
     */
    public function reply(Request $request, $id)
    {
        $request->validate([
            'seller_reply' => 'required|string|max:2000',
        ]);

        $review = Review::with('product')->findOrFail($id);

        // Authorization: only the product owner can reply
        if ($review->product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized.');
        }

        $review->update([
            'seller_reply' => $request->seller_reply,
        ]);

        return back()->with('success', 'Reply posted successfully!');
    }

    /**
     * SELLER: Delete a reply to a review
     */
    public function destroyReply($id)
    {
        $review = Review::with('product')->findOrFail($id);

        if ($review->product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized.');
        }

        $review->update([
            'seller_reply' => null,
        ]);

        return back()->with('success', 'Reply deleted successfully!');
    }

    /**
     * SELLER: Pin/unpin a review (max 1 pinned per product)
     */
    public function togglePin($id)
    {
        $review = Review::with('product')->findOrFail($id);

        // Authorization: only the product owner can pin
        if ($review->product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized.');
        }

        if ($review->is_pinned) {
            // Unpin this review
            $review->update(['is_pinned' => false]);
            return back()->with('success', 'Review unpinned.');
        }

        // Unpin any currently pinned review for this product
        Review::where('product_id', $review->product_id)
            ->where('is_pinned', true)
            ->update(['is_pinned' => false]);

        // Pin this one
        $review->update(['is_pinned' => true]);

        return back()->with('success', 'Review pinned to top!');
    }
}
