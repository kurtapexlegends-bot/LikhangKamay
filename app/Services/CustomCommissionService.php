<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\MessageSent;
use App\Models\CustomCommission;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CustomCommissionService
{
    protected PayMongoService $payMongoService;

    public function __construct(PayMongoService $payMongoService)
    {
        $this->payMongoService = $payMongoService;
    }

    /**
     * Create a new custom commission and dispatch milestone card into chat.
     */
    public function createCommission(User $artisan, array $data): CustomCommission
    {
        $total = round((float) $data['total_amount'], 2);
        $type = (string) $data['deposit_type'];
        $val = (float) $data['deposit_value'];

        if ($type === 'percentage') {
            $depositPercentage = round($val, 2);
            $depositAmount = round($total * ($depositPercentage / 100), 2);
            $balanceAmount = round($total - $depositAmount, 2);
        } else {
            $depositAmount = round($val, 2);
            $depositPercentage = round(($depositAmount / $total) * 100, 2);
            $balanceAmount = round($total - $depositAmount, 2);
        }

        return DB::transaction(function () use ($artisan, $data, $total, $depositAmount, $balanceAmount, $depositPercentage) {
            $commission = CustomCommission::create([
                'artisan_id' => $artisan->id,
                'buyer_id' => (int) $data['receiver_id'],
                'commission_number' => CustomCommission::generateCommissionNumber(),
                'title' => trim((string) $data['title']),
                'description' => !empty($data['description']) ? trim((string) $data['description']) : null,
                'total_amount' => $total,
                'deposit_amount' => $depositAmount,
                'balance_amount' => $balanceAmount,
                'deposit_percentage' => $depositPercentage,
                'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
            ]);

            $messageText = "Custom Commission Request: {$commission->title} (Total: ₱" . number_format($total, 2) . ", Deposit: ₱" . number_format($depositAmount, 2) . ")";

            $message = Message::create([
                'sender_id' => $artisan->id,
                'receiver_id' => (int) $data['receiver_id'],
                'commission_id' => $commission->id,
                'message' => $messageText,
                'attachment_path' => $commission->commission_number,
                'attachment_type' => 'commission_milestone',
                'is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(false),
            ]);

            try {
                broadcast(new MessageSent($message->load('commission')))->toOthers();
            } catch (\Throwable $e) {
                Log::info('Commission creation broadcast silent fallback: ' . $e->getMessage());
            }

            return $commission;
        });
    }

    /**
     * Create PayMongo checkout session for initial downpayment (Phase 1).
     *
     * @return array{checkout_url: string, session_id: string}
     */
    public function createPayMongoDepositSession(CustomCommission $commission, User $buyer, string $returnUrl): array
    {
        $amountCents = (int) round(((float) $commission->deposit_amount) * 100);

        $payload = [
            'payment_method_types' => ['gcash', 'paymaya', 'card'],
            'line_items' => [
                [
                    'name' => "Deposit: {$commission->title} ({$commission->commission_number})",
                    'amount' => $amountCents,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'description' => "Initial {$commission->deposit_percentage}% downpayment for bespoke commission.",
                ],
            ],
            'description' => "Initial Downpayment for Custom Commission {$commission->commission_number}",
            'send_email_receipt' => true,
            'show_description' => true,
            'show_line_items' => true,
            'success_url' => $returnUrl . '&paid_step=deposit&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $returnUrl . '&paid_step=cancelled',
            'metadata' => [
                'commission_id' => (string) $commission->id,
                'commission_number' => $commission->commission_number,
                'type' => 'commission_deposit',
                'buyer_id' => (string) ($buyer?->id ?? $commission->buyer_id),
            ],
        ];

        try {
            $session = $this->payMongoService->createCheckoutSession($payload);
            $sessionId = (string) ($session['id'] ?? '');
            $checkoutUrl = (string) ($session['attributes']['checkout_url'] ?? '');

            $commission->update(['paymongo_deposit_session_id' => $sessionId]);

            return [
                'checkout_url' => $checkoutUrl,
                'session_id' => $sessionId,
            ];
        } catch (\Throwable $e) {
            Log::warning("PayMongo commission deposit session error: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * Create PayMongo checkout session for final balance (Phase 2).
     *
     * @return array{checkout_url: string, session_id: string}
     */
    public function createPayMongoBalanceSession(CustomCommission $commission, User $buyer, string $returnUrl): array
    {
        $amountCents = (int) round(((float) $commission->balance_amount) * 100);

        $payload = [
            'payment_method_types' => ['gcash', 'paymaya', 'card'],
            'line_items' => [
                [
                    'name' => "Final Balance: {$commission->title} ({$commission->commission_number})",
                    'amount' => $amountCents,
                    'currency' => 'PHP',
                    'quantity' => 1,
                    'description' => "Remaining completion balance for bespoke commission.",
                ],
            ],
            'description' => "Final Balance for Custom Commission {$commission->commission_number}",
            'send_email_receipt' => true,
            'show_description' => true,
            'show_line_items' => true,
            'success_url' => $returnUrl . '&paid_step=balance&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $returnUrl . '&paid_step=cancelled',
            'metadata' => [
                'commission_id' => (string) $commission->id,
                'commission_number' => $commission->commission_number,
                'type' => 'commission_balance',
                'buyer_id' => (string) ($buyer?->id ?? $commission->buyer_id),
            ],
        ];

        try {
            $session = $this->payMongoService->createCheckoutSession($payload);
            $sessionId = (string) ($session['id'] ?? '');
            $checkoutUrl = (string) ($session['attributes']['checkout_url'] ?? '');

            $commission->update(['paymongo_balance_session_id' => $sessionId]);

            return [
                'checkout_url' => $checkoutUrl,
                'session_id' => $sessionId,
            ];
        } catch (\Throwable $e) {
            Log::warning("PayMongo commission balance session error: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * Record downpayment (Phase 1) payment and transition commission to In Progress.
     */
    public function recordDepositPaid(CustomCommission $commission, string $paymentMethod = 'Online Payment', ?string $paymentId = null): CustomCommission
    {
        return DB::transaction(function () use ($commission, $paymentMethod, $paymentId) {
            $lockedCommission = CustomCommission::lockForUpdate()->findOrFail($commission->id);
            if (!$lockedCommission->isAwaitingDeposit()) {
                return $lockedCommission;
            }

            $lockedCommission->update([
                'status' => CustomCommission::STATUS_IN_PROGRESS,
                'deposit_payment_method' => $paymentMethod,
                'deposit_payment_id' => $paymentId ?: ('DEP-' . strtoupper(bin2hex(random_bytes(4)))),
                'deposit_paid_at' => now(),
            ]);

            $announcement = Message::create([
                'sender_id' => $lockedCommission->buyer_id,
                'receiver_id' => $lockedCommission->artisan_id,
                'commission_id' => $lockedCommission->id,
                'attachment_path' => $lockedCommission->commission_number,
                'attachment_type' => 'commission_milestone',
                'message' => "Initial deposit of ₱" . number_format((float) $lockedCommission->deposit_amount, 2) . " has been paid. Handcrafting has begun!",
                'is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(false),
            ]);

            try {
                broadcast(new MessageSent($announcement->load('commission')))->toOthers();
            } catch (\Throwable $e) {
                Log::info('Deposit announcement broadcast fallback: ' . $e->getMessage());
            }

            return $lockedCommission->fresh();
        });
    }

    /**
     * Mark custom piece as complete and notify buyer that final balance is due.
     */
    public function markCraftComplete(CustomCommission $commission, User $artisan): CustomCommission
    {
        if ($commission->artisan_id !== $artisan->id) {
            abort(403, 'Unauthorized action.');
        }

        return DB::transaction(function () use ($commission, $artisan) {
            $commission->update([
                'status' => CustomCommission::STATUS_READY_FOR_BALANCE,
            ]);

            $announcement = Message::create([
                'sender_id' => $artisan->id,
                'receiver_id' => $commission->buyer_id,
                'commission_id' => $commission->id,
                'attachment_path' => $commission->commission_number,
                'attachment_type' => 'commission_milestone',
                'message' => "Craft is complete! Remaining balance of ₱" . number_format((float) $commission->balance_amount, 2) . " is now due.",
                'is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(false),
            ]);

            try {
                broadcast(new MessageSent($announcement->load('commission')))->toOthers();
            } catch (\Throwable $e) {
                Log::info('Craft complete broadcast fallback: ' . $e->getMessage());
            }

            return $commission->fresh();
        });
    }

    /**
     * Record final balance (Phase 2) payment, mark Completed, and create Order for fulfillment.
     */
    public function recordBalancePaid(CustomCommission $commission, string $paymentMethod = 'Online Payment', ?string $paymentId = null): CustomCommission
    {
        return DB::transaction(function () use ($commission, $paymentMethod, $paymentId) {
            $lockedCommission = CustomCommission::lockForUpdate()->findOrFail($commission->id);
            if (!$lockedCommission->isReadyForBalance()) {
                return $lockedCommission;
            }

            $buyer = $lockedCommission->buyer;
            $artisan = $lockedCommission->artisan;

            $defaultAddress = $buyer?->getDefaultAddress();
            $shippingAddress = $defaultAddress?->full_address ?: ($buyer?->address ?: 'Studio Pickup / Custom Commission Fulfillment');

            // 1. Create official Order record in system so it can be fulfilled
            $order = Order::create([
                'order_number' => 'ORD-CMS-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3))),
                'user_id' => $lockedCommission->buyer_id,
                'artisan_id' => $lockedCommission->artisan_id,
                'order_type' => Order::TYPE_ONLINE,
                'customer_name' => $buyer?->name ?? 'Commission Customer',
                'shipping_address' => $shippingAddress,
                'shipping_method' => 'Pickup',
                'merchandise_subtotal' => (float) $lockedCommission->total_amount,
                'shipping_fee_amount' => 0.00,
                'convenience_fee_amount' => 0.00,
                'platform_commission_amount' => 0.00,
                'seller_net_amount' => (float) $lockedCommission->total_amount,
                'total_amount' => (float) $lockedCommission->total_amount,
                'vat_type' => $artisan?->is_vat_registered ? 'vat_inclusive' : 'vat_exempt',
                'status' => Order::STATUS_PROCESSING,
                'payment_method' => $paymentMethod,
                'payment_status' => 'paid',
                'payment_id' => $paymentId ?: ('BAL-' . strtoupper(bin2hex(random_bytes(4)))),
                'accepted_at' => now(),
            ]);

            // Add single custom item representation
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => null,
                'product_name' => $lockedCommission->title,
                'variant' => 'Custom Bespoke Commission',
                'price' => (float) $lockedCommission->total_amount,
                'quantity' => 1,
            ]);

            // 2. Update commission
            $lockedCommission->update([
                'order_id' => $order->id,
                'status' => CustomCommission::STATUS_COMPLETED,
                'balance_payment_method' => $paymentMethod,
                'balance_payment_id' => $paymentId ?: ('BAL-' . strtoupper(bin2hex(random_bytes(4)))),
                'balance_paid_at' => now(),
            ]);

            // 3. Post completion announcement into chat
            $announcement = Message::create([
                'sender_id' => $lockedCommission->buyer_id,
                'receiver_id' => $lockedCommission->artisan_id,
                'commission_id' => $lockedCommission->id,
                'attachment_path' => $lockedCommission->commission_number,
                'attachment_type' => 'commission_milestone',
                'message' => "Final balance of ₱" . number_format((float) $lockedCommission->balance_amount, 2) . " paid in full. Order #{$order->order_number} has been generated and is ready for fulfillment!",
                'is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(false),
            ]);

            try {
                broadcast(new MessageSent($announcement->load('commission')))->toOthers();
            } catch (\Throwable $e) {
                Log::info('Balance announcement broadcast fallback: ' . $e->getMessage());
            }

            return $lockedCommission->fresh();
        });
    }

    /**
     * Reconcile payment from return redirect or manual check.
     */
    public function reconcilePaymentSession(CustomCommission $commission, string $step, ?string $sessionId): bool
    {
        if (empty($sessionId)) {
            return false;
        }

        $expectedSessionId = $step === 'deposit'
            ? $commission->paymongo_deposit_session_id
            : $commission->paymongo_balance_session_id;

        if (!empty($expectedSessionId) && $expectedSessionId !== $sessionId) {
            Log::warning("PayMongo commission session mismatch: expected {$expectedSessionId}, got {$sessionId}");
            return false;
        }

        $isTestMode = app()->environment('testing') || (app()->environment('local') && empty(config('services.paymongo.secret_key')));

        if ($isTestMode) {
            if ($step === 'deposit' && $commission->isAwaitingDeposit()) {
                $this->recordDepositPaid($commission, 'GCash (Mock Test)', $sessionId);
                return true;
            } elseif ($step === 'balance' && $commission->isReadyForBalance()) {
                $this->recordBalancePaid($commission, 'GCash (Mock Test)', $sessionId);
                return true;
            }
            return false;
        }

        if (empty($expectedSessionId)) {
            Log::warning("PayMongo commission return without expected session on commission {$commission->id}");
            return false;
        }

        try {
            $session = $this->payMongoService->retrieveCheckoutSession($sessionId);
            $attributes = $session['attributes'] ?? [];

            // Verify metadata to prevent cross-commission replay attacks
            $metaCommissionId = $attributes['metadata']['commission_id'] ?? null;
            $metaType = $attributes['metadata']['type'] ?? null;
            if ($metaCommissionId !== null && ((string) $metaCommissionId !== (string) $commission->id || $metaType !== ('commission_' . $step))) {
                Log::warning("PayMongo commission metadata mismatch for session {$sessionId}");
                return false;
            }

            $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid'
                || ($attributes['status'] ?? 'pending') === 'paid';

            $hasPaidPayment = false;
            $paymentId = null;
            $paymentMethod = $attributes['payment_method_used'] ?? 'PayMongo';

            foreach (($session['included'] ?? []) as $included) {
                if (($included['type'] ?? null) === 'payment' && ($included['attributes']['status'] ?? null) === 'paid') {
                    $hasPaidPayment = true;
                    $paymentId = $included['id'] ?? null;
                    break;
                }
            }

            if ($isPaid || $hasPaidPayment) {
                if ($step === 'deposit' && $commission->isAwaitingDeposit()) {
                    $this->recordDepositPaid($commission, $paymentMethod, $paymentId ?: $sessionId);
                    return true;
                } elseif ($step === 'balance' && $commission->isReadyForBalance()) {
                    $this->recordBalancePaid($commission, $paymentMethod, $paymentId ?: $sessionId);
                    return true;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to reconcile PayMongo commission session {$sessionId}: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * Cancel an unfulfilled or awaiting deposit commission.
     */
    public function cancelCommission(CustomCommission $commission, User $actor, ?string $reason = null): CustomCommission
    {
        if ($commission->artisan_id !== $actor->id && $commission->buyer_id !== $actor->id) {
            abort(403, 'Unauthorized.');
        }

        if (!$commission->isAwaitingDeposit()) {
            abort(422, 'In-progress commissions with paid deposits cannot be cancelled directly.');
        }

        return DB::transaction(function () use ($commission, $actor, $reason) {
            $lockedCommission = CustomCommission::lockForUpdate()->findOrFail($commission->id);
            if (!$lockedCommission->isAwaitingDeposit()) {
                abort(422, 'In-progress commissions with paid deposits cannot be cancelled directly.');
            }

            $lockedCommission->update([
                'status' => CustomCommission::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ]);

            $counterpartId = $lockedCommission->artisan_id === $actor->id ? $lockedCommission->buyer_id : $lockedCommission->artisan_id;

            $cancellationMsg = Message::create([
                'sender_id' => $actor->id,
                'receiver_id' => $counterpartId,
                'commission_id' => $lockedCommission->id,
                'attachment_path' => $lockedCommission->commission_number,
                'attachment_type' => 'commission_milestone',
                'message' => "Commission {$lockedCommission->commission_number} ({$lockedCommission->title}) has been cancelled.",
                'is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(false),
            ]);

            try {
                broadcast(new MessageSent($cancellationMsg->load('commission')))->toOthers();
            } catch (\Throwable $e) {
                Log::info('Cancel broadcast fallback: ' . $e->getMessage());
            }

            return $lockedCommission->fresh();
        });
    }
}
