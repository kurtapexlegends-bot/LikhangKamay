<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use App\Models\Review;
use App\Notifications\NewReviewNotification;
use App\Support\RichTextSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ReviewController extends Controller
{
    use InteractsWithSellerContext;

    public function index()
    {
        $sellerId = $this->sellerOwnerId();

        $reviews = Review::whereHas('product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
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
                    'product_image' => $review->product->cover_photo_path
                        ? (str_starts_with($review->product->cover_photo_path, 'http') ? $review->product->cover_photo_path : '/storage/' . $review->product->cover_photo_path)
                        : null,
                    'seller_reply' => RichTextSanitizer::sanitize($review->seller_reply),
                    'is_pinned' => $review->is_pinned,
                ];
            });

        $stats = [
            'total' => $reviews->count(),
            'average' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : 0,
            'stars' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ],
        ];

        return Inertia::render('Seller/Reviews', [
            'reviews' => $reviews,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photos.*' => 'nullable|image|max:5120',
        ]);

        $orderQuery = \App\Models\Order::query()
            ->where('user_id', Auth::id())
            ->where('status', 'Completed');

        $hasPurchased = $orderQuery->whereHas('items', function ($query) use ($request) {
            $query->where('product_id', $request->product_id);
        })->exists();

        if (!$hasPurchased) {
            abort(403, 'You can only review products you have purchased and received.');
        }

        $existingReview = Review::where('user_id', Auth::id())
            ->where('product_id', $request->product_id)
            ->first();

        if ($existingReview) {
            return back()->with('error', 'You already reviewed this product. Update or delete your existing review instead.');
        }

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }
        } else {
            $photoPaths = [];
        }

        $review = Review::create([
            'user_id' => Auth::id(),
            'product_id' => $request->product_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'photos' => $photoPaths,
        ]);

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

    public function update(Request $request, $id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photos.*' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }

            if ($review->photos) {
                foreach ($review->photos as $oldPhoto) {
                    Storage::disk('public')->delete($oldPhoto);
                }
            }
        } else {
            $photoPaths = $review->photos ?? [];
        }

        $review->update([
            'rating' => $request->rating,
            'comment' => $request->comment,
            'photos' => $photoPaths,
        ]);

        return back()->with('success', 'Review updated successfully!');
    }

    public function destroy($id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        if ($review->photos) {
            foreach ($review->photos as $photo) {
                Storage::disk('public')->delete($photo);
            }
        }

        $review->delete();

        return back()->with('success', 'Review deleted successfully.');
    }

    public function reply(Request $request, $id)
    {
        $request->validate([
            'seller_reply' => 'required|string|max:2000',
        ]);

        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        $review->update([
            'seller_reply' => RichTextSanitizer::sanitize($request->seller_reply),
        ]);

        return back()->with('success', 'Reply posted successfully!');
    }

    public function destroyReply($id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        $review->update([
            'seller_reply' => null,
        ]);

        return back()->with('success', 'Reply deleted successfully!');
    }

    public function togglePin($id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        if ($review->is_pinned) {
            $review->update(['is_pinned' => false]);

            return back()->with('success', 'Review unpinned.');
        }

        Review::where('product_id', $review->product_id)
            ->where('is_pinned', true)
            ->update(['is_pinned' => false]);

        $review->update(['is_pinned' => true]);

        return back()->with('success', 'Review pinned to top!');
    }
}
