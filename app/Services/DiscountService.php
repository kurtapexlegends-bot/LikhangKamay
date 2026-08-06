<?php

namespace App\Services;

use App\Models\Discount;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DiscountService
{
    /**
     * Create discounts (global or per-product batch) for seller.
     */
    public function createDiscounts(User $seller, array $data): array
    {
        return DB::transaction(function () use ($seller, $data) {
            $createdDiscounts = [];
            $allValidProductIds = [];

            if (!empty($data['items']) && is_array($data['items'])) {
                // Group items by type & value to optimize discount records created
                $grouped = [];
                foreach ($data['items'] as $item) {
                    $pid = (int) $item['product_id'];
                    $type = $item['type'] ?? ($data['type'] ?? 'percentage');
                    $val = (float) ($item['value'] ?? ($data['value'] ?? 0));
                    $key = "{$type}_{$val}";

                    if (!isset($grouped[$key])) {
                        $grouped[$key] = [
                            'type' => $type,
                            'value' => $val,
                            'product_ids' => [],
                        ];
                    }
                    $grouped[$key]['product_ids'][] = $pid;
                }

                foreach ($grouped as $group) {
                    $validProductIds = Product::where('user_id', $seller->id)
                        ->whereIn('id', $group['product_ids'])
                        ->pluck('id')
                        ->all();

                    if (empty($validProductIds)) {
                        continue;
                    }

                    $discount = Discount::create([
                        'user_id' => $seller->id,
                        'name' => $data['name'] ?? null,
                        'type' => $group['type'],
                        'value' => $group['value'],
                        'promo_stock' => isset($data['promo_stock']) ? (int) $data['promo_stock'] : null,
                        'max_purchase_limit' => isset($data['max_purchase_limit']) ? (int) $data['max_purchase_limit'] : null,
                        'start_at' => $data['start_at'],
                        'end_at' => $data['end_at'],
                        'is_active' => $data['is_active'] ?? true,
                    ]);

                    $discount->products()->sync($validProductIds);
                    $createdDiscounts[] = $discount;
                    $allValidProductIds = array_merge($allValidProductIds, $validProductIds);
                }
            } else {
                $discount = $this->createDiscount($seller, $data, $data['product_ids'] ?? []);
                $createdDiscounts[] = $discount;
                $allValidProductIds = $discount->products()->pluck('products.id')->all();
            }

            $this->clearSellerProductCaches($seller->id, array_unique($allValidProductIds));
            return $createdDiscounts;
        });
    }

    /**
     * Create a single discount record and sync products.
     */
    public function createDiscount(User $seller, array $data, array $productIds): Discount
    {
        $discount = Discount::create([
            'user_id' => $seller->id,
            'name' => $data['name'] ?? null,
            'type' => $data['type'],
            'value' => (float) $data['value'],
            'promo_stock' => isset($data['promo_stock']) ? (int) $data['promo_stock'] : null,
            'max_purchase_limit' => isset($data['max_purchase_limit']) ? (int) $data['max_purchase_limit'] : null,
            'start_at' => $data['start_at'],
            'end_at' => $data['end_at'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        $validProductIds = Product::where('user_id', $seller->id)
            ->whereIn('id', $productIds)
            ->pluck('id')
            ->all();

        $discount->products()->sync($validProductIds);
        return $discount;
    }

    /**
     * Update an existing discount campaign and sync products.
     */
    public function updateDiscount(Discount $discount, array $data): Discount
    {
        return DB::transaction(function () use ($discount, $data) {
            $discount->update([
                'name' => $data['name'] ?? null,
                'type' => $data['type'] ?? $discount->type,
                'value' => isset($data['value']) ? (float) $data['value'] : $discount->value,
                'promo_stock' => isset($data['promo_stock']) ? (int) $data['promo_stock'] : $discount->promo_stock,
                'max_purchase_limit' => isset($data['max_purchase_limit']) ? (int) $data['max_purchase_limit'] : $discount->max_purchase_limit,
                'start_at' => $data['start_at'] ?? $discount->start_at,
                'end_at' => $data['end_at'] ?? $discount->end_at,
            ]);

            if (isset($data['product_ids']) && is_array($data['product_ids'])) {
                $validProductIds = Product::where('user_id', $discount->user_id)
                    ->whereIn('id', $data['product_ids'])
                    ->pluck('id')
                    ->all();
                $discount->products()->sync($validProductIds);
            } elseif (isset($data['items']) && is_array($data['items'])) {
                $pids = array_column($data['items'], 'product_id');
                $validProductIds = Product::where('user_id', $discount->user_id)
                    ->whereIn('id', $pids)
                    ->pluck('id')
                    ->all();
                $discount->products()->sync($validProductIds);
            }

            $productIds = $discount->products()->pluck('products.id')->all();
            $this->clearSellerProductCaches($discount->user_id, $productIds);

            return $discount;
        });
    }

    /**
     * Deactivate or cancel a discount.
     */
    public function deactivateDiscount(Discount $discount): void
    {
        DB::transaction(function () use ($discount) {
            $discount->update(['is_active' => false]);

            $productIds = $discount->products()->pluck('products.id')->all();
            $this->clearSellerProductCaches($discount->user_id, $productIds);
        });
    }

    /**
     * Clear caches associated with seller products.
     */
    protected function clearSellerProductCaches(int $sellerId, array $productIds = []): void
    {
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget("seller_{$sellerId}_products");
        Cache::forget("seller_{$sellerId}_best_sellers");
        Cache::forget("seller_{$sellerId}_stats");
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
    }
}
