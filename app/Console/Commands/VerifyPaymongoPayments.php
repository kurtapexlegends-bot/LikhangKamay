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
        $orders = Order::where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->get();

        foreach ($orders as $order) {
            try {
                $session = $payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
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
                    $order->update([
                        'payment_status' => 'paid',
                        'paymongo_session_id' => null,
                    ]);
                    $this->info("Order #{$order->order_number} marked as paid.");
                    Log::info('Order marked as paid via verified command', ['order_id' => $order->id]);
                }
            } catch (\Exception $e) {
                Log::error("Failed to verify PayMongo session for Order {$order->id}: " . $e->getMessage());
            }
        }

        // 2. Verify Subscriptions
        $transactions = SubscriptionTransaction::where('status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->get();

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
            } catch (\Exception $e) {
                Log::error("Failed to verify PayMongo session for Subscription Transaction {$transaction->id}: " . $e->getMessage());
            }
        }

        $this->info('PayMongo verification complete.');
    }
}
