<?php

namespace App\Http\Controllers;

use App\Models\WalletTopUp;
use App\Services\PayMongoService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WalletTopUpController extends Controller
{
    public function __construct(
        private readonly PayMongoService $payMongoService,
        private readonly WalletService $walletService,
    ) {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:100|max:50000',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $wallet = $this->walletService->getOrCreateWallet($user);
        $amount = round((float) $validated['amount'], 2);

        $topUp = WalletTopUp::create([
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'amount' => $amount,
            'currency' => $wallet->currency ?: 'PHP',
            'status' => WalletTopUp::STATUS_PENDING,
            'reference_number' => 'WTU-' . strtoupper(Str::random(10)),
        ]);

        $checkoutData = [
            'line_items' => [[
                'currency' => 'PHP',
                'amount' => (int) round($amount * 100),
                'description' => 'Buyer wallet balance top up',
                'name' => 'Wallet Top Up',
                'quantity' => 1,
            ]],
            'payment_method_types' => ['gcash', 'grab_pay', 'paymaya', 'card'],
            'success_url' => URL::signedRoute('wallet.topups.success', ['top_up' => $topUp->reference_number]),
            'cancel_url' => URL::signedRoute('wallet.topups.cancel', ['top_up' => $topUp->reference_number]),
            'description' => 'Wallet top up for ' . $user->name,
            'reference_number' => $topUp->reference_number,
            'send_email_receipt' => true,
        ];

        try {
            $session = $this->payMongoService->createCheckoutSession($checkoutData);

            $topUp->update([
                'paymongo_session_id' => $session['id'],
                'metadata' => [
                    'checkout_url' => $session['attributes']['checkout_url'] ?? null,
                ],
            ]);

            return Inertia::location($session['attributes']['checkout_url']);
        } catch (\Throwable $e) {
            Log::error('PayMongo Wallet Top-Up Error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'top_up_id' => $topUp->id,
            ]);

            $topUp->update([
                'status' => WalletTopUp::STATUS_FAILED,
                'metadata' => [
                    ...($topUp->metadata ?? []),
                    'error' => $e->getMessage(),
                ],
            ]);

            return back()->with('error', 'Top up could not be started right now. Please try again.');
        }
    }

    public function success(Request $request)
    {
        $topUp = WalletTopUp::where('reference_number', $request->query('top_up'))->firstOrFail();

        if ($topUp->status === WalletTopUp::STATUS_PAID) {
            return $this->redirectAfterResolution(
                $topUp,
                'success',
                'Wallet top up successful.',
                'Wallet top up was already verified. Sign in to view your updated balance.'
            );
        }

        if (!$topUp->paymongo_session_id) {
            return $this->redirectAfterResolution(
                $topUp,
                'error',
                'Top up verification could not be completed.',
                'Top up verification could not be completed. Sign in and try again.'
            );
        }

        try {
            $session = $this->payMongoService->retrieveCheckoutSession($topUp->paymongo_session_id);
            $attributes = $session['attributes'] ?? [];
            $referenceNumber = $attributes['reference_number'] ?? null;

            if ($referenceNumber && $referenceNumber !== $topUp->reference_number) {
                Log::warning('Wallet top-up PayMongo reference mismatch', [
                    'top_up_id' => $topUp->id,
                    'expected_reference' => $topUp->reference_number,
                    'actual_reference' => $referenceNumber,
                ]);

                return $this->redirectAfterResolution(
                    $topUp,
                    'error',
                    'Top up verification failed. Please contact support.',
                    'Top up verification failed. Sign in and contact support if you were charged.'
                );
            }

            if (!$this->sessionHasSuccessfulPayment($session)) {
                return $this->redirectAfterResolution(
                    $topUp,
                    'error',
                    'Top up is not yet confirmed.',
                    'Top up is not yet confirmed. Sign in later to check your balance.'
                );
            }

            DB::transaction(function () use ($topUp, $session) {
                $lockedTopUp = WalletTopUp::query()->lockForUpdate()->findOrFail($topUp->id);

                if ($lockedTopUp->status === WalletTopUp::STATUS_PAID) {
                    return;
                }

                $user = $lockedTopUp->user()->firstOrFail();

                $this->walletService->credit(
                    $user,
                    (float) $lockedTopUp->amount,
                    'wallet_top_up',
                    'Wallet top up via online payment',
                    null,
                    null,
                    [
                        'wallet_top_up_id' => $lockedTopUp->id,
                        'reference_number' => $lockedTopUp->reference_number,
                        'paymongo_session_id' => $lockedTopUp->paymongo_session_id,
                    ],
                );

                $lockedTopUp->update([
                    'status' => WalletTopUp::STATUS_PAID,
                    'paid_at' => now(),
                    'metadata' => array_filter([
                        ...($lockedTopUp->metadata ?? []),
                        'payment_status' => $session['attributes']['payment_status'] ?? null,
                        'session_status' => $session['attributes']['status'] ?? null,
                    ], fn ($value) => $value !== null),
                ]);
            });

            return $this->redirectAfterResolution(
                $topUp->fresh(),
                'success',
                'Wallet top up successful.',
                'Wallet top up verified successfully. Sign in to view your updated balance.'
            );
        } catch (\Throwable $e) {
            Log::error('Wallet top-up verification error: ' . $e->getMessage(), [
                'top_up_id' => $topUp->id,
            ]);

            return $this->redirectAfterResolution(
                $topUp,
                'error',
                'Top up verification failed. Please contact support.',
                'Top up verification failed. Sign in and contact support if you were charged.'
            );
        }
    }

    public function cancel(Request $request)
    {
        $topUp = WalletTopUp::where('reference_number', $request->query('top_up'))->firstOrFail();

        if ($topUp->status === WalletTopUp::STATUS_PENDING) {
            $topUp->update([
                'status' => WalletTopUp::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);
        }

        return $this->redirectAfterResolution(
            $topUp,
            'error',
            'Top up was cancelled.',
            'Top up was cancelled. Sign in to continue.'
        );
    }

    private function sessionHasSuccessfulPayment(array $session): bool
    {
        $attributes = $session['attributes'] ?? [];
        $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';

        if ($isPaid) {
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

    private function redirectAfterResolution(WalletTopUp $topUp, string $flashKey, string $ownerMessage, string $guestMessage)
    {
        if (Auth::id() === $topUp->user_id) {
            return redirect()->route('my-wallet.index')->with($flashKey, $ownerMessage);
        }

        if (!Auth::check()) {
            return redirect()->route('login')->with('status', $guestMessage);
        }

        return redirect('/')->with($flashKey, $guestMessage);
    }
}
