<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

class VehicleTypeResolver
{
    /**
     * Default weight in kg by product category when unspecified by artisan.
     */
    private const CATEGORY_FALLBACK_WEIGHTS = [
        'pottery' => 1.5,
        'ceramics' => 1.5,
        'home & living' => 2.0,
        'lighting' => 2.0,
        'woodwork' => 2.5,
        'furniture' => 12.0,
        'fashion' => 0.5,
        'jewelry' => 0.2,
        'accessories' => 0.3,
        'art & decor' => 1.0,
    ];

    /**
     * Default packaging tare buffer (10% extra for protective wrap, boxes, crates).
     */
    private const PACKAGING_BUFFER_MULTIPLIER = 1.10;

    /**
     * Resolve the appropriate Lalamove vehicle service type from an array or collection of items.
     *
     * @param array<int, mixed>|Collection $items
     * @return array{
     *     service_type: string,
     *     label: string,
     *     total_weight_kg: float,
     *     is_upgraded: bool,
     *     reason: string,
     *     icon: string
     * }
     */
    public function resolveForItems(array|Collection $items): array
    {
        $totalRawWeight = 0.0;

        $itemsList = $items instanceof Collection ? $items->all() : $items;

        // Fetch live product records if missing weight or category
        $productIds = collect($itemsList)
            ->pluck('id')
            ->merge(collect($itemsList)->pluck('product_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $productMap = !empty($productIds)
            ? Product::whereIn('id', $productIds)->get()->keyBy('id')
            : collect();

        foreach ($itemsList as $item) {
            $productId = is_array($item)
                ? ($item['id'] ?? ($item['product_id'] ?? null))
                : ($item->product_id ?? ($item->id ?? null));

            $qty = is_array($item)
                ? max(1, (int) ($item['qty'] ?? ($item['quantity'] ?? 1)))
                : max(1, (int) ($item->quantity ?? ($item->qty ?? 1)));

            $product = $productId ? $productMap->get($productId) : null;

            $unitWeight = null;

            if (is_array($item) && isset($item['weight']) && is_numeric($item['weight']) && (float) $item['weight'] > 0) {
                $unitWeight = (float) $item['weight'];
            } elseif ($product && is_numeric($product->weight) && (float) $product->weight > 0) {
                $unitWeight = (float) $product->weight;
            }

            if ($unitWeight === null || $unitWeight <= 0) {
                $category = strtolower(trim((string) (
                    (is_array($item) ? ($item['category'] ?? null) : null)
                    ?? $product?->category
                    ?? 'art & decor'
                )));

                $unitWeight = self::CATEGORY_FALLBACK_WEIGHTS[$category] ?? 1.0;
            }

            $totalRawWeight += ($unitWeight * $qty);
        }

        // Apply packaging buffer
        $finalWeightKg = round(max(0.5, $totalRawWeight * self::PACKAGING_BUFFER_MULTIPLIER), 1);

        return $this->mapWeightToVehicle($finalWeightKg);
    }

    /**
     * Map total calculated weight to Lalamove vehicle tier and plain-language explanation.
     *
     * @param float $weightKg
     * @return array{
     *     service_type: string,
     *     label: string,
     *     total_weight_kg: float,
     *     is_upgraded: bool,
     *     reason: string,
     *     icon: string
     * }
     */
    public function mapWeightToVehicle(float $weightKg): array
    {
        if ($weightKg <= 20.0) {
            return [
                'service_type' => 'MOTORCYCLE',
                'label' => 'Motorcycle',
                'total_weight_kg' => $weightKg,
                'is_upgraded' => false,
                'reason' => "Standard courier delivery ({$weightKg} kg total package weight).",
                'icon' => 'motorcycle',
            ];
        }

        if ($weightKg <= 200.0) {
            return [
                'service_type' => 'SEDAN',
                'label' => '4-Wheel Sedan',
                'total_weight_kg' => $weightKg,
                'is_upgraded' => true,
                'reason' => "Upgraded to 4-Wheel Sedan because order weight ({$weightKg} kg) exceeds the 20 kg motorcycle limit for safe transport.",
                'icon' => 'car',
            ];
        }

        if ($weightKg <= 300.0) {
            return [
                'service_type' => 'MPV_300',
                'label' => 'MPV (300 kg)',
                'total_weight_kg' => $weightKg,
                'is_upgraded' => true,
                'reason' => "Upgraded to 6-Seater MPV because order weight ({$weightKg} kg) exceeds standard vehicle capacity.",
                'icon' => 'truck',
            ];
        }

        return [
            'service_type' => 'VAN_1000',
            'label' => 'Van / Light Truck (1,000 kg)',
            'total_weight_kg' => $weightKg,
            'is_upgraded' => true,
            'reason' => "Upgraded to 1,000 kg Light Cargo Van for heavy bulk / wholesale artisan transport ({$weightKg} kg total).",
            'icon' => 'truck',
        ];
    }
}
