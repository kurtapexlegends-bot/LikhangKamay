<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RestockProduct
{
    public function execute(Product $product, int $amount, int $sellerId): void
    {
        DB::transaction(function () use ($product, $amount, $sellerId) {
            $product->increment('stock', $amount);
            $activationReadiness = $product->evaluateActivationReadiness();
            $product->update([
                'status' => $product->status === 'Archived'
                    ? 'Archived'
                    : ($activationReadiness['canBeActive'] ? 'Active' : 'Draft'),
            ]);

            if ($product->track_as_supply && $product->supply) {
                $product->supply->update(['quantity' => $product->stock]);
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_restocked',
                'severity' => 'success',
                'status' => strtolower($product->status),
                'title' => 'Product Restocked',
                'summary' => "{$product->name} stock increased by {$amount}.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'details' => [
                    'lines' => ["Stock is now {$product->fresh()->stock} unit(s)."],
                ],
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });
    }
}
