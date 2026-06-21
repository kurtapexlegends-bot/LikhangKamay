<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\User;
use App\Mail\OrderDelivered;
use App\Services\OrderFinanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class ReceiveOrder
{
    private $orderFinanceService;

    public function __construct(OrderFinanceService $orderFinanceService)
    {
        $this->orderFinanceService = $orderFinanceService;
    }

    /**
     * Confirm buyer order receipt
     *
     * @param string $id Order ID (database id)
     * @param User $buyer
     * @return string Success message
     */
    public function execute(string $id, User $buyer): string
    {
        $successMessage = '';

        DB::transaction(function () use ($id, $buyer, &$successMessage) {
            $order = Order::lockForUpdate()->where('id', $id)
                ->where('user_id', $buyer->id)
                ->firstOrFail();

            if ($order->status !== 'Delivered') {
                throw new \RuntimeException('You can confirm receipt only after the order is marked as delivered.');
            }

            if ($order->payment_method !== 'COD' && $order->payment_status !== 'paid') {
                throw new \RuntimeException('Cannot confirm receipt until payment is completed.');
            }

            $updateData = [
                'status' => 'Completed',
                'received_at' => now(),
                'warranty_expires_at' => now()->addDay()
            ];

            if ($order->replacement_started_at !== null && $order->replacement_resolved_at === null) {
                $updateData['replacement_resolved_at'] = now();
            }

            if ($order->payment_method === 'COD') {
                $updateData['payment_status'] = 'paid';
            }

            $order->update($updateData);
            $order->refresh();
            $this->orderFinanceService->settleCompletedOrder($order);

            $order->load('items');
            if ($buyer->email) {
                $this->sendMailSilently(
                    $buyer->email,
                    new OrderDelivered($order),
                    'order_delivered',
                    ['order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }

            $successMessage = $order->replacement_started_at !== null && $order->replacement_resolved_at !== null
                ? 'Replacement received and order marked as completed.'
                : 'Order marked as received! You have 1 day to request a return if needed.';
        });

        return $successMessage;
    }

    private function sendMailSilently(string $recipient, \Illuminate\Mail\Mailable $mailable, string $context, array $extraContext = []): void
    {
        try {
            $mailer = Mail::to($recipient);
            if (app()->environment('production') && config('queue.default') !== 'sync') {
                $mailer->queue($mailable);
            } else {
                $mailer->send($mailable);
            }
        } catch (\Throwable $exception) {
            report($exception);
            Log::error('Transactional mail send failed.', [
                'context' => $context,
                'recipient' => $recipient,
                'message' => $exception->getMessage(),
                ...$extraContext,
            ]);
        }
    }
}
