<?php

namespace App\Actions\Seller\Subscription;

use App\Models\SubscriptionTransaction;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ProcessSubscriptionLifecycle
{
    public function __construct(
        private readonly DowngradeSubscription $downgradeAction
    ) {
    }

    /**
     * Process expired subscriptions and pending transaction cleanups.
     *
     * @return array{downgraded_count: int, failed_transactions_count: int}
     */
    public function execute(): array
    {
        $downgradedCount = 0;
        $failedTransactionsCount = 0;

        // 1. Process graceful downgrades for expired subscriptions
        $expiredSellers = User::query()
            ->where('role', 'artisan')
            ->whereIn('premium_tier', ['premium', 'super_premium'])
            ->whereNotNull('subscription_expires_at')
            ->where('subscription_expires_at', '<=', now())
            ->get();

        foreach ($expiredSellers as $seller) {
            try {
                $targetTier = $seller->pending_downgrade_tier ?? 'free';
                if (!in_array($targetTier, ['free', 'premium'], true) || $targetTier === $seller->premium_tier) {
                    $targetTier = 'free';
                }

                $this->downgradeAction->execute(
                    $seller,
                    $targetTier,
                    null,
                    route('dashboard')
                );

                $downgradedCount++;
                Log::info("Graceful downgrade executed for artisan {$seller->id} to {$targetTier}.");
            } catch (\Throwable $e) {
                Log::error("Failed graceful downgrade for artisan {$seller->id}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);
            }
        }

        // 2. Cleanup stale/expired pending subscription checkout transactions (> 24 hours)
        $staleTransactions = SubscriptionTransaction::query()
            ->where('status', SubscriptionTransaction::STATUS_PENDING)
            ->where('created_at', '<=', now()->subHours(24))
            ->get();

        foreach ($staleTransactions as $transaction) {
            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_FAILED,
                'metadata' => array_merge($transaction->metadata ?? [], [
                    'failure_reason' => 'Checkout session expired after 24 hours without payment.',
                    'expired_at' => now()->toIso8601String(),
                ]),
            ]);
            $failedTransactionsCount++;
        }

        return [
            'downgraded_count' => $downgradedCount,
            'failed_transactions_count' => $failedTransactionsCount,
        ];
    }
}
