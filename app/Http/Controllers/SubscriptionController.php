<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionTransaction;
use App\Models\UserTierLog;
use App\Services\PayMongoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    private const PLAN_LEVELS = [
        'free' => 1,
        'artisan' => 1,
        'premium' => 2,
        'super_premium' => 3,
    ];

    private const PLAN_PRICES = [
        'premium' => 199.00,
        'super_premium' => 399.00,
    ];

    public function __construct(
        private readonly PayMongoService $payMongoService,
    ) {
    }

    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $this->reconcilePendingUpgradesForUser($user);

        $user->refresh();
        $activeProductsCount = $user->products()->where('status', 'Active')->count();
        $limit = $user->getActiveProductLimit();
        $linkedStaffCount = $user->staffMembers()->count();
        $pendingUpgrade = SubscriptionTransaction::query()
            ->where('user_id', $user->id)
            ->where('status', SubscriptionTransaction::STATUS_PENDING)
            ->latest('id')
            ->first();
        $recentTransactions = SubscriptionTransaction::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (SubscriptionTransaction $transaction) => $this->serializeSubscriptionTransactionSummary($transaction))
            ->values()
            ->all();

        return Inertia::render('Seller/Subscription', [
            'currentPlan' => $user->premium_tier,
            'activeProductsCount' => $activeProductsCount,
            'limit' => $limit,
            'linkedStaffCount' => $linkedStaffCount,
            'recentTransactions' => $recentTransactions,
            'pendingUpgrade' => $pendingUpgrade ? [
                'plan' => $pendingUpgrade->to_plan,
                'planLabel' => $this->formatPlanName($pendingUpgrade->to_plan),
                'amount' => (float) $pendingUpgrade->amount,
                'currency' => $pendingUpgrade->currency,
                'checkoutUrl' => $pendingUpgrade->metadata['checkout_url'] ?? null,
                'referenceNumber' => $pendingUpgrade->reference_number,
                'createdAt' => $pendingUpgrade->created_at?->toIso8601String(),
            ] : null,
            // Only send active products in case they need to manage downgrades
            'activeProducts' => $user->products()->where('status', 'Active')->select('id', 'name', 'sku', 'cover_photo_path', 'price')->get(),
        ]);
    }

    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:premium,super_premium'
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $currentPlan = $this->normalizeTier($user->premium_tier);
        $currentLevel = $this->getTierLevel($currentPlan);
        $targetLevel = $this->getTierLevel($validated['plan']);

        if ($targetLevel < $currentLevel) {
            return redirect()->route('seller.subscription')->with('warning', 'Please use the downgrade flow to switch to a lower plan.');
        }

        if ($targetLevel === $currentLevel) {
            return back()->with('error', 'You are already on this plan.');
        }

        $amount = self::PLAN_PRICES[$validated['plan']] ?? 0;

        $transaction = SubscriptionTransaction::create($this->buildSubscriptionTransactionPayload(
            $user,
            $currentPlan,
            $validated['plan'],
            $amount,
            [
                'status' => SubscriptionTransaction::STATUS_PENDING,
                'reference_number' => 'SUB-' . strtoupper(Str::random(10)),
                'metadata' => [
                    'seller_name' => $user->shop_name ?: $user->name,
                ],
            ],
        ));

        $planName = $this->formatPlanName($validated['plan']);
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
            $session = $this->payMongoService->createCheckoutSession($checkoutData);

            $transaction->update([
                'paymongo_session_id' => $session['id'],
                'metadata' => [
                    ...($transaction->metadata ?? []),
                    'checkout_url' => $session['attributes']['checkout_url'] ?? null,
                ],
            ]);

            return Inertia::location($session['attributes']['checkout_url']);
        } catch (\Throwable $e) {
            Log::error('PayMongo subscription checkout error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'subscription_transaction_id' => $transaction->id,
                'target_plan' => $validated['plan'],
            ]);

            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_FAILED,
                'metadata' => [
                    ...($transaction->metadata ?? []),
                    'error' => $e->getMessage(),
                ],
            ]);

            return back()->with('error', 'Subscription checkout could not be started right now. Please try again.');
        }
    }

    public function downgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:free,premium',
            'keep_active_ids' => 'nullable|array',
            'keep_active_ids.*' => [
                'nullable',
                \Illuminate\Validation\Rule::exists('products', 'id')->where('user_id', Auth::id())
            ]
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $newTier = $validated['plan'];
        $previousUrl = url()->previous();
        $previousTier = $user->premium_tier;
        $shouldSuspendStaffForPlan = $previousTier === 'super_premium' && $newTier === 'free';

        // Determine new limit from User model
        $user->premium_tier = $newTier;
        $newLimit = $user->getActiveProductLimit();
        $user->premium_tier = $previousTier;

        $activeIds = $user->products()
            ->where('status', 'Active')
            ->pluck('id')
            ->toArray();

        $keepIds = count($activeIds) > $newLimit
            ? $this->getTopSellingActiveProductIds($user, $newLimit)
            : ($validated['keep_active_ids'] ?? $activeIds);
        
        if (count($keepIds) > $newLimit) {
             return back()->withErrors(['limit' => 'You selected too many products to keep active. The limit for this tier is ' . $newLimit]);
        }

        // Verify that the requested IDs belong to the user
        $validKeepIds = $user->products()->whereIn('id', $keepIds)->where('status', 'Active')->pluck('id')->toArray();

        // Draft all active products NOT in the keep list
        $user->products()
            ->where('status', 'Active')
            ->whereNotIn('id', $validKeepIds)
            ->update(['status' => 'Draft']);
        UserTierLog::create([
            'user_id' => $user->id,
            'previous_tier' => $previousTier,
            'new_tier' => $newTier,
        ]);

        $user->update(['premium_tier' => $newTier]);

        if ($shouldSuspendStaffForPlan) {
            $this->suspendStaffForStandardDowngrade($user);
        }

        $redirectTo = $this->getSafePostDowngradeRedirect($user, $previousUrl);
        $successMessage = $shouldSuspendStaffForPlan
            ? 'Plan downgraded successfully. Excess products set to Draft. Elite-only features were suspended, and linked employee workspace accounts were suspended until you upgrade again.'
            : 'Plan downgraded successfully. Excess products set to Draft.';

        return redirect()
            ->to($redirectTo)
            ->with('success', $successMessage);
    }

    /**
     * Keep the highest-selling active products when a downgrade exceeds the new plan limit.
     * Sales ties fall back to the oldest active listing first, then the lowest ID for stability.
     *
     * @return array<int>
     */
    private function getTopSellingActiveProductIds(\App\Models\User $user, int $limit): array
    {
        if ($limit <= 0) {
            return [];
        }

        return $user->products()
            ->where('status', 'Active')
            ->orderByDesc('sold')
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id')
            ->toArray();
    }

    public function success(Request $request)
    {
        $transaction = SubscriptionTransaction::query()
            ->where('reference_number', $request->query('subscription'))
            ->firstOrFail();

        if ($transaction->status === SubscriptionTransaction::STATUS_PAID) {
            return $this->redirectAfterPaymentResolution(
                $transaction,
                'success',
                'Subscription payment already verified.',
                'Subscription payment was already verified. Sign in to view your active plan.'
            );
        }

        if (!$transaction->paymongo_session_id) {
            return $this->redirectAfterPaymentResolution(
                $transaction,
                'error',
                'Subscription verification could not be completed.',
                'Subscription verification could not be completed. Sign in and try again.'
            );
        }

        try {
            $session = $this->payMongoService->retrieveCheckoutSession($transaction->paymongo_session_id);
            $attributes = $session['attributes'] ?? [];
            $referenceNumber = $attributes['reference_number'] ?? null;

            if ($referenceNumber && $referenceNumber !== $transaction->reference_number) {
                Log::warning('Subscription PayMongo reference mismatch', [
                    'subscription_transaction_id' => $transaction->id,
                    'expected_reference' => $transaction->reference_number,
                    'actual_reference' => $referenceNumber,
                ]);

                return $this->redirectAfterPaymentResolution(
                    $transaction,
                    'error',
                    'Subscription verification failed. Please contact support.',
                    'Subscription verification failed. Sign in and contact support if you were charged.'
                );
            }

            if (!$this->sessionHasSuccessfulPayment($session)) {
                return $this->redirectAfterPaymentResolution(
                    $transaction,
                    'error',
                    'Subscription payment is not yet confirmed.',
                    'Subscription payment is not yet confirmed. Sign in later to check your plan.'
                );
            }

            $resolution = $this->applySuccessfulSubscriptionPayment($transaction, $session);

            return match ($resolution) {
                'already_active', 'already_paid' => $this->redirectAfterPaymentResolution(
                    $transaction->fresh(),
                    'success',
                    'Payment verified. Your selected subscription plan is already active.',
                    'Payment verified. Sign in to view your active subscription plan.'
                ),
                'higher_plan_active' => $this->redirectAfterPaymentResolution(
                    $transaction->fresh(),
                    'success',
                    'Payment verified. No plan change was needed because your shop already has a higher plan.',
                    'Payment verified. Sign in to view your active subscription plan.'
                ),
                default => $this->redirectAfterPaymentResolution(
                    $transaction->fresh(),
                    'success',
                    'Subscription upgraded successfully after payment verification.',
                    'Payment verified successfully. Sign in to view your upgraded subscription plan.'
                ),
            };
        } catch (\Throwable $e) {
            Log::error('Subscription verification error: ' . $e->getMessage(), [
                'subscription_transaction_id' => $transaction->id,
            ]);

            return $this->redirectAfterPaymentResolution(
                $transaction,
                'error',
                'Subscription verification failed. Please contact support.',
                'Subscription verification failed. Sign in and contact support if you were charged.'
            );
        }
    }

    public function cancel(Request $request)
    {
        $transaction = SubscriptionTransaction::query()
            ->where('reference_number', $request->query('subscription'))
            ->firstOrFail();

        if ($transaction->status === SubscriptionTransaction::STATUS_PENDING) {
            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);
        }

        return $this->redirectAfterPaymentResolution(
            $transaction,
            'error',
            'Subscription payment was cancelled.',
            'Subscription payment was cancelled. Sign in to continue.'
        );
    }

    private function getSafePostDowngradeRedirect(\App\Models\User $user, string $previousUrl): string
    {
        $path = parse_url($previousUrl, PHP_URL_PATH) ?? '';

        $pathModuleMap = [
            '/orders' => 'orders',
            '/analytics' => 'analytics',
            '/products' => 'products',
            '/3d-manager' => '3d',
            '/shop-settings' => 'shop_settings',
            '/sponsorships' => 'sponsorships',
            '/chat' => 'messages',
            '/reviews' => 'reviews',
            '/hr' => 'hr',
            '/accounting' => 'accounting',
            '/procurement/stock-requests' => 'stock_requests',
            '/procurement' => 'procurement',
        ];

        foreach ($pathModuleMap as $pathPrefix => $module) {
            if (str_starts_with($path, $pathPrefix) && !$user->canAccessSellerModule($module)) {
                return route('dashboard');
            }
        }

        // Keep the current page when still allowed (fixes forced /subscription redirects).
        // Use path-only redirect to avoid external redirect targets.
        return $path ?: route('dashboard');
    }

    private function suspendStaffForStandardDowngrade(\App\Models\User $seller): void
    {
        $seller->staffMembers()
            ->whereNull('staff_plan_suspended_at')
            ->update([
                'staff_plan_suspended_at' => now(config('app.timezone')),
            ]);
    }

    private function clearPlanBasedStaffSuspension(\App\Models\User $seller): void
    {
        $seller->staffMembers()
            ->whereNotNull('staff_plan_suspended_at')
            ->update([
                'staff_plan_suspended_at' => null,
            ]);
    }

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

    private function redirectAfterPaymentResolution(SubscriptionTransaction $transaction, string $flashKey, string $ownerMessage, string $guestMessage)
    {
        if (Auth::id() === $transaction->user_id) {
            return redirect()->route('seller.subscription')->with($flashKey, $ownerMessage);
        }

        if (!Auth::check()) {
            return redirect()->route('login')->with('status', $guestMessage);
        }

        return redirect('/')->with($flashKey, $guestMessage);
    }

    private function reconcilePendingUpgradesForUser(\App\Models\User $user): void
    {
        $pendingTransactions = SubscriptionTransaction::query()
            ->where('user_id', $user->id)
            ->where('status', SubscriptionTransaction::STATUS_PENDING)
            ->whereNotNull('paymongo_session_id')
            ->orderBy('id')
            ->get();

        foreach ($pendingTransactions as $transaction) {
            try {
                $session = $this->payMongoService->retrieveCheckoutSession($transaction->paymongo_session_id);
            } catch (\Throwable $e) {
                Log::warning('Subscription pending-payment reconciliation failed.', [
                    'subscription_transaction_id' => $transaction->id,
                    'paymongo_session_id' => $transaction->paymongo_session_id,
                    'error' => $e->getMessage(),
                ]);

                continue;
            }

            $this->reconcileTransactionFromSession($transaction, $session);
        }
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function reconcileTransactionFromSession(SubscriptionTransaction $transaction, array $session): void
    {
        $attributes = $session['attributes'] ?? [];
        $referenceNumber = $attributes['reference_number'] ?? null;

        if ($referenceNumber && $referenceNumber !== $transaction->reference_number) {
            Log::warning('Subscription PayMongo reference mismatch during reconciliation', [
                'subscription_transaction_id' => $transaction->id,
                'expected_reference' => $transaction->reference_number,
                'actual_reference' => $referenceNumber,
            ]);

            return;
        }

        $sessionStatus = $attributes['status'] ?? null;
        $paymentStatus = $attributes['payment_status'] ?? null;

        if ($this->sessionHasSuccessfulPayment($session)) {
            $this->applySuccessfulSubscriptionPayment($transaction, $session);

            return;
        }

        if (in_array($sessionStatus, ['expired', 'failed'], true) || in_array($paymentStatus, ['failed'], true)) {
            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_FAILED,
                'metadata' => array_filter([
                    ...($transaction->metadata ?? []),
                    'payment_status' => $paymentStatus,
                    'session_status' => $sessionStatus,
                    'plan_change_result' => 'failed_reconciliation',
                ], fn ($value) => $value !== null),
            ]);

            return;
        }

        if ($sessionStatus === 'cancelled') {
            $transaction->update([
                'status' => SubscriptionTransaction::STATUS_CANCELLED,
                'cancelled_at' => $transaction->cancelled_at ?? now(),
                'metadata' => array_filter([
                    ...($transaction->metadata ?? []),
                    'payment_status' => $paymentStatus,
                    'session_status' => $sessionStatus,
                    'plan_change_result' => 'cancelled_reconciliation',
                ], fn ($value) => $value !== null),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function applySuccessfulSubscriptionPayment(SubscriptionTransaction $transaction, array $session): string
    {
        $resolution = 'applied';

        DB::transaction(function () use ($transaction, $session, &$resolution) {
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
                $this->clearPlanBasedStaffSuspension($user);
                $resolution = 'applied';
            } elseif ($targetLevel === $currentLevel) {
                $resolution = 'already_active';
            } else {
                $resolution = 'higher_plan_active';
            }

            $lockedTransaction->update([
                'status' => SubscriptionTransaction::STATUS_PAID,
                'paid_at' => $lockedTransaction->paid_at ?? now(),
                'metadata' => array_filter([
                    ...($lockedTransaction->metadata ?? []),
                    'payment_status' => $session['attributes']['payment_status'] ?? null,
                    'session_status' => $session['attributes']['status'] ?? null,
                    'plan_change_result' => $resolution,
                ], fn ($value) => $value !== null),
            ]);
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

    private function serializeSubscriptionTransactionSummary(SubscriptionTransaction $transaction): array
    {
        $metadata = $transaction->metadata ?? [];

        return [
            'id' => $transaction->id,
            'referenceNumber' => $transaction->reference_number,
            'fromPlan' => $transaction->from_plan,
            'fromPlanLabel' => $this->formatPlanName($transaction->from_plan),
            'toPlan' => $transaction->to_plan,
            'toPlanLabel' => $this->formatPlanName($transaction->to_plan),
            'amount' => (float) $transaction->amount,
            'currency' => $transaction->currency,
            'status' => $transaction->status,
            'checkoutUrl' => $metadata['checkout_url'] ?? null,
            'paymentStatus' => $metadata['payment_status'] ?? null,
            'sessionStatus' => $metadata['session_status'] ?? null,
            'result' => $metadata['plan_change_result'] ?? null,
            'error' => $metadata['error'] ?? null,
            'createdAt' => $transaction->created_at?->toIso8601String(),
            'paidAt' => $transaction->paid_at?->toIso8601String(),
            'cancelledAt' => $transaction->cancelled_at?->toIso8601String(),
            'updatedAt' => $transaction->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Keep legacy subscription columns populated when they still exist locally.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function buildSubscriptionTransactionPayload(\App\Models\User $user, string $fromPlan, string $toPlan, float $amount, array $overrides = []): array
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
