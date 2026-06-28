<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use App\Models\Review;
use App\Notifications\NewReviewNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ReviewController extends Controller
{
    use InteractsWithSellerContext;
    
    public function buyerIndex()
    {
        $reviews = Review::where('user_id', Auth::id())
            ->with(['product'])
            ->latest()
            ->get()
            ->map(fn($review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'date' => $review->created_at->format('M d, Y'),
                'seller_reply' => $review->seller_reply,
                'product' => [
                    'name' => $review->product?->name,
                    'image' => $review->product?->cover_photo_path 
                        ? (str_starts_with($review->product->cover_photo_path, 'http') ? $review->product->cover_photo_path : '/storage/' . $review->product->cover_photo_path)
                        : null,
                ]
            ]);

        return Inertia::render('Consumer/Buyer/Reviews', [
            'reviews' => $reviews
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
}
