<?php

namespace App\Actions\Disputes;

use App\Models\Order;
use App\Models\Dispute;
use App\Models\PlatformPolicy;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\RefundRequestNotification;
use App\Mail\ReturnRequested;
use App\Services\PolicyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BuyerInitiateDispute
{
    /**
     * Execute buyer dispute initiation.
     *
     * @param string $orderId
     * @param string $reason
     * @param array $proofPhotos
     * @param int $buyerId
     * @param array<string, mixed> $criteriaInput
     * @param bool $requireStructuredFields
     * @param Request|null $request
     * @return void
     * @throws \Exception
     */
    public function execute(
        string $orderId,
        string $reason,
        array $proofPhotos,
        int $buyerId,
        array $criteriaInput = [],
        bool $requireStructuredFields = false,
        ?Request $request = null
    ): void {
        $policyService = app(PolicyService::class);

        // 1. Pre-flight validation & criteria evaluation before executing external S3 uploads
        $precheckOrder = Order::where('id', $orderId)
            ->where('user_id', $buyerId)
            ->firstOrFail();

        if ($precheckOrder->status !== 'Completed') {
            throw new \Exception('This order is not completed.');
        }

        if (Dispute::where('order_id', $precheckOrder->id)->exists()) {
            throw new \Exception('A dispute has already been filed for this order.');
        }

        $policyService->evaluateReturnCriteria(
            $precheckOrder,
            $criteriaInput,
            $proofPhotos,
            $requireStructuredFields
        );

        // 2. Upload proof photos outside DB::transaction() and row locks
        $storedPaths = [];
        try {
            foreach (array_values($proofPhotos) as $file) {
                $path = $file->store('disputes', 'public');
                if (!is_string($path) || $path === '') {
                    throw new \RuntimeException('Failed to upload dispute proof photo. Please try again.');
                }
                $storedPaths[] = $path;
            }
        } catch (\Throwable $uploadError) {
            foreach ($storedPaths as $uploadedPath) {
                rescue(fn () => Storage::disk('public')->delete($uploadedPath), report: false);
            }
            throw $uploadError;
        }

        // 3. Atomic DB lock + dispute creation
        try {
            [$order, $dispute, $evaluation, $photoAngles] = DB::transaction(function () use (
                $orderId,
                $reason,
                $storedPaths,
                $buyerId,
                $criteriaInput,
                $requireStructuredFields,
                $policyService
            ) {
                $order = Order::lockForUpdate()->where('id', $orderId)
                    ->where('user_id', $buyerId)
                    ->firstOrFail();

                if ($order->status !== 'Completed') {
                    throw new \Exception('This order is not completed.');
                }

                if (Dispute::where('order_id', $order->id)->exists()) {
                    throw new \Exception('A dispute has already been filed for this order.');
                }

                $evaluation = $policyService->evaluateReturnCriteria(
                    $order,
                    $criteriaInput,
                    $storedPaths,
                    $requireStructuredFields
                );

                $photoAngles = $evaluation['photo_angles'] ?? [];
                foreach ($storedPaths as $index => $storedPath) {
                    if (isset($photoAngles[$index])) {
                        $photoAngles[$index]['path'] = $storedPath;
                    }
                }

                $dispute = Dispute::create([
                    'order_id' => $order->id,
                    'status' => 'pending',
                    'reason' => $reason,
                    'proof_photos' => $storedPaths,
                    'platform_policy_id' => $evaluation['policy_id'] ?? null,
                    'policy_version' => $evaluation['policy_version'] ?? null,
                    'damage_reason_code' => $evaluation['damage_reason_code'] ?? null,
                    'criteria_checklist' => $evaluation['criteria_checklist'] ?? null,
                    'photo_angles' => !empty($photoAngles) ? $photoAngles : null,
                ]);

                $order->update([
                    'status' => 'Refund/Return',
                ]);

                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $buyerId,
                    'actor_type' => 'buyer',
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_initiated',
                    'severity' => 'warning',
                    'status' => 'refund_return',
                    'title' => 'Dispute Initiated',
                    'summary' => "Buyer filed dispute for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);

                return [$order, $dispute, $evaluation, $photoAngles];
            });
        } catch (\Throwable $dbError) {
            foreach ($storedPaths as $uploadedPath) {
                rescue(fn () => Storage::disk('public')->delete($uploadedPath), report: false);
            }
            throw $dbError;
        }

        // 4. Record policy consent & dispatch notifications strictly after transaction commit
        $buyer = User::find($buyerId);
        if ($buyer) {
            $policyService->recordUserConsent(
                $buyer,
                PlatformPolicy::TYPE_RETURN_REFUND,
                'dispute_initiation',
                $request,
                $order->id,
                [
                    'damage_reason_code' => $evaluation['damage_reason_code'] ?? null,
                    'damage_reason_label' => $evaluation['damage_reason_label'] ?? null,
                    'criteria_checklist' => $evaluation['criteria_checklist'] ?? [],
                    'photo_angles' => $photoAngles,
                    'dispute_id' => $dispute->id,
                ],
                $evaluation['policy'] ?? null
            );
        }

        $seller = User::withTrashed()->find($order->artisan_id);
        if ($seller) {
            rescue(fn () => $seller->notifySellerWorkspace(new RefundRequestNotification($order), 'orders'), report: false);
            $this->sendMailSilently($seller->email, new ReturnRequested($order));
        }
    }

    /**
     * Send email silently.
     */
    private function sendMailSilently(string $recipient, \Illuminate\Mail\Mailable $mailable): void
    {
        try {
            $mailer = Mail::to($recipient);
            if (app()->environment('production') && config('queue.default') !== 'sync') {
                $mailer->queue($mailable);
            } else {
                $mailer->send($mailable);
            }
        } catch (\Throwable $e) {
            report($e);
            Log::warning("Failed to send mail to {$recipient}: " . $e->getMessage());
        }
    }
}
