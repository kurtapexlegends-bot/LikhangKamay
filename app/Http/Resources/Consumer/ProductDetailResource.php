<?php

namespace App\Http\Resources\Consumer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Support\RichTextSanitizer;
use App\Models\Order;
use App\Models\Message;

class ProductDetailResource extends JsonResource
{
    /**
     * Disable wrapping for this resource.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $seller = $this->user;

        $viewerCanChatSeller = false;
        if ($viewer && $seller && $viewer->id !== $seller->id && $viewer->isBuyer() && $seller->isArtisan()) {
            $viewerCanChatSeller = Order::query()
                ->where('artisan_id', $seller->id)
                ->where('user_id', $viewer->id)
                ->exists()
                || Message::query()
                    ->where(function ($query) use ($viewer, $seller) {
                        $query->where('sender_id', $viewer->id)
                            ->where('receiver_id', $seller->id);
                    })
                    ->orWhere(function ($query) use ($viewer, $seller) {
                        $query->where('sender_id', $seller->id)
                            ->where('receiver_id', $viewer->id);
                    })
                    ->exists();
        }

        $viewerCanReview = $viewer
            ? Order::query()
                ->where('user_id', $viewer->id)
                ->where('status', 'Completed')
                ->whereHas('items', function ($query) {
                    $query->where('product_id', $this->id);
                })
                ->exists()
            : false;

        $sellerLocation = ($seller && $seller->city)
            ? $seller->city . ', PH'
            : 'Philippines';

        return array_merge(parent::toArray($request), [
            'model_url' => $this->model_3d_path ? asset('storage/' . $this->model_3d_path) : null,
            'image' => $this->img,
            'reviews' => $this->reviews->map(function ($review) {
                return array_merge($review->toArray(), [
                    'seller_reply' => RichTextSanitizer::sanitize($review->seller_reply),
                    'user' => $review->user ? $review->user->toArray() : null,
                ]);
            })->toArray(),
            'viewer_can_review' => $viewerCanReview,
            'viewer_can_chat_seller' => $viewerCanChatSeller,
            'seller' => $seller ? [
                'id' => $seller->id,
                'name' => $seller->name ?? 'Artisan',
                'shop_name' => $seller->shop_name ?? null,
                'slug' => $seller->shop_slug,
                'avatar' => $seller->avatar,
                'location' => $sellerLocation,
                'premium_tier' => $seller->premium_tier,
            ] : null,
        ]);
    }
}
