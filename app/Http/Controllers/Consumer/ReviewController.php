<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use App\Models\Review;
use App\Notifications\NewReviewNotification;
use App\Services\StorageUrl;
use App\Support\RichTextSanitizer;
use App\Http\Requests\Consumer\StoreReviewRequest;
use App\Http\Requests\Consumer\UpdateReviewRequest;
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
                    'image' => StorageUrl::url($review->product?->cover_photo_path),
                ]
            ]);

        return Inertia::render('Consumer/Buyer/Reviews', [
            'reviews' => $reviews
        ]);
    }

    public function store(StoreReviewRequest $request)
    {
        if (Auth::check() && Auth::user()->isSuspended()) {
            $days = Auth::user()->daysRemainingSuspension();
            abort(403, "Your account is temporarily suspended for {$days} day(s). You cannot post reviews at this time.");
        }

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
            'comment' => $request->comment ? RichTextSanitizer::sanitize($request->comment) : null,
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

    public function update(UpdateReviewRequest $request, int $id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }

            if ($review->photos) {
                foreach ($review->photos as $oldPhoto) {
                    StorageUrl::delete($oldPhoto);
                }
            }
        } else {
            $photoPaths = $review->photos ?? [];
        }

        $review->update([
            'rating' => $request->rating,
            'comment' => $request->comment ? RichTextSanitizer::sanitize($request->comment) : null,
            'photos' => $photoPaths,
        ]);

        return back()->with('success', 'Review updated successfully!');
    }

    public function destroy(int $id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        if ($review->photos) {
            foreach ($review->photos as $photo) {
                StorageUrl::delete($photo);
            }
        }

        $review->delete();

        return back()->with('success', 'Review withdrawn successfully.');
    }
}
