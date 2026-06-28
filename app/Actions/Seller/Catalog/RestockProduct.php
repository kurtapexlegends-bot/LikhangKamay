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
            $lockedProduct = Product::lockForUpdate()->findOrFail($product->id);
            $lockedProduct->increment('stock', $amount);
            $lockedProduct->refresh();

            $activationReadiness = $lockedProduct->evaluateActivationReadiness();
            $lockedProduct->update([
                'status' => $lockedProduct->status === 'Archived'
                    ? 'Archived'
                    : ($activationReadiness['canBeActive'] ? 'Active' : 'Draft'),
            ]);

            if ($lockedProduct->track_as_supply && $lockedProduct->supply) {
                $lockedProduct->supply->update(['quantity' => $lockedProduct->stock]);
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_restocked',
                'severity' => 'success',
                'status' => strtolower($lockedProduct->status),
                'title' => 'Product Restocked',
                'summary' => "{$lockedProduct->name} stock increased by {$amount}.",
                'subject_type' => Product::class,
                'subject_id' => $lockedProduct->id,
                'subject_label' => $lockedProduct->name,
                'reference' => $lockedProduct->sku,
                'details' => [
                    'lines' => ["Stock is now {$lockedProduct->stock} unit(s)."],
                ],
                'target_url' => route('products.index', ['highlight_product' => $lockedProduct->id]),
                'target_label' => 'Open Products',
            ]);
        });
    }
}
