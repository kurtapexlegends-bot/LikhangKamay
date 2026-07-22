<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionTransaction;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use App\Actions\Seller\Subscription\InitiateSubscriptionUpgrade;
use App\Actions\Seller\Subscription\DowngradeSubscription;
use App\Actions\Seller\Subscription\VerifySubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly PayMongoService $payMongoService,
        private readonly SubscriptionService $subscriptionService,
        private readonly VerifySubscriptionPayment $verifyPaymentAction
    ) {
    }

    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $this->verifyPaymentAction->reconcilePendingUpgradesForUser($user, $this->payMongoService, $this->subscriptionService);

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

        return Inertia::render('Seller/Settings/Subscription', [
            'currentPlan' => $user->premium_tier,
            'activeProductsCount' => $activeProductsCount,
            'limit' => $limit,
            'linkedStaffCount' => $linkedStaffCount,
            'recentTransactions' => $recentTransactions,
            'planSettings' => [
                'free_limit' => (int) \App\Facades\Settings::get('tier_free_limit', 3),
                'premium_price' => (float) \App\Facades\Settings::get('tier_premium_price', 199),
                'premium_limit' => (int) \App\Facades\Settings::get('tier_premium_limit', 10),
                'super_premium_price' => (float) \App\Facades\Settings::get('tier_super_premium_price', 399),
                'super_premium_limit' => (int) \App\Facades\Settings::get('tier_super_premium_limit', 50),
            ],
            'pendingUpgrade' => $pendingUpgrade ? [
                'plan' => $pendingUpgrade->to_plan,
                'planLabel' => $this->formatPlanName($pendingUpgrade->to_plan),
                'amount' => (float) $pendingUpgrade->amount,
                'currency' => $pendingUpgrade->currency,
                'checkoutUrl' => $pendingUpgrade->metadata['checkout_url'] ?? null,
                'referenceNumber' => $pendingUpgrade->reference_number,
                'createdAt' => $pendingUpgrade->created_at?->toIso8601String(),
            ] : null,
            'activeProducts' => $user->products()->where('status', 'Active')->select('id', 'name', 'sku', 'cover_photo_path', 'price')->get(),
        ]);
    }

    public function upgrade(Request $request, InitiateSubscriptionUpgrade $action)
    {
        $validated = $request->validate([
            'plan' => 'required|in:premium,super_premium'
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        try {
            $checkoutUrl = $action->execute($user, $validated['plan'], $this->payMongoService);
            return Inertia::location($checkoutUrl);
        } catch (\Throwable $e) {
            if ($e->getMessage() === 'downgrade_flow') {
                return redirect()->route('seller.subscription')->with('warning', 'Please use the downgrade flow to switch to a lower plan.');
            }
            if ($e->getMessage() === 'already_on_plan') {
                return back()->with('error', 'You are already on this plan.');
            }
            return back()->with('error', 'Subscription checkout could not be started right now. Please try again.');
        }
    }

    public function downgrade(Request $request, DowngradeSubscription $action)
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
        $previousUrl = url()->previous();

        try {
            $result = $action->execute($user, $validated['plan'], $validated['keep_active_ids'] ?? null, $previousUrl);
            return redirect()
                ->to($result['redirectTo'])
                ->with('success', $result['successMessage']);
        } catch (\Throwable $e) {
            if (str_starts_with($e->getMessage(), 'limit_exceeded:')) {
                $limit = substr($e->getMessage(), 15);
                return back()->withErrors(['limit' => 'You selected too many products to keep active. The limit for this tier is ' . $limit]);
            }
            return back()->with('error', 'Downgrade failed. Please try again.');
        }
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

        try {
            $resolution = $this->verifyPaymentAction->verifySuccess($transaction, $this->payMongoService, $this->subscriptionService);

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
            if ($e->getMessage() === 'missing_session_id') {
                return $this->redirectAfterPaymentResolution(
                    $transaction,
                    'error',
                    'Subscription verification could not be completed.',
                    'Subscription verification could not be completed. Sign in and try again.'
                );
            }
            if ($e->getMessage() === 'not_paid') {
                return $this->redirectAfterPaymentResolution(
                    $transaction,
                    'error',
                    'Subscription payment is not yet confirmed.',
                    'Subscription payment is not yet confirmed. Sign in later to check your plan.'
                );
            }

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

        $this->verifyPaymentAction->verifyCancel($transaction);

        return $this->redirectAfterPaymentResolution(
            $transaction,
            'error',
            'Subscription payment was cancelled.',
            'Subscription payment was cancelled. Sign in to continue.'
        );
    }

    private function formatPlanName(?string $plan): string
    {
        return match ($plan) {
            'premium' => 'Premium',
            'super_premium' => 'Elite',
            default => 'Standard',
        };
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
}
