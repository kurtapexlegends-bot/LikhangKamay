<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\Supply;
use Illuminate\Support\Facades\DB;

class SyncProductRecipes
{
    /**
     * Synchronize recipes and Finished Goods supply for a product
     *
     * @param Product $product
     * @param array $validatedData Contains price, cost_price, stock, production_method, recipes, name, sku
     * @param int $sellerId
     * @param string|null $oldName Re-lookup name if changed (for update)
     */
    public function execute(Product $product, array $validatedData, int $sellerId, ?string $oldName = null): void
    {
        $productionMethod = $validatedData['production_method'] ?? $product->production_method ?? 'resell';

        if ($productionMethod === 'manufactured') {
            $product->recipes()->delete();
            if (!empty($validatedData['recipes'])) {
                foreach ($validatedData['recipes'] as $recipe) {
                    $product->recipes()->create([
                        'supply_id' => $recipe['supply_id'],
                        'quantity_required' => $recipe['quantity_required'],
                    ]);
                }
            }
        } else {
            $product->recipes()->delete();
        }

        $supply = $this->findSupplyForProduct($product, $sellerId, $oldName);

        if (!$supply) {
            $supply = new Supply(Supply::filterSchemaCompatibleAttributes([
                'user_id' => $sellerId,
                'product_id' => $product->id,
                'name' => $product->name,
                'category' => 'Finished Goods',
            ]));
        }

        $supply->fill(Supply::filterSchemaCompatibleAttributes([
            'name' => $product->name,
            'category' => 'Finished Goods',
            'quantity' => $product->stock,
            'unit' => 'pcs',
            'min_stock' => 5,
            'max_stock' => 500,
            'unit_cost' => $validatedData['cost_price'] ?? 0,
            'supplier' => 'Self/External',
            'notes' => 'Auto-generated from Product: ' . $product->sku,
        ]));
        $supply->save();
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
