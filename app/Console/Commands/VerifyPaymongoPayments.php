<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\SubscriptionTransaction;
use App\Services\OrderPaymentReconciliationService;
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
    public function handle(
        PayMongoService $payMongoService,
        SubscriptionService $subscriptionService,
        OrderPaymentReconciliationService $reconciliationService
    ) {
        $this->info('Starting PayMongo verification...');

        // 1. Verify Orders
        Order::where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->where('created_at', '>=', now()->subHours(24))
            ->chunkById(25, function ($orders) use ($reconciliationService) {
                foreach ($orders as $order) {
                    try {
                        if ($reconciliationService->reconcileOrder($order, force: true)) {
                            $fresh = $order->fresh();
                            $isCancelled = in_array($fresh->status, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED], true)
                                || strcasecmp((string) $fresh->status, Order::STATUS_CANCELLED) === 0;

                            if ($isCancelled) {
                                $this->warn("Cancelled Order #{$fresh->order_number} confirmed as paid. Flagged for admin/artisan reconciliation.");
                            } else {
                                $this->info("Order #{$fresh->order_number} marked as paid.");
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
