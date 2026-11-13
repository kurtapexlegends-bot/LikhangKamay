<?php

namespace App\Actions\Consumer;

use App\Models\PlatformPolicy;
use App\Models\Product;
use App\Services\PolicyService;
use App\Services\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class PrepareCheckout
{
    /**
     * Prepare items for checkout
     *
     * @param Request $request
     * @return array
     */
    public function execute(Request $request): array
    {
        $items = [];

        // CASE 1: Buy Now (Single Product)
        if ($request->has('product_id')) {
            $product = Product::with(['user' => fn($q) => $q->withTrashed(), 'discounts'])->find($request->product_id);
            $variant = trim((string) $request->input('variant', 'Standard')) ?: 'Standard';

            if ($product) {
                $qty = max(1, (int) $request->input('quantity', $product->is_b2b_supply ? ($product->moq ?: 1) : 1));
                $items[] = [
                    'id' => $product->id,
                    'cart_key' => null,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'category' => $product->category,
                    'shop_name' => $product->user?->shop_name ?? ($product->user?->name ?? 'Shop'),
                    'seller_city' => $product->user?->city ?? null,
                    'location' => $product->user?->city ?? null,
                    'name' => $product->name,
                    'variant' => $variant,
                    'price' => $product->is_b2b_supply ? $product->getEffectiveB2BPrice($qty) : $product->effective_price,
                    'original_price' => (float) $product->price,
                    'discount_info' => $product->discount_info,
                    'is_b2b_supply' => (bool) $product->is_b2b_supply,
                    'moq' => (int) ($product->moq ?: 1),
                    'supply_unit' => $product->supply_unit ?: 'pcs',
                    'qty' => $qty,
                    'lead_time' => (int) ($product->lead_time ?? 0),
                    'is_vat_registered' => (bool) ($product->user?->is_vat_registered ?? false),
                    'img' => $product->img ?: StorageUrl::url($product->cover_photo_path, '/images/placeholder.svg'),
                    'image' => $product->img ?: StorageUrl::url($product->cover_photo_path, '/images/placeholder.svg'),
                ];
            }
        }
        // CASE 2: Checkout from Cart
        else {
            $cart = Session::get('cart', []);
            $selectedIds = collect($request->input('items', []))
                ->map(fn ($item) => (string) $item)
                ->values()
                ->all();

            if (!empty($selectedIds) && is_array($selectedIds)) {
                $items = array_filter(
                    $cart,
                    function ($item, $cartKey) use ($selectedIds) {
                        return in_array((string) $cartKey, $selectedIds, true)
                            || in_array((string) ($item['id'] ?? ''), $selectedIds, true);
                    },
                    ARRAY_FILTER_USE_BOTH
                );
            } else {
                $items = $cart;
            }

            // Sync with live database effective prices
            $productIds = collect($items)->pluck('id')->filter()->unique()->all();
            $liveProducts = Product::with(['user' => fn($q) => $q->withTrashed(), 'discounts'])
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            $syncedItems = [];
            foreach ($items as $cartKey => $item) {
                $live = $liveProducts->get($item['id'] ?? null);
                if ($live) {
                    $itemQty = max(1, (int) ($item['qty'] ?? 1));
                    $item['price'] = $live->is_b2b_supply ? $live->getEffectiveB2BPrice($itemQty) : $live->effective_price;
                    $item['original_price'] = (float) $live->price;
                    $item['discount_info'] = $live->discount_info;
                    $item['is_b2b_supply'] = (bool) $live->is_b2b_supply;
                    $item['moq'] = (int) ($live->moq ?: 1);
                    $item['supply_unit'] = $live->supply_unit ?: 'pcs';
                    $item['artisan_id'] = $live->artisan_id ?? $live->user_id;
                    $item['category'] = $live->category;
                    $item['shop_name'] = $live->user?->shop_name ?? ($live->user?->name ?? 'Shop');
                    $item['seller_city'] = $live->user?->city ?? ($item['seller_city'] ?? null);
                    $item['location'] = $live->user?->city ?? ($item['location'] ?? null);
                    $item['lead_time'] = (int) ($live->lead_time ?? 0);
                    $item['is_vat_registered'] = (bool) ($live->user?->is_vat_registered ?? false);
                    $photo = $live->img ?: StorageUrl::url($live->cover_photo_path, '/images/placeholder.svg');
                    $item['img'] = $photo;
                    $item['image'] = $photo;
                    $syncedItems[$cartKey] = $item;
                }
            }
            $items = $syncedItems;

            $items = array_values(array_map(function ($item, $cartKey) {
                if (!isset($item['cart_key'])) {
                    $item['cart_key'] = (string) $cartKey;
                }

                if (!isset($item['variant']) || trim((string) $item['variant']) === '') {
                    $item['variant'] = 'Standard';
                }

                return $item;
            }, $items, array_keys($items)));

            foreach ($items as &$item) {
                $photo = StorageUrl::url($item['img'] ?? $item['image'] ?? null, '/images/placeholder.svg');
                $item['img'] = $photo;
                $item['image'] = $photo;
            }
        }

        return $items;
    }

    /**
     * Retrieve active platform policies summary and return inspection window for checkout compliance.
     *
     * @return array<string, mixed>
     */
    public function getPoliciesSummary(): array
    {
        return rescue(function () {
            $policyService = app(PolicyService::class);
            $returnWindowHours = $policyService->getReturnWindowHours();
            $serializedPolicies = $policyService->getSerializedActivePolicies([
                PlatformPolicy::TYPE_TERMS_OF_SERVICE,
                PlatformPolicy::TYPE_PRIVACY_POLICY,
                PlatformPolicy::TYPE_RETURN_REFUND,
            ]);

            $returnWindowSummary = "{$returnWindowHours}-hour return inspection window";

            return [
                'policies' => $serializedPolicies,
                'return_window_hours' => $returnWindowHours,
                'return_window_summary' => $returnWindowSummary,
                'terms_of_service' => [
                    'type' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
                    'title' => $serializedPolicies[PlatformPolicy::TYPE_TERMS_OF_SERVICE]['title'] ?? 'Terms of Service',
                    'version' => $serializedPolicies[PlatformPolicy::TYPE_TERMS_OF_SERVICE]['version'] ?? '1.0',
                ],
                'privacy_policy' => [
                    'type' => PlatformPolicy::TYPE_PRIVACY_POLICY,
                    'title' => $serializedPolicies[PlatformPolicy::TYPE_PRIVACY_POLICY]['title'] ?? 'Privacy Policy',
                    'version' => $serializedPolicies[PlatformPolicy::TYPE_PRIVACY_POLICY]['version'] ?? '1.0',
                ],
                'return_refund_policy' => [
                    'type' => PlatformPolicy::TYPE_RETURN_REFUND,
                    'title' => $serializedPolicies[PlatformPolicy::TYPE_RETURN_REFUND]['title'] ?? 'Return, Refund & Replacement Policy',
                    'version' => $serializedPolicies[PlatformPolicy::TYPE_RETURN_REFUND]['version'] ?? '1.0',
                    'return_window_hours' => $returnWindowHours,
                    'return_window_summary' => $returnWindowSummary,
                ],
            ];
        }, [
            'policies' => [],
            'return_window_hours' => 24,
            'return_window_summary' => '24-hour return inspection window',
            'terms_of_service' => [
                'type' => PlatformPolicy::TYPE_TERMS_OF_SERVICE,
                'title' => 'Terms of Service',
                'version' => '1.0',
            ],
            'privacy_policy' => [
                'type' => PlatformPolicy::TYPE_PRIVACY_POLICY,
                'title' => 'Privacy Policy',
                'version' => '1.0',
            ],
            'return_refund_policy' => [
                'type' => PlatformPolicy::TYPE_RETURN_REFUND,
                'title' => 'Return, Refund & Replacement Policy',
                'version' => '1.0',
                'return_window_hours' => 24,
                'return_window_summary' => '24-hour return inspection window',
            ],
        ], report: false);
    }
}
