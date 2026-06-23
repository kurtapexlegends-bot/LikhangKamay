<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\ProductResubmission;
use App\Models\SellerActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ResubmitProduct
{
    public function execute(Product $product, array $validated): void
    {
        DB::transaction(function () use ($product, $validated) {
            ProductResubmission::create([
                'product_id' => $product->id,
                'notes' => strip_tags($validated['notes'] ?? ''),
                'rejection_reason' => $product->rejection_reason,
            ]);

            Product::$bypassReview = true;
            $product->update([
                'status' => 'pending_review',
                'rejection_reason' => null,
            ]);
            Product::$bypassReview = false;

            $admins = User::where('role', 'super_admin')->get();
            Notification::send($admins, new \App\Notifications\ProductPendingReviewNotification($product));

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $product->user_id,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_resubmitted',
                'severity' => 'info',
                'status' => 'pending_review',
                'title' => 'Product Resubmitted',
                'summary' => "{$product->name} was resubmitted for review.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });
    }
}
