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

                $user->update(['premium_tier' => $targetPlan]);
                
                // Clear plan-based staff suspension if they had any
                $user->staffMembers()
                    ->whereNotNull('staff_plan_suspended_at')
                    ->update([
                        'staff_plan_suspended_at' => null,
                    ]);
                    
                $resolution = 'applied';
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
