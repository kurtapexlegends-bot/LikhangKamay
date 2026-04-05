<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\Wallet;
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

            if (!$this->shouldSettleToWallets($lockedOrder)) {
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

    public function shouldSettleToWallets(Order $order): bool
    {
        return $order->payment_method !== 'COD'
            && $order->shipping_method === 'Delivery';
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
            $sellerShortfall = 0.0;

            if ($lockedOrder->wallet_settled_at !== null && $seller && (float) $lockedOrder->seller_net_amount > 0) {
                $sellerWallet = Wallet::query()
                    ->lockForUpdate()
                    ->findOrFail($this->walletService->getOrCreateWallet($seller)->id);

                $sellerReversalAmount = $this->money(min(
                    (float) $lockedOrder->seller_net_amount,
                    max(0, (float) $sellerWallet->balance),
                ));

                $sellerShortfall = $this->money((float) $lockedOrder->seller_net_amount - $sellerReversalAmount);

                if ($sellerReversalAmount > 0) {
                    $this->walletService->debit(
                        $sellerWallet,
                        $sellerReversalAmount,
                        'order_refund_seller_reversal',
                        'Seller payout reversal for refunded order ' . $lockedOrder->order_number,
                        $lockedOrder,
                        $buyer,
                        [
                            'seller_reversal_shortfall' => $sellerShortfall > 0 ? $sellerShortfall : null,
                        ],
                    );
                }
            }

            $platformRevenue = $this->money((float) $lockedOrder->platform_commission_amount + (float) $lockedOrder->convenience_fee_amount);
            $platformReversalAmount = $this->money($platformRevenue + $sellerShortfall);
            $platformWallet = $this->walletService->getPlatformWallet();
            if ($lockedOrder->wallet_settled_at !== null && $platformWallet && $platformReversalAmount > 0) {
                $this->walletService->debit(
                    $platformWallet,
                    $platformReversalAmount,
                    'order_refund_platform_reversal',
                    $sellerShortfall > 0
                        ? 'Platform-backed refund recovery for order ' . $lockedOrder->order_number
                        : 'Platform revenue reversal for refunded order ' . $lockedOrder->order_number,
                    $lockedOrder,
                    $seller,
                    [
                        'platform_revenue_reversal' => $platformRevenue,
                        'seller_shortfall_absorbed' => $sellerShortfall > 0 ? $sellerShortfall : null,
                    ],
                    true,
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
                    [
                        'seller_shortfall_absorbed' => $sellerShortfall > 0 ? $sellerShortfall : null,
                    ],
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
