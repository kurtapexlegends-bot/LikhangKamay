<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ArchiveProduct
{
    public function execute(Product $product, int $sellerId): void
    {
        DB::transaction(function () use ($product, $sellerId) {
            $updateData = ['status' => 'Archived'];
            if ($product->is_sponsored) {
                $updateData['is_sponsored'] = false;
                \App\Models\SponsorshipRequest::where('product_id', $product->id)
                    ->where('status', 'approved')
                    ->update(['status' => 'expired']);
                \Illuminate\Support\Facades\Cache::forget('home_sponsored_products');
            }
            $product->update($updateData);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_archived',
                'severity' => 'warning',
                'status' => 'archived',
                'title' => 'Product Archived',
                'summary' => "{$product->name} was archived from the active catalog.",
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
