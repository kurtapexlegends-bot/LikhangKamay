<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderFinanceService
{
    public const CONVENIENCE_FEE_RATE = 0.03;
    public const PLATFORM_COMMISSION_RATE = 0.05;

    public function __construct(
        private readonly WalletService $walletService,
    ) {
    }

    /**
     * @return array<string, float>
     */
    public function calculateAmounts(float $merchandiseSubtotal, string $shippingMethod): array
    {
        $normalizedSubtotal = $this->money($merchandiseSubtotal);
        $convenienceFee = $shippingMethod === 'Delivery'
            ? $this->money($normalizedSubtotal * self::CONVENIENCE_FEE_RATE)
            : 0.00;
        $platformCommission = $this->money($normalizedSubtotal * self::PLATFORM_COMMISSION_RATE);
        $sellerNet = $this->money($normalizedSubtotal - $platformCommission);
        $grandTotal = $this->money($normalizedSubtotal + $convenienceFee);

        return [
            'merchandise_subtotal' => $normalizedSubtotal,
            'convenience_fee_amount' => $convenienceFee,
            'platform_commission_amount' => $platformCommission,
            'seller_net_amount' => $sellerNet,
            'total_amount' => $grandTotal,
        ];
    }

    public function settleCompletedOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->with(['user', 'artisan'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->wallet_settled_at !== null) {
                return;
            }

            if ($lockedOrder->status !== 'Completed' || $lockedOrder->payment_status !== 'paid') {
                return;
            }

            $seller = $lockedOrder->artisan;

            if ($seller && (float) $lockedOrder->seller_net_amount > 0) {
                $this->walletService->credit(
                    $seller,
                    (float) $lockedOrder->seller_net_amount,
                    'order_completed_seller_payout',
                    'Seller wallet payout for order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $lockedOrder->user,
                );
            }

            $platformRevenue = $this->money((float) $lockedOrder->platform_commission_amount + (float) $lockedOrder->convenience_fee_amount);
            $platformWallet = $this->walletService->getPlatformWallet();
            if ($platformWallet && $platformRevenue > 0) {
                $this->walletService->credit(
                    $platformWallet,
                    $platformRevenue,
                    'order_completed_platform_revenue',
                    'Platform revenue for order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $seller,
                );
            }

            $lockedOrder->update([
                'wallet_settled_at' => now(),
            ]);
        });
    }

    public function refundOrderToBuyerWallet(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->with(['user', 'artisan'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->refunded_to_wallet_at !== null) {
                return;
            }

            $seller = $lockedOrder->artisan;
            $buyer = $lockedOrder->user;

            if ($lockedOrder->wallet_settled_at !== null && $seller && (float) $lockedOrder->seller_net_amount > 0) {
                $this->walletService->debit(
                    $seller,
                    (float) $lockedOrder->seller_net_amount,
                    'order_refund_seller_reversal',
                    'Seller payout reversal for refunded order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $buyer,
                );
            }

            $platformRevenue = $this->money((float) $lockedOrder->platform_commission_amount + (float) $lockedOrder->convenience_fee_amount);
            $platformWallet = $this->walletService->getPlatformWallet();
            if ($lockedOrder->wallet_settled_at !== null && $platformWallet && $platformRevenue > 0) {
                $this->walletService->debit(
                    $platformWallet,
                    $platformRevenue,
                    'order_refund_platform_reversal',
                    'Platform revenue reversal for refunded order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $seller,
                );
            }

            if ($buyer && (float) $lockedOrder->total_amount > 0) {
                $this->walletService->credit(
                    $buyer,
                    (float) $lockedOrder->total_amount,
                    'order_refund_credit',
                    'Refund credited to wallet for order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $seller,
                );
            }

            $lockedOrder->update([
                'refunded_to_wallet_at' => now(),
            ]);
        });
    }

    private function money(float $amount): float
    {
        return round($amount, 2);
    }
}
