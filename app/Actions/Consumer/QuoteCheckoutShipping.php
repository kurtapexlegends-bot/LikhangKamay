<?php

namespace App\Actions\Consumer;

use App\Models\User;
use App\Services\CheckoutShippingService;
use App\Support\OrderWorkflowHelper;
use Illuminate\Http\Request;

class QuoteCheckoutShipping
{
    private $checkoutShippingService;

    public function __construct(CheckoutShippingService $checkoutShippingService)
    {
        $this->checkoutShippingService = $checkoutShippingService;
    }

    /**
     * Quote shipping fees for checkout
     *
     * @param Request $request
     * @param User $buyer
     * @return array
     */
    public function execute(Request $request, User $buyer): array
    {
        if ($request->shipping_method === 'Pick Up') {
            return [
                'total_shipping_fee' => 0,
                'groups' => [],
                'source' => 'pickup',
            ];
        }

        $shippingContext = OrderWorkflowHelper::resolveCheckoutDeliveryContext($request, $buyer, false);
        $groupedItems = OrderWorkflowHelper::groupCheckoutItemsBySeller($request->input('items', []));

        $groups = [];
        $totalShippingFee = 0.0;

        foreach ($groupedItems as $artisanId => $items) {
            $seller = User::find($artisanId);

            if (!$seller) {
                continue;
            }

            $pickupCandidates = $seller->getCourierPickupAddressCandidates();
            $normalizedDropoff = \App\Support\StructuredAddress::normalizeForComparison($shippingContext['shipping_address'] ?? '');

            $isSameLocation = false;
            foreach ($pickupCandidates as $pickupCandidate) {
                if (\App\Support\StructuredAddress::normalizeForComparison($pickupCandidate) === $normalizedDropoff && $normalizedDropoff !== '') {
                    $isSameLocation = true;
                    break;
                }
            }

            $sellerDefaultAddress = $seller->getDefaultAddress();
            $sellerLat = $sellerDefaultAddress?->latitude ?? ($seller->latitude ?? null);
            $sellerLng = $sellerDefaultAddress?->longitude ?? ($seller->longitude ?? null);

            if (!$isSameLocation && !empty($sellerLat) && !empty($sellerLng) && !empty($shippingContext['shipping_latitude']) && !empty($shippingContext['shipping_longitude'])) {
                $distMeters = \App\Support\CourierAddressResolver::distanceBetweenCoordinates(
                    (float) $sellerLat,
                    (float) $sellerLng,
                    (float) $shippingContext['shipping_latitude'],
                    (float) $shippingContext['shipping_longitude']
                );
                if ($distMeters !== null && $distMeters <= 100) {
                    $isSameLocation = true;
                }
            }

            if ($isSameLocation) {
                $shopName = $seller->shop_name ?: $seller->name;
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'shipping_address' => "The delivery address is identical to {$shopName}'s studio pickup location. Please select 'Pick Up' or provide a different delivery address.",
                ]);
            }

            $quote = $this->checkoutShippingService->estimateForSeller($seller, [
                ...$shippingContext,
                'shipping_method' => $request->shipping_method,
            ], $items);

            $shippingFee = round((float) ($quote['amount'] ?? 0), 2);
            $totalShippingFee += $shippingFee;

            $groups[] = [
                'seller_id' => (int) $artisanId,
                'shipping_fee_amount' => $shippingFee,
                'currency' => $quote['currency'] ?? 'PHP',
                'source' => $quote['source'] ?? 'fallback_flat',
                'vehicle_info' => $quote['vehicle_info'] ?? null,
            ];
        }

        return [
            'total_shipping_fee' => round($totalShippingFee, 2),
            'groups' => $groups,
            'source' => collect($groups)->contains(fn (array $group) => ($group['source'] ?? '') === 'lalamove_quote')
                ? 'mixed'
                : 'fallback',
        ];
    }
}
