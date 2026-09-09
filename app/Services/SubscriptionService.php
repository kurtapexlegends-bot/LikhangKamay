<?php

namespace App\Services;

use App\Models\SubscriptionTransaction;
use App\Models\UserTierLog;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    /**
     * Activate a subscription after a successful payment.
     *
     * @param SubscriptionTransaction $transaction
     * @param array<string, mixed>|null $sessionData
     * @return string The resolution status (applied, already_paid, already_active, higher_plan_active)
     */
    public function activateSubscription(SubscriptionTransaction $transaction, ?array $sessionData = null): string
    {
        $resolution = 'applied';

        DB::transaction(function () use ($transaction, $sessionData, &$resolution) {
            $lockedTransaction = SubscriptionTransaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($lockedTransaction->status === SubscriptionTransaction::STATUS_PAID) {
                $resolution = 'already_paid';
                return;
            }

            $user = $lockedTransaction->user()->firstOrFail();
            
            $currentPlan = $this->normalizeTier($user->premium_tier);
            $targetPlan = $this->normalizeTier($lockedTransaction->to_plan);
            
            $currentLevel = $this->getTierLevel($currentPlan);
            $targetLevel = $this->getTierLevel($targetPlan);

            if ($targetLevel > $currentLevel) {
                UserTierLog::create([
                    'user_id' => $user->id,
                    'previous_tier' => $currentPlan,
                    'new_tier' => $targetPlan,
                ]);

                $user->update([
                    'premium_tier' => $targetPlan,
                    'subscription_expires_at' => now()->addDays(30),
                    'subscription_cancelled_at' => null,
                    'pending_downgrade_tier' => 'free',
                ]);
                
                // Clear plan-based staff suspension if they had any
                $user->staffMembers()
                    ->whereNotNull('staff_plan_suspended_at')
                    ->update([
                        'staff_plan_suspended_at' => null,
                    ]);
                    
                $resolution = 'applied';
            } elseif ($targetLevel === $currentLevel && $targetPlan !== 'free') {
                // Subscription Renewal event for active paid tier
                $baseDate = ($user->subscription_expires_at && $user->subscription_expires_at->isFuture())
                    ? $user->subscription_expires_at
                    : now();

                $user->update([
                    'premium_tier' => $targetPlan,
                    'subscription_expires_at' => $baseDate->copy()->addDays(30),
                    'subscription_cancelled_at' => null,
                    'pending_downgrade_tier' => 'free',
                ]);

                // Clear plan-based staff suspension if they had any
                $user->staffMembers()
                    ->whereNotNull('staff_plan_suspended_at')
                    ->update([
                        'staff_plan_suspended_at' => null,
                    ]);

                UserTierLog::create([
                    'user_id' => $user->id,
                    'previous_tier' => $currentPlan,
                    'new_tier' => $targetPlan,
                ]);

                $resolution = 'renewed';
            } elseif ($targetLevel === $currentLevel) {
                $resolution = 'already_active';
            } else {
                $resolution = 'higher_plan_active';
            }

            $updateData = [
                'status' => SubscriptionTransaction::STATUS_PAID,
                'paid_at' => $lockedTransaction->paid_at ?? now(),
            ];

            if ($sessionData) {
                $updateData['metadata'] = array_filter([
                    ...($lockedTransaction->metadata ?? []),
                    'payment_status' => $sessionData['attributes']['payment_status'] ?? null,
                    'session_status' => $sessionData['attributes']['status'] ?? null,
                    'plan_change_result' => $resolution,
                ], fn ($value) => $value !== null);
            } else {
                $updateData['metadata'] = array_filter([
                    ...($lockedTransaction->metadata ?? []),
                    'plan_change_result' => $resolution,
                ], fn ($value) => $value !== null);
            }

            $lockedTransaction->update($updateData);
        });

        return $resolution;
    }

    /**
     * Mark a subscription transaction as failed (e.g. on webhook payment failure).
     *
     * @param SubscriptionTransaction $transaction
     * @param array<string, mixed>|null $failureData
     * @return void
     */
    public function failSubscription(SubscriptionTransaction $transaction, ?array $failureData = null): void
    {
        DB::transaction(function () use ($transaction, $failureData) {
            $lockedTransaction = SubscriptionTransaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($lockedTransaction->status === SubscriptionTransaction::STATUS_PAID) {
                return;
            }

            $metadata = $lockedTransaction->metadata ?? [];
            if ($failureData) {
                $failureReason = $failureData['attributes']['failed_code'] 
                    ?? ($failureData['attributes']['failure_message'] ?? 'Payment failed');

                $metadata = array_merge($metadata, [
                    'failure_reason' => $failureReason,
                    'failed_at' => now()->toIso8601String(),
                ]);
            }

            $lockedTransaction->update([
                'status' => SubscriptionTransaction::STATUS_FAILED,
                'metadata' => $metadata,
            ]);

            $user = $lockedTransaction->user;
            if ($user) {
                \App\Models\SellerActivityLog::recordEvent([
                    'seller_owner_id' => $user->id,
                    'actor_user_id' => $user->id,
                    'actor_type' => 'system',
                    'category' => 'operations',
                    'module' => 'shop_settings',
                    'event_type' => 'subscription_payment_failed',
                    'severity' => 'warning',
                    'status' => 'failed',
                    'title' => 'Subscription Payment Failed',
                    'summary' => "Payment for {$lockedTransaction->to_plan} subscription failed.",
                    'subject_type' => SubscriptionTransaction::class,
                    'subject_id' => $lockedTransaction->id,
                    'reference' => $lockedTransaction->reference_number,
                    'target_url' => route('seller.subscription'),
                    'target_label' => 'Review Subscription',
                ]);
            }
        });
    }

    private function normalizeTier(?string $tier): string
    {
        return match ($tier) {
            'premium' => 'premium',
            'super_premium' => 'super_premium',
            default => 'free',
        };
    }

    private function getTierLevel(string $tier): int
    {
        return match ($tier) {
            'free', 'artisan' => 1,
            'premium' => 2,
            'super_premium' => 3,
            default => 1,
        };
    }
}
