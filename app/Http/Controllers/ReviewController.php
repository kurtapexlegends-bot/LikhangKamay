<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
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
                'product_image' => $review->product->cover_photo_path ? (str_starts_with($review->product->cover_photo_path, 'http') ? $review->product->cover_photo_path : '/storage/' . $review->product->cover_photo_path) : null,
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

        $photoPaths = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }
        }

        Review::updateOrCreate(
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

        return back()->with('success', 'Review submitted successfully!');
    }
}
