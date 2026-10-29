<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;

class OrderFinanceService
{
    public static function getPlatformCommissionRate(): float
    {
        return 0.00;
    }

    public static function getConvenienceFeeRate(): float
    {
        // Now 'convenience_fee' is a percentage (e.g. 3.0 represents 3%).
        return (float) \App\Facades\Settings::get('convenience_fee', 3.0) / 100;
    }

    /**
     * @return array<string, float>
     */
    public static function getPricingData(): array
    {
        return [
            'commission_rate' => 0.00,
            'convenience_fee_rate' => self::getConvenienceFeeRate(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function calculateAmounts(float $merchandiseSubtotal, string $shippingMethod, float $shippingFee = 0, ?User $seller = null): array
    {
        $normalizedSubtotal = $this->money($merchandiseSubtotal);
        $convenienceFee = $shippingMethod === 'Delivery'
            ? $this->money($normalizedSubtotal * self::getConvenienceFeeRate())
            : 0.00;
        $normalizedShippingFee = $shippingMethod === 'Delivery'
            ? $this->money($shippingFee)
            : 0.00;
        $platformCommission = 0.00;
        $sellerNet = $normalizedSubtotal;
        $grandTotal = $this->money($normalizedSubtotal + $convenienceFee + $normalizedShippingFee);

        $isVatRegistered = (bool) ($seller?->is_vat_registered);
        $vatRate = 12.00;

        if ($isVatRegistered) {
            $vatableSales = $this->money($normalizedSubtotal / 1.12);
            $vatAmount = $this->money($normalizedSubtotal - $vatableSales);
            $vatExemptSales = 0.00;
            $vatType = 'vat_inclusive';
        } else {
            $vatableSales = 0.00;
            $vatAmount = 0.00;
            $vatExemptSales = $normalizedSubtotal;
            $vatType = 'vat_exempt';
        }

        return [
            'merchandise_subtotal' => $normalizedSubtotal,
            'convenience_fee_amount' => $convenienceFee,
            'shipping_fee_amount' => $normalizedShippingFee,
            'platform_commission_amount' => $platformCommission,
            'seller_net_amount' => $sellerNet,
            'total_amount' => $grandTotal,
            'vat_type' => $vatType,
            'vatable_sales' => $vatableSales,
            'vat_amount' => $vatAmount,
            'vat_exempt_sales' => $vatExemptSales,
            'vat_rate' => $vatRate,
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
