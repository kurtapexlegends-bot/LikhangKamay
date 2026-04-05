<?php

namespace App\Http\Controllers;

use App\Models\SellerWalletWithdrawalRequest;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use RuntimeException;

class SellerWalletController extends Controller
{
    public function index(Request $request, WalletService $walletService)
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();
        $seller = $actor->getEffectiveSeller();

        abort_unless($seller && $seller->isArtisan(), 403, 'Seller workspace access only.');

        return Inertia::render('Seller/Wallet', [
            'wallet' => $walletService->buildSellerSnapshot($seller, 12),
            'walletOwner' => [
                'id' => $seller->id,
                'name' => $seller->name,
                'shop_name' => $seller->shop_name,
                'avatar' => $seller->avatar,
            ],
            'canRequestWithdrawal' => $actor->isSellerOwner(),
        ]);
    }

    public function storeWithdrawalRequest(Request $request, WalletService $walletService)
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();
        $seller = $actor->getEffectiveSeller();

        abort_unless($seller && $seller->isArtisan(), 403, 'Seller workspace access only.');
        abort_unless($actor->isSellerOwner(), 403, 'Only the seller owner can request wallet withdrawals.');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $wallet = $walletService->getOrCreateWallet($seller);
        $amount = round((float) $validated['amount'], 2);
        $note = trim((string) ($validated['note'] ?? ''));

        try {
            DB::transaction(function () use ($walletService, $wallet, $seller, $actor, $amount, $note) {
                $holdTransaction = $walletService->debit(
                    $wallet,
                    $amount,
                    'seller_wallet_withdrawal_hold',
                    $note !== ''
                        ? 'Seller withdrawal request hold: ' . $note
                        : 'Seller withdrawal request hold',
                    metadata: [
                        'seller_id' => $seller->id,
                        'requested_by_user_id' => $actor->id,
                        'requested_by_name' => $actor->name,
                        'note' => $note !== '' ? $note : null,
                    ],
                );

                SellerWalletWithdrawalRequest::create([
                    'user_id' => $seller->id,
                    'wallet_id' => $wallet->id,
                    'hold_transaction_id' => $holdTransaction->id,
                    'amount' => $amount,
                    'currency' => $wallet->currency ?: 'PHP',
                    'status' => SellerWalletWithdrawalRequest::STATUS_PENDING,
                    'note' => $note !== '' ? $note : null,
                ]);
            });
        } catch (RuntimeException $exception) {
            return redirect()->back()->with('error', $exception->getMessage());
        }

        return redirect()->back()->with('success', 'Withdrawal request submitted successfully.');
    }
}
