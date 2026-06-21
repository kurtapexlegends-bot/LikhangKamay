<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Models\SellerActivityLog;
use Illuminate\Support\Facades\DB;

class BulkUpdateProductStatus
{
    /**
     * Bulk update product status to Draft or Archived
     *
     * @param User $seller
     * @param array $productIds
     * @param string $targetStatus 'Draft' or 'Archived'
     * @param User $actor
     * @return array
     */
    public function execute(User $seller, array $productIds, string $targetStatus, User $actor): array
    {
        $products = Product::query()
            ->where('user_id', $seller->id)
            ->whereIn('id', $productIds)
            ->get();

        if ($products->isEmpty()) {
            return [
                'status' => 'error',
                'message' => 'No matching products were found.'
            ];
        }

        DB::transaction(function () use ($seller, $products, $targetStatus, $actor) {
            Product::query()
                ->where('user_id', $seller->id)
                ->whereIn('id', $products->pluck('id'))
                ->update(['status' => $targetStatus]);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $seller->id,
                'actor_user_id' => $actor->id,
                'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_bulk_status',
                'severity' => $targetStatus === 'Archived' ? 'warning' : 'info',
                'status' => strtolower($targetStatus),
                'title' => 'Bulk Product Status Applied',
                'summary' => "{$products->count()} product(s) were moved to {$targetStatus}.",
                'subject_label' => 'Bulk product update',
                'details' => [
                    'lines' => ["Updated {$products->count()} selected product(s) to {$targetStatus}."],
                ],
                'target_url' => route('products.index'),
                'target_label' => 'Open Products',
            ]);
        });

        $count = $products->count();
        $message = $count . ' product' . ($count === 1 ? ' was ' : 's were ') . strtolower($targetStatus) . '.';

        return [
            'status' => 'success',
            'message' => $message
        ];
    }
}
