<?php

namespace App\Services\Logistics;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Services\LalamoveService;
use App\Notifications\OrderDeliveryUpdateNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LalamoveWebhookService
{
    public function __construct(
        private readonly LalamoveService $lalamoveService,
    ) {
    }

    public function handleWebhook(array $payload, string $rawBody = ''): ?OrderDelivery
    {
        $eventKey = $this->resolveEventKey($payload, $rawBody);
        $eventType = $this->resolveEventType($payload);
        $snapshot = $this->normalizeOrderSnapshot($this->extractOrderSnapshot($payload), $eventType);
        $externalOrderId = $snapshot['orderId'] ?? null;

        if (!$externalOrderId) {
            OrderDeliveryEvent::firstOrCreate([
                'event_key' => $eventKey,
            ], [
                'provider' => OrderDelivery::PROVIDER_LALAMOVE,
                'event_type' => $eventType,
                'payload' => $payload,
            ]);

            return null;
        }

        return DB::transaction(function () use ($eventKey, $eventType, $externalOrderId, $payload, $snapshot) {
            $delivery = OrderDelivery::query()
                ->where('external_order_id', (string) $externalOrderId)
                ->lockForUpdate()
                ->first();

            OrderDeliveryEvent::firstOrCreate([
                'event_key' => $eventKey,
            ], [
                'order_delivery_id' => $delivery?->id,
                'provider' => OrderDelivery::PROVIDER_LALAMOVE,
                'event_type' => $eventType,
                'external_order_id' => (string) $externalOrderId,
                'payload' => $payload,
            ]);

            if (!$delivery) {
                return null;
            }

            $this->applyOrderSnapshot($delivery, $snapshot, $eventType);

            return $delivery->fresh('order.user');
        });
    }

    public function syncDelivery(OrderDelivery $delivery): OrderDelivery
    {
        $snapshot = $this->normalizeOrderSnapshot(
            $this->lalamoveService->retrieveOrder((string) $delivery->external_order_id),
            'POLL_SYNC',
        );

        return DB::transaction(function () use ($delivery, $snapshot) {
            /** @var OrderDelivery $lockedDelivery */
            $lockedDelivery = OrderDelivery::query()->with('order.user')->lockForUpdate()->findOrFail($delivery->id);
            $this->applyOrderSnapshot($lockedDelivery, $snapshot, 'POLL_SYNC');

            return $lockedDelivery->fresh('order.user');
        });
    }

    /**
     * @param  iterable<OrderDelivery|null>  $deliveries
     */
    public function syncVisibleDeliveries(iterable $deliveries, int $limit = 5, int $staleAfterSeconds = 15): void
    {
        $synced = 0;

        foreach ($deliveries as $delivery) {
            if (!$delivery instanceof OrderDelivery) {
                continue;
            }

            if (!$this->shouldSyncDeliveryOnRead($delivery, $staleAfterSeconds)) {
                continue;
            }

            try {
                $this->syncDelivery($delivery);
                $synced++;
            } catch (\Throwable $e) {
                report($e);
            }

            if ($synced >= $limit) {
                break;
            }
        }
    }

    private function shouldSyncDeliveryOnRead(OrderDelivery $delivery, int $staleAfterSeconds = 15): bool
    {
        if ($delivery->provider !== OrderDelivery::PROVIDER_LALAMOVE) {
            return false;
        }

        if ($delivery->external_order_id === null || $delivery->auto_cancelled_at !== null) {
            return false;
        }

        if (in_array(strtoupper((string) $delivery->status), [
            OrderDelivery::STATUS_COMPLETED,
            OrderDelivery::STATUS_CANCELED,
            OrderDelivery::STATUS_REJECTED,
            OrderDelivery::STATUS_EXPIRED,
        ], true)) {
            return false;
        }

        if ($delivery->last_webhook_received_at === null) {
            return true;
        }

        $lastTouchedAt = $delivery->last_webhook_received_at ?? $delivery->updated_at;

        return $lastTouchedAt === null || $lastTouchedAt->lte(now()->subSeconds($staleAfterSeconds));
    }

    private function resolveEventKey(array $payload, string $rawBody): string
    {
        $metaRequestId = data_get($payload, 'meta.requestId')
            ?? data_get($payload, 'meta.request_id')
            ?? data_get($payload, 'requestId')
            ?? null;

        if ($metaRequestId) {
            return 'lalamove:' . $metaRequestId;
        }

        return 'lalamove:' . sha1($rawBody !== '' ? $rawBody : json_encode($payload));
    }

    private function resolveEventType(array $payload): ?string
    {
        return data_get($payload, 'eventType')
            ?? data_get($payload, 'type')
            ?? data_get($payload, 'data.eventType')
            ?? data_get($payload, 'data.type');
    }

    private function extractOrderSnapshot(array $payload): array
    {
        if (isset($payload['data']) && is_array($payload['data'])) {
            $data = $payload['data'];
            if (isset($data['orderId']) || isset($data['status']) || isset($data['shareLink'])) {
                return $data;
            }

            if (isset($data['order']) && is_array($data['order'])) {
                return $data['order'];
            }
        }

        if (isset($payload['order']) && is_array($payload['order'])) {
            return $payload['order'];
        }

        return $payload;
    }

    private function normalizeOrderSnapshot(array $snapshot, ?string $eventType = null): array
    {
        $orderId = (string) (
            data_get($snapshot, 'orderId')
            ?? data_get($snapshot, 'data.orderId')
            ?? data_get($snapshot, 'order.orderId')
            ?? ''
        );
        $status = strtoupper((string) (
            data_get($snapshot, 'status')
            ?? data_get($snapshot, 'data.status')
            ?? data_get($snapshot, 'order.status')
            ?? ''
        ));
        $driverId = (string) (
            data_get($snapshot, 'driverId')
            ?? data_get($snapshot, 'data.driverId')
            ?? data_get($snapshot, 'order.driverId')
            ?? ''
        );
        $shareLink = (string) (
            data_get($snapshot, 'shareLink')
            ?? data_get($snapshot, 'data.shareLink')
            ?? data_get($snapshot, 'order.shareLink')
            ?? ''
        );
        $priceBreakdown = data_get($snapshot, 'priceBreakdown')
            ?? data_get($snapshot, 'data.priceBreakdown')
            ?? data_get($snapshot, 'order.priceBreakdown');

        if ($driverId !== '' && ($status === '' || $status === OrderDelivery::STATUS_ASSIGNING_DRIVER || $eventType === 'DRIVER_ASSIGNED')) {
            $status = OrderDelivery::STATUS_ON_GOING;
        }

        $normalized = $snapshot;

        if ($orderId !== '') {
            $normalized['orderId'] = $orderId;
        }

        if ($status !== '') {
            $normalized['status'] = $status;
        }

        if ($driverId !== '') {
            $normalized['driverId'] = $driverId;
        }

        if ($shareLink !== '') {
            $normalized['shareLink'] = $shareLink;
        }

        if (is_array($priceBreakdown)) {
            $normalized['priceBreakdown'] = $priceBreakdown;
        }

        return $normalized;
    }

    private function applyOrderSnapshot(OrderDelivery $delivery, array $snapshot, ?string $eventType = null): void
    {
        $status = strtoupper((string) ($snapshot['status'] ?? $delivery->status ?? ''));
        $priceBreakdown = $snapshot['priceBreakdown'] ?? $delivery->price_breakdown;
        $isReplacementExchange = $this->deliveryFlowType($delivery) === 'replacement_exchange';

        $delivery->fill([
            'status' => $status !== '' ? $status : $delivery->status,
            'share_link' => $snapshot['shareLink'] ?? $delivery->share_link,
            'price_currency' => $priceBreakdown['currency'] ?? $delivery->price_currency,
            'price_total' => isset($priceBreakdown['total']) ? (float) $priceBreakdown['total'] : $delivery->price_total,
            'price_breakdown' => $priceBreakdown,
            'latest_payload' => $snapshot,
            'last_webhook_type' => $eventType,
            'last_webhook_received_at' => now(),
        ]);

        if ($status === OrderDelivery::STATUS_COMPLETED) {
            $delivery->terminal_failed_at = null;
            $delivery->failure_reason = null;
            $delivery->save();

            $order = $delivery->order()->lockForUpdate()->first();
            if ($order && !in_array($order->status, ['Delivered', 'Completed', 'Cancelled', 'Refunded', 'Rejected'], true)) {
                $order->update([
                    'status' => 'Delivered',
                    'delivered_at' => now(),
                    'warranty_expires_at' => now()->addDay(),
                ]);

                $order->user?->notify(new OrderDeliveryUpdateNotification(
                    $order,
                    $isReplacementExchange ? 'Replacement delivered' : 'Order delivered',
                    $isReplacementExchange
                        ? 'Lalamove completed the replacement exchange. Please confirm receipt of the replacement item once it is safely with you.'
                        : 'Lalamove marked your delivery as completed. Please confirm receipt once it arrives to you safely.',
                    route('my-orders.index')
                ));
            }

            return;
        }

        if ($delivery->isTerminalFailure()) {
            $enteredFailureHold = $delivery->terminal_failed_at === null;
            $delivery->terminal_failed_at = $delivery->terminal_failed_at ?: now();
            $delivery->failure_reason = $eventType === 'ORDER_STATUS_CHANGED'
                ? 'Courier reported a terminal delivery failure.'
                : ($delivery->failure_reason ?: 'Courier reported a terminal delivery failure.');
            $delivery->save();

            $order = $delivery->order()->lockForUpdate()->first();
            if ($enteredFailureHold && $order && $order->status !== 'Cancelled') {
                $order->user?->notify(new OrderDeliveryUpdateNotification(
                    $order,
                    'Delivery issue detected',
                    'The courier reported a delivery problem. The system will auto-cancel the order if it does not recover within 24 hours.',
                    route('my-orders.index')
                ));

                $order->artisan?->notify(new OrderDeliveryUpdateNotification(
                    $order,
                    'Delivery entered failure hold',
                    'Lalamove reported a terminal failure. The order will auto-cancel if it stays unresolved for 24 hours.',
                    route('orders.index')
                ));
            }

            return;
        }

        $delivery->terminal_failed_at = null;
        $delivery->failure_reason = null;
        $delivery->save();
    }

    private function deliveryFlowType(OrderDelivery $delivery): string
    {
        return (string) (data_get($delivery->order_payload, 'metadata.flowType') ?: 'standard_delivery');
    }
}
