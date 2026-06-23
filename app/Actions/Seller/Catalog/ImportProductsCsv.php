<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\Supply;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImportProductsCsv
{
    public function execute(\App\Models\User $seller, array $data, array $headerMap): array
    {
        $skuIdx = $headerMap['sku'] ?? null;
        $nameIdx = $headerMap['name'] ?? null;
        $categoryIdx = $headerMap['category'] ?? null;
        $priceIdx = $headerMap['price'] ?? null;
        $costPriceIdx = $headerMap['cost price'] ?? $headerMap['cost_price'] ?? null;
        $stockIdx = $headerMap['stock'] ?? null;
        $leadTimeIdx = $headerMap['lead time'] ?? $headerMap['lead_time'] ?? null;
        $statusIdx = $headerMap['status'] ?? null;

        $count = 0;
        $draftedForMissingMedia = 0;
        $skippedForLimit = 0;

        $activeProductCount = Product::where('user_id', $seller->id)->where('status', 'Active')->count();
        $productLimit = $seller->getActiveProductLimit();

        DB::transaction(function () use ($data, $seller, $skuIdx, $nameIdx, $categoryIdx, $priceIdx, $costPriceIdx, $stockIdx, $leadTimeIdx, $statusIdx, &$count, &$draftedForMissingMedia, &$skippedForLimit, &$activeProductCount, $productLimit) {
            foreach ($data as $row) {
                $sku = $row[$skuIdx] ?? null;
                $name = $row[$nameIdx] ?? null;
                $category = $row[$categoryIdx] ?? null;
                $price = isset($row[$priceIdx]) ? (float) $row[$priceIdx] : 0.0;
                $costPrice = isset($row[$costPriceIdx]) ? (float) $row[$costPriceIdx] : 0.0;
                $stock = isset($row[$stockIdx]) ? (int) $row[$stockIdx] : 0;
                $leadTime = isset($row[$leadTimeIdx]) ? (int) $row[$leadTimeIdx] : null;
                $status = $row[$statusIdx] ?? 'Draft';

                if (empty($sku) || empty($name)) continue;

                $existingProduct = Product::where('user_id', $seller->id)->where('sku', $sku)->first();
                $originalStatus = $existingProduct ? $existingProduct->status : 'Draft';
                $trackAsSupply = $existingProduct ? (bool)$existingProduct->track_as_supply : true;

                $product = Product::updateOrCreate(
                    ['user_id' => $seller->id, 'sku' => $sku],
                    [
                        'name' => $name,
                        'category' => $category,
                        'price' => $price,
                        'cost_price' => $costPrice,
                        'stock' => $stock,
                        'lead_time' => $leadTime,
                        'status' => $status,
                        'track_as_supply' => $trackAsSupply,
                    ]
                );

                $finalStatus = $status;
                if ($status === 'Active') {
                    $activationReadiness = $product->evaluateActivationReadiness();

                    if (!$activationReadiness['canBeActive']) {
                        $finalStatus = 'Draft';
                        $draftedForMissingMedia++;
                    } else {
                        $currentlyActive = $originalStatus === 'Active';
                        if (!$currentlyActive) {
                            if ($activeProductCount >= $productLimit) {
                                $finalStatus = 'Draft';
                                $skippedForLimit++;
                            } else {
                                $activeProductCount++;
                            }
                        }
                    }
                }

                if ($product->status !== $finalStatus) {
                    $product->update(['status' => $finalStatus]);
                }

                if ($product->track_as_supply) {
                    $supply = $this->findSupplyForProduct($product, $seller->id);
                    if (!$supply) {
                        $supply = new Supply($this->supplyLookupAttributes($product, $seller->id));
                    }
                    $supply->fill(Supply::filterSchemaCompatibleAttributes([
                        'name' => $product->name,
                        'category' => 'Finished Goods',
                        'quantity' => $product->stock,
                        'unit' => 'pcs',
                        'min_stock' => 5,
                        'max_stock' => 500,
                        'unit_cost' => $product->cost_price ?? 0,
                        'supplier' => 'Self/External',
                        'notes' => 'Auto-generated from Product SKU: ' . $product->sku,
                    ]));
                    $supply->save();
                }

                $count++;
            }

            if ($count > 0) {
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $seller->id,
                    'actor_user_id' => Auth::id(),
                    'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                    'category' => 'operations',
                    'module' => 'products',
                    'event_type' => 'product_bulk_status',
                    'severity' => 'info',
                    'status' => 'active',
                    'title' => 'Bulk Product CSV Import',
                    'summary' => "Imported/updated {$count} products from CSV.",
                    'details' => [
                        'lines' => array_values(array_filter([
                            "Successfully parsed and processed {$count} product(s) from CSV upload.",
                            $draftedForMissingMedia > 0 ? "{$draftedForMissingMedia} product(s) were forced to Draft due to incomplete media requirements (missing cover, gallery, or 3D models)." : null,
                            $skippedForLimit > 0 ? "{$skippedForLimit} product(s) were forced to Draft because the active product limit of {$productLimit} has been reached." : null,
                        ])),
                    ],
                    'target_url' => route('products.index'),
                    'target_label' => 'Open Products',
                ]);
            }
        });

        return [
            'count' => $count,
            'draftedForMissingMedia' => $draftedForMissingMedia,
            'skippedForLimit' => $skippedForLimit,
            'productLimit' => $productLimit,
        ];
    }

    private function supplyLookupAttributes(Product $product, int $sellerId): array
    {
        return Supply::filterSchemaCompatibleAttributes([
            'user_id' => $sellerId,
            'product_id' => $product->id,
            'name' => $product->name,
            'category' => 'Finished Goods',
        ]);
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
