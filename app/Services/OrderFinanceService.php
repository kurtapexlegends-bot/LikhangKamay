<?php

namespace App\Services;

use App\Models\Order;

class OrderFinanceService
{
    public const CONVENIENCE_FEE_RATE = 0.03;
    public const PLATFORM_COMMISSION_RATE = 0.05;

    /**
     * @return array<string, float>
     */
    public function calculateAmounts(float $merchandiseSubtotal, string $shippingMethod, float $shippingFee = 0): array
    {
        $normalizedSubtotal = $this->money($merchandiseSubtotal);
        $convenienceFee = $shippingMethod === 'Delivery'
            ? $this->money($normalizedSubtotal * self::CONVENIENCE_FEE_RATE)
            : 0.00;
        $normalizedShippingFee = $shippingMethod === 'Delivery'
            ? $this->money($shippingFee)
            : 0.00;
        $platformCommission = $this->money($normalizedSubtotal * self::PLATFORM_COMMISSION_RATE);
        $sellerNet = $this->money($normalizedSubtotal - $platformCommission);
        $grandTotal = $this->money($normalizedSubtotal + $convenienceFee + $normalizedShippingFee);

        return [
            'merchandise_subtotal' => $normalizedSubtotal,
            'convenience_fee_amount' => $convenienceFee,
            'shipping_fee_amount' => $normalizedShippingFee,
            'platform_commission_amount' => $platformCommission,
            'seller_net_amount' => $sellerNet,
            'total_amount' => $grandTotal,
        ];
    }

    public function settleCompletedOrder(Order $order): void
    {
        // No payout-side settlement is applied here because the wallet feature
        // has been removed from the system.
    }

    private function money(float $amount): float
    {
        return round($amount, 2);
    }
}
