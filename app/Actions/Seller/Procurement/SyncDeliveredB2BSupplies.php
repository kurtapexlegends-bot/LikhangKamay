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
        $sellerId = $order->artisan_id ?: ($order->seller_id ?: null);
        $seller = $sellerId ? User::find($sellerId) : null;
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
                $totalOldCost = ((float) $existingSupply->quantity) * ((float) $existingSupply->unit_cost);
                $totalNewCost = $quantity * $unitCost;
                $newTotalQty = $existingSupply->quantity + $quantity;
                $weightedUnitCost = $newTotalQty > 0 ? round(($totalOldCost + $totalNewCost) / $newTotalQty, 2) : $unitCost;

                $existingSupply->increment('quantity', $quantity);
                $existingSupply->update([
                    'unit_cost' => $weightedUnitCost,
                    'supplier' => $supplierName,
                    'notes' => trim(($existingSupply->notes ? $existingSupply->notes . "\n" : '') . "Restocked +{$quantity} {$unit} (Cost: ₱{$unitCost}) via B2B Order #{$order->order_number} on " . now()->format('M d, Y')),
                ]);
                $targetSupply = $existingSupply;
            } else {
                $targetSupply = Supply::create([
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

            // Automatically resolve matching open Stock Requests for this artisan and material
            if ($targetSupply) {
                $openStockRequests = \App\Models\StockRequest::where('user_id', $buyer->id)
                    ->where('supply_id', $targetSupply->id)
                    ->whereIn('status', [
                        \App\Models\StockRequest::STATUS_PENDING,
                        \App\Models\StockRequest::STATUS_ACCOUNTING_APPROVED,
                        \App\Models\StockRequest::STATUS_ORDERED,
                        \App\Models\StockRequest::STATUS_PARTIALLY_RECEIVED,
                    ])
                    ->oldest()
                    ->get();

                $remainingDelivered = $quantity;
                foreach ($openStockRequests as $stockReq) {
                    if ($remainingDelivered <= 0) {
                        break;
                    }
                    $needed = max(1, (int) ($stockReq->quantity - ($stockReq->received_quantity ?? 0)));
                    if ($remainingDelivered >= $needed) {
                        $stockReq->update([
                            'status' => \App\Models\StockRequest::STATUS_COMPLETED,
                            'received_quantity' => $stockReq->quantity,
                        ]);
                        $remainingDelivered -= $needed;
                    } else {
                        $stockReq->update([
                            'status' => \App\Models\StockRequest::STATUS_PARTIALLY_RECEIVED,
                            'received_quantity' => ($stockReq->received_quantity ?? 0) + $remainingDelivered,
                        ]);
                        $remainingDelivered = 0;
                    }
                }
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
