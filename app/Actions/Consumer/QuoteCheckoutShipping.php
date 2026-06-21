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

            $quote = $this->checkoutShippingService->estimateForSeller($seller, [
                ...$shippingContext,
                'shipping_method' => $request->shipping_method,
            ]);

            $shippingFee = round((float) ($quote['amount'] ?? 0), 2);
            $totalShippingFee += $shippingFee;

            $groups[] = [
                'seller_id' => (int) $artisanId,
                'shipping_fee_amount' => $shippingFee,
                'currency' => $quote['currency'] ?? 'PHP',
                'source' => $quote['source'] ?? 'fallback_flat',
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
