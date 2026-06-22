<?php

namespace App\Actions\Seller\Subscription;

use App\Models\User;
use App\Models\SubscriptionTransaction;
use App\Services\PayMongoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class InitiateSubscriptionUpgrade
{
    private const PLAN_LEVELS = [
        'free' => 1,
        'artisan' => 1,
        'premium' => 2,
        'super_premium' => 3,
    ];

    /**
     * Execute subscription upgrade initiation.
     *
     * @param User $user
     * @param string $targetPlan
     * @param PayMongoService $payMongoService
     * @return string
     * @throws \Exception
     */
    public function execute(User $user, string $targetPlan, PayMongoService $payMongoService): string
    {
        $currentPlan = $this->normalizeTier($user->premium_tier);
        $currentLevel = $this->getTierLevel($currentPlan);
        $targetLevel = $this->getTierLevel($targetPlan);

        if ($targetLevel < $currentLevel) {
            throw new \Exception('downgrade_flow');
        }

        if ($targetLevel === $currentLevel) {
            throw new \Exception('already_on_plan');
        }

        $amount = $this->getPlanPrice($targetPlan);

        $transaction = DB::transaction(function () use ($user, $currentPlan, $targetPlan, $amount) {
            return SubscriptionTransaction::create($this->buildSubscriptionTransactionPayload(
                $user,
                $currentPlan,
                $targetPlan,
                $amount,
                [
                    'status' => SubscriptionTransaction::STATUS_PENDING,
                    'reference_number' => 'SUB-' . strtoupper(Str::random(10)),
                    'metadata' => [
                        'seller_name' => $user->shop_name ?: $user->name,
                    ],
                ],
            ));
        });

        $planName = $this->formatPlanName($targetPlan);
        $checkoutData = [
            'line_items' => [[
                'currency' => 'PHP',
                'amount' => (int) round($amount * 100),
                'description' => "{$planName} seller subscription upgrade",
                'name' => "{$planName} Subscription",
                'quantity' => 1,
            ]],
            'payment_method_types' => ['gcash', 'grab_pay', 'paymaya', 'card'],
            'success_url' => URL::signedRoute('seller.subscription.payment.success', ['subscription' => $transaction->reference_number]),
            'cancel_url' => URL::signedRoute('seller.subscription.payment.cancel', ['subscription' => $transaction->reference_number]),
            'description' => 'Subscription upgrade for ' . ($user->shop_name ?: $user->name),
            'reference_number' => $transaction->reference_number,
            'send_email_receipt' => true,
        ];

        try {
            $session = $payMongoService->createCheckoutSession($checkoutData);

            $transaction->update([
                'paymongo_session_id' => $session['id'],
                'metadata' => [
                    ...($transaction->metadata ?? []),
                    'checkout_url' => $session['attributes']['checkout_url'] ?? null,
                ],
            ]);

            return $session['attributes']['checkout_url'];
        } catch (\Throwable $e) {
            Log::error('PayMongo subscription checkout error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'subscription_transaction_id' => $transaction->id,
                'target_plan' => $targetPlan,
            ]);

            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_FAILED,
                'metadata' => [
                    ...($transaction->metadata ?? []),
                    'error' => $e->getMessage(),
                ],
            ]);

            throw new \Exception('checkout_failed');
        }
    }

    private function getPlanPrice(string $plan): float
    {
        return match ($plan) {
            'premium' => (float) \App\Facades\Settings::get('tier_premium_price', 199.00),
            'super_premium' => (float) \App\Facades\Settings::get('tier_super_premium_price', 399.00),
            default => 0.00,
        };
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
        return self::PLAN_LEVELS[$tier] ?? 1;
    }

    private function formatPlanName(?string $plan): string
    {
        return match ($plan) {
            'premium' => 'Premium',
            'super_premium' => 'Elite',
            default => 'Standard',
        };
    }

    private function buildSubscriptionTransactionPayload(User $user, string $fromPlan, string $toPlan, float $amount, array $overrides = []): array
    {
        $payload = [
            'user_id' => $user->id,
            'from_plan' => $fromPlan,
            'to_plan' => $toPlan,
            'amount' => $amount,
            'currency' => 'PHP',
            ...$overrides,
        ];

        if (Schema::hasColumn('subscription_transactions', 'artisan_id')) {
            $payload['artisan_id'] = $user->id;
        }

        if (Schema::hasColumn('subscription_transactions', 'tier_purchased')) {
            $payload['tier_purchased'] = $toPlan;
        }

        if (Schema::hasColumn('subscription_transactions', 'amount_paid')) {
            $payload['amount_paid'] = $amount;
        }

        return $payload;
    }
}
