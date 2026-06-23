<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ActivateProduct
{
    public function execute(Product $product, User $seller): array
    {
        $activationReadiness = $product->evaluateActivationReadiness();

        if (!$activationReadiness['canBeActive']) {
            $product->update(['status' => 'Draft']);

            return [
                'success' => false,
                'type' => 'error',
                'reason' => 'missing_media',
                'missing' => $activationReadiness['missing'],
            ];
        }

        if (!$seller->canAddMoreProducts()) {
            return [
                'success' => false,
                'type' => 'error',
                'reason' => 'limit_reached',
                'message' => 'You have reached your active products limit. Please upgrade your plan.',
            ];
        }

        DB::transaction(function () use ($product, $seller) {
            $product->update(['status' => 'Active']);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $seller->id,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_activated',
                'severity' => 'success',
                'status' => 'active',
                'title' => 'Product Activated',
                'summary' => "{$product->name} is now active in the catalog.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });

        return [
            'success' => true,
            'type' => 'success',
            'message' => 'Product activated.',
        ];
    }
}
