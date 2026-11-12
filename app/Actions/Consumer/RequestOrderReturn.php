<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\PlatformPolicy;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Mail\ReturnRequested;
use App\Services\PolicyService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class RequestOrderReturn
{
    /**
     * Request return/refund for an order
     *
     * @param string $id
     * @param string $returnReason
     * @param string|null $proofPath
     * @param User $buyer
     * @param array<int, UploadedFile|string> $proofPhotos
     * @param array<string, mixed> $criteriaInput
     * @param Request|null $request
     * @return void
     */
    public function execute(
        string $id,
        string $returnReason,
        ?string $proofPath,
        User $buyer,
        array $proofPhotos = [],
        array $criteriaInput = [],
        ?Request $request = null
    ): void {
        $policyService = app(PolicyService::class);
        $photosForEvaluation = !empty($proofPhotos)
            ? array_values($proofPhotos)
            : ($proofPath ? [$proofPath] : []);

        // 1. Pre-flight validation & policy criteria evaluation before external S3 upload
        $precheckOrder = Order::where('id', $id)
            ->where('user_id', $buyer->id)
            ->firstOrFail();

        $policyService->evaluateReturnCriteria(
            $precheckOrder,
            $criteriaInput,
            $photosForEvaluation,
            false
        );

        // 2. Store newly uploaded proof files outside DB::transaction() / lockForUpdate()
        $storedPaths = [];
        $uploadedPathsToCleanup = [];
        try {
            foreach ($photosForEvaluation as $item) {
                if ($item instanceof UploadedFile) {
                    $path = $item->store('returns', 'public');
                    $storedPaths[] = $path;
                    $uploadedPathsToCleanup[] = $path;
                } elseif (is_string($item) && $item !== '') {
                    $storedPaths[] = $item;
                }
            }
        } catch (\Throwable $uploadError) {
            foreach ($uploadedPathsToCleanup as $uploadedPath) {
                rescue(fn () => Storage::disk('public')->delete($uploadedPath), report: false);
            }
            throw $uploadError;
        }

        $primaryProofPath = $storedPaths[0] ?? $proofPath;

        // 3. Atomic DB update inside transaction
        try {
            [$order, $evaluation, $photoAngles] = DB::transaction(function () use (
                $id,
                $returnReason,
                $primaryProofPath,
                $storedPaths,
                $buyer,
                $criteriaInput,
                $policyService
            ) {
                $order = Order::lockForUpdate()->where('id', $id)
                    ->where('user_id', $buyer->id)
                    ->firstOrFail();

                $evaluation = $policyService->evaluateReturnCriteria(
                    $order,
                    $criteriaInput,
                    $storedPaths,
                    false
                );

                $photoAngles = $evaluation['photo_angles'] ?? [];
                foreach ($storedPaths as $index => $path) {
                    if (isset($photoAngles[$index])) {
                        $photoAngles[$index]['path'] = $path;
                    }
                }

                $updateData = [
                    'status' => 'Refund/Return',
                    'return_reason' => $returnReason,
                ];

                if ($primaryProofPath) {
                    $updateData['return_proof_image'] = $primaryProofPath;
                }

                $order->update($updateData);
                $order->refresh();

                $this->recordOrderAuditEvent(
                    $order,
                    $buyer,
                    eventType: 'return_requested',
                    severity: 'warning',
                    title: 'Buyer Requested Return',
                    summary: "{$order->order_number} was moved to return review.",
                    status: 'refund_return',
                    details: [
                        'before' => [
                            'status' => 'Completed',
                        ],
                        'after' => [
                            'status' => $order->status,
                            'return_reason' => $order->return_reason,
                        ],
                        'lines' => array_values(array_filter([
                            $order->return_reason ? "Reason: {$order->return_reason}" : null,
                            $primaryProofPath ? 'Buyer submitted return proof image.' : null,
                        ])),
                    ],
                );

                return [$order, $evaluation, $photoAngles];
            });
        } catch (\Throwable $dbError) {
            foreach ($uploadedPathsToCleanup as $uploadedPath) {
                rescue(fn () => Storage::disk('public')->delete($uploadedPath), report: false);
            }
            throw $dbError;
        }

        // 4. Record policy consent & dispatch notifications strictly after transaction commit
        $policyService->recordUserConsent(
            $buyer,
            PlatformPolicy::TYPE_RETURN_REFUND,
            'return_request',
            $request,
            $order->id,
            [
                'damage_reason_code' => $evaluation['damage_reason_code'] ?? null,
                'damage_reason_label' => $evaluation['damage_reason_label'] ?? null,
                'criteria_checklist' => $evaluation['criteria_checklist'] ?? [],
                'photo_angles' => $photoAngles,
                'has_explicit_consent' => $evaluation['has_explicit_consent'] ?? false,
            ],
            $evaluation['policy'] ?? null
        );

        $order->load('items');
        $seller = User::withTrashed()->find($order->artisan_id);
        if ($seller && $seller->email) {
            $this->sendMailSilently(
                $seller->email,
                new ReturnRequested($order),
                'return_requested',
                ['order_id' => $order->id, 'order_number' => $order->order_number]
            );
        }
    }

    private function recordOrderAuditEvent(
        Order $order,
        ?User $actor,
        string $eventType,
        string $severity,
        string $title,
        string $summary,
        string $status,
        array $details = [],
    ): void {
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $actor?->id,
            'actor_type' => SellerActivityLog::resolveActorType($actor, 'system'),
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => $eventType,
            'severity' => $severity,
            'status' => $status,
            'title' => $title,
            'summary' => $summary,
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
            'details' => $details,
            'target_url' => route('orders.index', ['highlight_order' => $order->order_number]),
            'target_label' => 'Open Orders',
        ]);
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
