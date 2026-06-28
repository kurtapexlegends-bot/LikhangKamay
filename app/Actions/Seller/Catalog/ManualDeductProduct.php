<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\Supply;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ManualDeductProduct
{
    public function execute(Product $product, int $quantity, string $reason, int $sellerId): array
    {
        if ($quantity > $product->stock) {
            return [
                'success' => false,
                'message' => 'Insufficient stock.',
            ];
        }

        DB::transaction(function () use ($product, $quantity, $reason, $sellerId) {
            $product = Product::lockForUpdate()->findOrFail($product->id);
            $product->decrement('stock', $quantity);
            $product->increment('sold', $quantity);
            $product->refresh();

            $supply = $this->findSupplyForProduct($product, $sellerId);

            if ($supply) {
                $newQuantity = max(0, $supply->quantity - $quantity);
                $supply->update(['quantity' => $newQuantity]);
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_manual_deduction',
                'severity' => 'warning',
                'status' => strtolower((string) $product->fresh()->status),
                'title' => 'Product Stock Deducted',
                'summary' => "{$quantity} unit(s) of {$product->name} were deducted from stock.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'details' => [
                    'before' => [
                        'stock' => $product->stock + $quantity,
                    ],
                    'after' => [
                        'stock' => $product->fresh()->stock,
                    ],
                    'lines' => ["Reason: {$reason}"],
                ],
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });

        return [
            'success' => true,
            'message' => "Stock updated. Deducted {$quantity} units for {$reason}.",
        ];
    }

    private function findSupplyForProduct(Product $product, int $sellerId, ?string $fallbackName = null): ?Supply
    {
        $query = Supply::where('user_id', $sellerId);

        if (Supply::supportsProductIdColumn()) {
            return $query->where('product_id', $product->id)->first();
        }

        $names = collect([$product->name, $fallbackName])
            ->filter()
            ->unique()
            ->values();

        if ($names->isEmpty()) {
            return null;
        }

        return $query
            ->where('category', 'Finished Goods')
            ->whereIn('name', $names->all())
            ->first();
    }
}
