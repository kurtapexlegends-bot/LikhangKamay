<?php

namespace App\Actions\Seller\Subscription;

use App\Models\User;
use App\Models\SubscriptionTransaction;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VerifySubscriptionPayment
{
    /**
     * Verify successful payment session and apply upgrades.
     *
     * @param SubscriptionTransaction $transaction
     * @param PayMongoService $payMongoService
     * @param SubscriptionService $subscriptionService
     * @return string
     * @throws \Exception
     */
    public function verifySuccess(
        SubscriptionTransaction $transaction,
        PayMongoService $payMongoService,
        SubscriptionService $subscriptionService
    ): string {
        return DB::transaction(function () use ($transaction, $payMongoService, $subscriptionService) {
            // lock transaction
            $tx = SubscriptionTransaction::lockForUpdate()->findOrFail($transaction->id);

            if ($tx->status === SubscriptionTransaction::STATUS_PAID) {
                return 'already_paid';
            }

            if (!$tx->paymongo_session_id) {
                throw new \Exception('missing_session_id');
            }

            $session = $payMongoService->retrieveCheckoutSession($tx->paymongo_session_id);
            $attributes = $session['attributes'] ?? [];
            $referenceNumber = $attributes['reference_number'] ?? null;

            if ($referenceNumber && $referenceNumber !== $tx->reference_number) {
                Log::warning('Subscription PayMongo reference mismatch', [
                    'subscription_transaction_id' => $tx->id,
                    'expected_reference' => $tx->reference_number,
                    'actual_reference' => $referenceNumber,
                ]);

                throw new \Exception('reference_mismatch');
            }

            if (!$this->sessionHasSuccessfulPayment($session)) {
                throw new \Exception('not_paid');
            }

            return $subscriptionService->activateSubscription($tx, $session);
        });
    }

    /**
     * Cancel a pending transaction.
     *
     * @param SubscriptionTransaction $transaction
     * @return void
     */
    public function verifyCancel(SubscriptionTransaction $transaction): void
    {
        DB::transaction(function () use ($transaction) {
            $tx = SubscriptionTransaction::lockForUpdate()->findOrFail($transaction->id);
            if ($tx->status === SubscriptionTransaction::STATUS_PENDING) {
                $tx->update([
                    'status' => SubscriptionTransaction::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                ]);
            }
        });
    }

    /**
     * Reconcile all pending upgrades for a user.
     *
     * @param User $user
     * @param PayMongoService $payMongoService
     * @param SubscriptionService $subscriptionService
     * @return void
     */
    public function reconcilePendingUpgradesForUser(
        User $user,
        PayMongoService $payMongoService,
        SubscriptionService $subscriptionService
    ): void {
        $pendingTransactions = SubscriptionTransaction::query()
            ->where('user_id', $user->id)
            ->where('status', SubscriptionTransaction::STATUS_PENDING)
            ->whereNotNull('paymongo_session_id')
            ->orderBy('id')
            ->get();

        foreach ($pendingTransactions as $transaction) {
            try {
                $session = $payMongoService->retrieveCheckoutSession($transaction->paymongo_session_id);
                $this->reconcileTransactionFromSession($transaction, $session, $subscriptionService);
            } catch (\Throwable $e) {
                Log::warning('Subscription pending-payment reconciliation failed.', [
                    'subscription_transaction_id' => $transaction->id,
                    'paymongo_session_id' => $transaction->paymongo_session_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Reconcile transaction status using session status.
     *
     * @param SubscriptionTransaction $transaction
     * @param array $session
     * @param SubscriptionService $subscriptionService
     * @return void
     */
    public function reconcileTransactionFromSession(
        SubscriptionTransaction $transaction,
        array $session,
        SubscriptionService $subscriptionService
    ): void {
        DB::transaction(function () use ($transaction, $session, $subscriptionService) {
            $tx = SubscriptionTransaction::lockForUpdate()->findOrFail($transaction->id);

            $attributes = $session['attributes'] ?? [];
            $referenceNumber = $attributes['reference_number'] ?? null;

            if ($referenceNumber && $referenceNumber !== $tx->reference_number) {
                Log::warning('Subscription PayMongo reference mismatch during reconciliation', [
                    'subscription_transaction_id' => $tx->id,
                    'expected_reference' => $tx->reference_number,
                    'actual_reference' => $referenceNumber,
                ]);

                return;
            }

            $sessionStatus = $attributes['status'] ?? null;
            $paymentStatus = $attributes['payment_status'] ?? null;

            if ($this->sessionHasSuccessfulPayment($session)) {
                $subscriptionService->activateSubscription($tx, $session);
                return;
            }

            if (in_array($sessionStatus, ['expired', 'failed'], true) || in_array($paymentStatus, ['failed'], true)) {
                $tx->update([
                    'status' => SubscriptionTransaction::STATUS_FAILED,
                    'metadata' => array_filter([
                        ...($tx->metadata ?? []),
                        'payment_status' => $paymentStatus,
                        'session_status' => $sessionStatus,
                        'plan_change_result' => 'failed_reconciliation',
                    ], fn ($value) => $value !== null),
                ]);

                return;
            }

            if ($sessionStatus === 'cancelled') {
                $tx->update([
                    'status' => SubscriptionTransaction::STATUS_CANCELLED,
                    'cancelled_at' => $tx->cancelled_at ?? now(),
                    'metadata' => array_filter([
                        ...($tx->metadata ?? []),
                        'payment_status' => $paymentStatus,
                        'session_status' => $sessionStatus,
                        'plan_change_result' => 'cancelled_reconciliation',
                    ], fn ($value) => $value !== null),
                ]);
            }
        });
    }

    /**
     * Check if payment is successful in checkout session.
     *
     * @param array $session
     * @return bool
     */
    private function sessionHasSuccessfulPayment(array $session): bool
    {
        $attributes = $session['attributes'] ?? [];

        if (($attributes['payment_status'] ?? 'unpaid') === 'paid') {
            return true;
        }

        foreach (($session['included'] ?? []) as $included) {
            if (($included['type'] ?? null) === 'payment' && (($included['attributes']['status'] ?? null) === 'paid')) {
                return true;
            }
        }

        if (!empty($attributes['payments']) && is_array($attributes['payments'])) {
            foreach ($attributes['payments'] as $payment) {
                $paymentStatus = $payment['status'] ?? ($payment['attributes']['status'] ?? null);
                if ($paymentStatus === 'paid') {
                    return true;
                }
            }
        }

        return false;
    }
}
