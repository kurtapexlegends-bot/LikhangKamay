<?php

namespace App\Services;

use App\Models\Order;

class OrderFinanceService
{
    public static function getPlatformCommissionRate(): float
    {
        return (float) \App\Facades\Settings::get('commission_rate', 5.0) / 100;
    }

    public static function getConvenienceFeeRate(): float
    {
        // The setting 'convenience_fee' is a flat PHP amount, not a rate.
        // Let's check how it's used in calculateAmounts.
        return (float) \App\Facades\Settings::get('convenience_fee', 15.0);
    }

    /**
     * @return array<string, float>
     */
    public static function getPricingData(): array
    {
        return [
            'commission_rate' => self::getPlatformCommissionRate(),
            'convenience_fee_rate' => self::getConvenienceFeeRate(),
        ];
    }

    /**
     * @return array<string, float>
     */
    public function calculateAmounts(float $merchandiseSubtotal, string $shippingMethod, float $shippingFee = 0): array
    {
        $normalizedSubtotal = $this->money($merchandiseSubtotal);
        $convenienceFee = $shippingMethod === 'Delivery'
            ? $this->money(self::getConvenienceFeeRate())
            : 0.00;
        $normalizedShippingFee = $shippingMethod === 'Delivery'
            ? $this->money($shippingFee)
            : 0.00;
        $platformCommission = $this->money($normalizedSubtotal * self::getPlatformCommissionRate());
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
