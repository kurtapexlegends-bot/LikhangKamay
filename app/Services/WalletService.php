<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    public function getOrCreateWallet(User $user): Wallet
    {
        return $user->wallet()->firstOrCreate(
            [],
            [
                'currency' => 'PHP',
                'balance' => 0,
            ],
        );
    }

    public function getPlatformWallet(): ?Wallet
    {
        $platformUser = User::query()
            ->where('role', 'super_admin')
            ->orderBy('id')
            ->first();

        if (!$platformUser) {
            return null;
        }

        return $this->getOrCreateWallet($platformUser);
    }

    /**
     * @param  User|Wallet  $walletOwner
     * @param  array<string, mixed>  $metadata
     */
    public function credit(User|Wallet $walletOwner, float $amount, string $category, ?string $description = null, ?Order $order = null, ?User $counterparty = null, array $metadata = []): WalletTransaction
    {
        return $this->record($walletOwner, 'credit', $amount, $category, $description, $order, $counterparty, $metadata);
    }

    /**
     * @param  User|Wallet  $walletOwner
     * @param  array<string, mixed>  $metadata
     */
    public function debit(User|Wallet $walletOwner, float $amount, string $category, ?string $description = null, ?Order $order = null, ?User $counterparty = null, array $metadata = [], bool $allowOverdraft = false): WalletTransaction
    {
        return $this->record($walletOwner, 'debit', $amount, $category, $description, $order, $counterparty, $metadata, $allowOverdraft);
    }

    /**
     * @param  User|Wallet  $walletOwner
     * @param  array<string, mixed>  $metadata
     */
    private function record(User|Wallet $walletOwner, string $direction, float $amount, string $category, ?string $description = null, ?Order $order = null, ?User $counterparty = null, array $metadata = [], bool $allowOverdraft = false): WalletTransaction
    {
        $normalizedAmount = $this->normalizeAmount($amount);

        if ($normalizedAmount <= 0) {
            throw new RuntimeException('Wallet transaction amount must be greater than zero.');
        }

        return DB::transaction(function () use ($walletOwner, $direction, $normalizedAmount, $category, $description, $order, $counterparty, $metadata, $allowOverdraft) {
            $wallet = $walletOwner instanceof Wallet
                ? Wallet::query()->lockForUpdate()->findOrFail($walletOwner->id)
                : Wallet::query()->lockForUpdate()->findOrFail($this->getOrCreateWallet($walletOwner)->id);

            $currentBalance = $this->normalizeAmount((float) $wallet->balance);
            $nextBalance = $direction === 'credit'
                ? $currentBalance + $normalizedAmount
                : $currentBalance - $normalizedAmount;

            if ($direction === 'debit' && !$allowOverdraft && $nextBalance < 0) {
                throw new RuntimeException('Insufficient wallet balance.');
            }

            $wallet->update([
                'balance' => $nextBalance,
            ]);

            return $wallet->transactions()->create([
                'order_id' => $order?->id,
                'counterparty_user_id' => $counterparty?->id,
                'direction' => $direction,
                'category' => $category,
                'amount' => $normalizedAmount,
                'balance_after' => $nextBalance,
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    public function buildSnapshotForUser(User $user, int $limit = 5): array
    {
        $wallet = $this->getOrCreateWallet($user)->load([
            'transactions' => fn ($query) => $query
                ->with(['order:id,order_number', 'counterparty:id,name'])
                ->latest()
                ->limit($limit),
        ]);

        return $this->mapSnapshot($wallet);
    }

    public function buildPlatformSnapshot(int $limit = 5): ?array
    {
        $wallet = $this->getPlatformWallet();

        if (!$wallet) {
            return null;
        }

        $wallet->load([
            'user:id,name,email',
            'transactions' => fn ($query) => $query
                ->with(['order:id,order_number', 'counterparty:id,name'])
                ->latest()
                ->limit($limit),
        ]);

        return $this->mapSnapshot($wallet, true);
    }

    private function mapSnapshot(Wallet $wallet, bool $includeOwner = false): array
    {
        return [
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
            'owner_name' => $includeOwner ? $wallet->user?->name : null,
            'recent_transactions' => $wallet->transactions
                ->map(function (WalletTransaction $transaction) {
                    return [
                        'id' => $transaction->id,
                        'direction' => $transaction->direction,
                        'category' => $transaction->category,
                        'amount' => (float) $transaction->amount,
                        'balance_after' => (float) $transaction->balance_after,
                        'description' => $transaction->description,
                        'created_at' => $transaction->created_at->format('M d, Y h:i A'),
                        'order_number' => $transaction->order?->order_number,
                        'counterparty_name' => $transaction->counterparty?->name,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function normalizeAmount(float $amount): float
    {
        return round($amount, 2);
    }
}
