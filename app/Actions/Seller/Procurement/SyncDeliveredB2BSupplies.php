<?php

declare(strict_types=1);

namespace App\Actions\Seller\Procurement;

use App\Models\Order;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class SyncDeliveredB2BSupplies
{
    /**
     * Automatically synchronize delivered B2B supplies into the buyer artisan's studio inventory.
     */
    public function execute(Order $order, User $buyer): void
    {
        // Only verified or active artisans have a studio supply inventory
        if (!$buyer->isArtisan()) {
            return;
        }

        $order->loadMissing(['items.product', 'user']);
        $seller = User::find($order->seller_id);
        $supplierName = $seller?->shop_name ?: ($seller?->name ?: 'Artisan Supplier');

        foreach ($order->items as $item) {
            $product = $item->product;
            $isB2B = (bool) ($item->is_b2b_supply || ($product && $product->is_b2b_supply));

            if (!$isB2B) {
                continue;
            }

            $materialName = trim((string) $item->product_name);
            $quantity = max(1, (int) $item->quantity);
            $unitCost = (float) $item->price;
            $unit = $item->supply_unit ?: ($product?->supply_unit ?: 'pcs');

            // Map product category to valid Supply category
            $category = $this->mapSupplyCategory($product?->category);

            // Find existing supply record for the buying artisan
            $existingSupply = Supply::where('user_id', $buyer->id)
                ->where(function ($query) use ($materialName, $product) {
                    $query->where('name', $materialName);
                    if ($product) {
                        $query->orWhere('product_id', $product->id);
                    }
                })
                ->first();

            if ($existingSupply) {
                $existingSupply->increment('quantity', $quantity);
                $existingSupply->update([
                    'unit_cost' => $unitCost,
                    'supplier' => $supplierName,
                    'notes' => trim(($existingSupply->notes ? $existingSupply->notes . "\n" : '') . "Restocked +{$quantity} {$unit} via B2B Order #{$order->order_number} on " . now()->format('M d, Y')),
                ]);
            } else {
                Supply::create([
                    'user_id' => $buyer->id,
                    'product_id' => $product?->id,
                    'sku' => 'B2B-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $materialName), 0, 4)) . '-' . rand(100, 999),
                    'name' => $materialName,
                    'category' => $category,
                    'quantity' => $quantity,
                    'unit' => $unit,
                    'min_stock' => max(1, (int) round($quantity * 0.2)),
                    'unit_cost' => $unitCost,
                    'supplier' => $supplierName,
                    'notes' => "Auto-restocked from B2B Order #{$order->order_number} from {$supplierName} on " . now()->format('M d, Y'),
                ]);
            }
        }
    }

    /**
     * Normalize category into a supported Supply category.
     */
    private function mapSupplyCategory(?string $rawCategory): string
    {
        $cat = strtolower(trim((string) $rawCategory));

        if (str_contains($cat, 'clay') || str_contains($cat, 'pottery') || str_contains($cat, 'slip') || str_contains($cat, 'ceramic')) {
            return 'Other'; // Or Glazes / Other depending on enum
        }
        if (str_contains($cat, 'glaze') || str_contains($cat, 'oxide') || str_contains($cat, 'pigment')) {
            return 'Glazes';
        }
        if (str_contains($cat, 'box') || str_contains($cat, 'pack') || str_contains($cat, 'crate')) {
            return 'Packaging';
        }
        if (str_contains($cat, 'tool') || str_contains($cat, 'brush') || str_contains($cat, 'rib') || str_contains($cat, 'sponge')) {
            return 'Tools';
        }

        return in_array($rawCategory, Supply::CATEGORIES, true) ? $rawCategory : 'Other';
    }
}
