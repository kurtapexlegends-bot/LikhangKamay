<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\SubscriptionTransaction;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use Illuminate\Support\Facades\Log;

class VerifyPaymongoPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'paymongo:verify';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify pending PayMongo payments to safely mark them as paid.';

    /**
     * Execute the console command.
     */
    public function handle(PayMongoService $payMongoService, SubscriptionService $subscriptionService)
    {
        $this->info('Starting PayMongo verification...');

        // 1. Verify Orders
        Order::where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->where('created_at', '>=', now()->subHours(24))
            ->chunkById(25, function ($orders) use ($payMongoService) {
                foreach ($orders as $order) {
                    try {
                        $session = $payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
                        $attributes = $session['attributes'] ?? [];

                        $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
                        $paymentId = null;
                        $hasPaidPayment = false;

                        foreach (($session['included'] ?? []) as $included) {
                            if (($included['type'] ?? null) === 'payment' && (($included['attributes']['status'] ?? null) === 'paid')) {
                                $hasPaidPayment = true;
                                $paymentId = $included['id'] ?? null;
                                break;
                            }
                        }

                        if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
                            foreach ($attributes['payments'] as $payment) {
                                if (($payment['status'] ?? ($payment['attributes']['status'] ?? null)) === 'paid') {
                                    $hasPaidPayment = true;
                                    $paymentId = $payment['id'] ?? ($payment['attributes']['id'] ?? null);
                                    break;
                                }
                            }
                        }

                        if ($isPaid || $hasPaidPayment) {
                            $updateData = ['payment_status' => 'paid'];
                            if ($paymentId && empty($order->payment_id)) {
                                $updateData['payment_id'] = $paymentId;
                            }

                            $isCancelled = in_array($order->status, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED], true)
                                || strcasecmp((string) $order->status, Order::STATUS_CANCELLED) === 0;

                            if ($isCancelled) {
                                $reconciliationNote = '[PAID_AFTER_CANCELLATION] Payment confirmed post-cancellation. Flagged for admin/artisan review & customer refund.';
                                $updateData['cancellation_reason'] = $order->cancellation_reason
                                    ? ($order->cancellation_reason . ' | ' . $reconciliationNote)
                                    : $reconciliationNote;

                                $order->update($updateData);

                                $this->warn("Cancelled Order #{$order->order_number} confirmed as paid. Flagged for admin/artisan reconciliation.");
                                Log::warning('PayMongo payment confirmed for cancelled order; flagged for admin/artisan reconciliation', [
                                    'order_id' => $order->id,
                                    'order_number' => $order->order_number,
                                    'payment_id' => $paymentId,
                                    'artisan_id' => $order->artisan_id,
                                    'user_id' => $order->user_id,
                                ]);
                            } else {
                                $order->update($updateData);
                                $this->info("Order #{$order->order_number} marked as paid.");
                                Log::info('Order marked as paid via verified command', ['order_id' => $order->id, 'payment_id' => $paymentId]);
                            }
                        }
                    } catch (\Throwable $e) {
                        Log::error("Failed to verify PayMongo session for Order {$order->id}: " . $e->getMessage());
                    }
                }
            });

        // 2. Verify Subscriptions
        SubscriptionTransaction::where('status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->where('created_at', '>=', now()->subHours(24))
            ->chunkById(25, function ($transactions) use ($payMongoService, $subscriptionService) {
                foreach ($transactions as $transaction) {
                    try {
                        $session = $payMongoService->retrieveCheckoutSession($transaction->paymongo_session_id);
                        $attributes = $session['attributes'] ?? [];

                        $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
                        $hasPaidPayment = collect($session['included'] ?? [])
                            ->contains(fn (array $included) => ($included['type'] ?? null) === 'payment'
                                && (($included['attributes']['status'] ?? null) === 'paid'));

                        if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
                            $hasPaidPayment = collect($attributes['payments'])
                                ->contains(fn ($payment) => ($payment['status'] ?? ($payment['attributes']['status'] ?? null)) === 'paid');
                        }

                        if ($isPaid || $hasPaidPayment) {
                            $subscriptionService->activateSubscription($transaction);
                            $this->info("Subscription Transaction #{$transaction->id} marked as paid.");
                            Log::info('Subscription marked as paid via verified command', ['transaction_id' => $transaction->id]);
                        }
                    } catch (\Throwable $e) {
                        Log::error("Failed to verify PayMongo session for Subscription Transaction {$transaction->id}: " . $e->getMessage());
                    }
                }
            });

        $this->info('PayMongo verification complete.');
    }
}
