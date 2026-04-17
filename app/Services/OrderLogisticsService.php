<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Models\Product;
use App\Models\User;
use App\Support\StructuredAddress;
use App\Notifications\OrderDeliveryUpdateNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OrderShipped;

class OrderLogisticsService
{
    public function __construct(
        private readonly AddressGeocodingService $geocodingService,
        private readonly LalamoveService $lalamoveService,
        private readonly OrderFinanceService $orderFinanceService,
    ) {
    }

    public function bookLalamoveDelivery(Order $order, User $seller): OrderDelivery
    {
        $seller->loadMissing('addresses');

        if ($order->shipping_method !== 'Delivery') {
            throw new \RuntimeException('Lalamove booking is available for delivery orders only.');
        }

        if ($order->status !== 'Accepted') {
            throw new \RuntimeException('Only accepted orders can be booked with Lalamove.');
        }

        if ($this->isReplacementExchange($order)) {
            return $this->bookReplacementExchange($order, $seller);
        }

        if ($order->delivery?->external_order_id) {
            throw new \RuntimeException('This order already has a Lalamove delivery.');
        }

        $requirements = $this->bookingRequirements($order, $seller);
        if (!empty($requirements)) {
            throw new \RuntimeException(implode(' ', $requirements));
        }

        $pickupAddressCandidates = $seller->getCourierPickupAddressCandidates();
        $preferredPickupAddress = trim((string) ($seller->getPreferredCourierPickupAddress() ?? ($pickupAddressCandidates[0] ?? '')));
        $structuredDropoffAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);
        $dropoffAddressCandidates = array_values(array_filter([
            $structuredDropoffAddress,
            trim((string) $order->shipping_address),
        ]));
        $preferredDropoffAddress = trim((string) ($structuredDropoffAddress !== '' ? $structuredDropoffAddress : ($dropoffAddressCandidates[0] ?? '')));
        $dropoffGeocodeQuery = count($dropoffAddressCandidates) === 1
            ? $dropoffAddressCandidates[0]
            : $dropoffAddressCandidates;

        $pickupCoordinates = $this->geocodingService->geocode($pickupAddressCandidates, 'seller pickup');
        $dropoffCoordinates = $this->geocodingService->geocode($dropoffGeocodeQuery, 'buyer drop-off');
        $pickupAddress = $this->resolveCourierStopAddress($preferredPickupAddress, $pickupCoordinates, $pickupAddressCandidates);
        $dropoffAddress = $this->resolveCourierStopAddress($preferredDropoffAddress, $dropoffCoordinates, $dropoffAddressCandidates);

        if ($this->isSameCourierLocation($pickupAddress, $dropoffAddress, $pickupCoordinates, $dropoffCoordinates)) {
            throw new \RuntimeException('Seller pickup and buyer drop-off cannot be the same location for courier booking.');
        }

        $quotation = $this->lalamoveService->createQuotation([
            'serviceType' => (string) config('services.lalamove.service_type', 'MOTORCYCLE'),
            'language' => 'en_PH',
            'stops' => [
                [
                    'coordinates' => [
                        'lat' => $pickupCoordinates['lat'],
                        'lng' => $pickupCoordinates['lng'],
                    ],
                    'address' => $pickupAddress,
                ],
                [
                    'coordinates' => [
                        'lat' => $dropoffCoordinates['lat'],
                        'lng' => $dropoffCoordinates['lng'],
                    ],
                    'address' => $dropoffAddress,
                ],
            ],
        ]);

        $quotationId = (string) ($quotation['quotationId'] ?? '');
        $quotationStops = $quotation['stops'] ?? [];

        if ($quotationId === '' || empty($quotationStops[0]['stopId']) || empty($quotationStops[1]['stopId'])) {
            throw new \RuntimeException('Lalamove quotation did not return the expected stop details.');
        }

        $recipientPayload = [
            'stopId' => $quotationStops[1]['stopId'],
            'name' => (string) $order->shipping_recipient_name,
            'phone' => $this->lalamoveService->normalizePhone((string) $order->shipping_contact_phone),
        ];

        $shippingRemarks = trim((string) $order->shipping_notes);
        if ($shippingRemarks !== '') {
            $recipientPayload['remarks'] = $shippingRemarks;
        }

        $orderPayload = [
            'quotationId' => $quotationId,
            'isPODEnabled' => true,
            'sender' => [
                'stopId' => $quotationStops[0]['stopId'],
                'name' => $seller->shop_name ?: $seller->name,
                'phone' => $this->lalamoveService->normalizePhone((string) $seller->getPreferredCourierContactPhone()),
            ],
            'recipients' => [$recipientPayload],
            'metadata' => [
                'platform' => 'LikhangKamay',
                'orderId' => (string) $order->id,
                'orderNumber' => $order->order_number,
                'sellerId' => (string) $seller->id,
                'flowType' => 'standard_delivery',
            ],
        ];
        $lalamoveOrder = $this->lalamoveService->createOrder($orderPayload);
        $persistedOrderPayload = array_replace_recursive($lalamoveOrder, [
            'metadata' => $orderPayload['metadata'],
        ]);

        return $this->persistBookedDelivery(
            $order,
            $quotation,
            $persistedOrderPayload,
            $quotationId,
            'Delivery booked',
            'Your order is now booked with Lalamove and is waiting for courier movement.',
        );
    }

    public function bookReplacementExchange(Order $order, User $seller): OrderDelivery
    {
        $seller->loadMissing('addresses');

        if (!$this->isReplacementExchange($order)) {
            throw new \RuntimeException('This order is not currently in a replacement exchange flow.');
        }

        $requirements = $this->bookingRequirements($order, $seller);
        if (!empty($requirements)) {
            throw new \RuntimeException(implode(' ', $requirements));
        }

        $pickupAddressCandidates = $seller->getCourierPickupAddressCandidates();
        $preferredPickupAddress = trim((string) ($seller->getPreferredCourierPickupAddress() ?? ($pickupAddressCandidates[0] ?? '')));
        $structuredDropoffAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);
        $dropoffAddressCandidates = array_values(array_filter([
            $structuredDropoffAddress,
            trim((string) $order->shipping_address),
        ]));
        $preferredDropoffAddress = trim((string) ($structuredDropoffAddress !== '' ? $structuredDropoffAddress : ($dropoffAddressCandidates[0] ?? '')));
        $dropoffGeocodeQuery = count($dropoffAddressCandidates) === 1
            ? $dropoffAddressCandidates[0]
            : $dropoffAddressCandidates;

        $pickupCoordinates = $this->geocodingService->geocode($pickupAddressCandidates, 'seller pickup');
        $dropoffCoordinates = $this->geocodingService->geocode($dropoffGeocodeQuery, 'buyer drop-off');
        $pickupAddress = $this->resolveCourierStopAddress($preferredPickupAddress, $pickupCoordinates, $pickupAddressCandidates);
        $dropoffAddress = $this->resolveCourierStopAddress($preferredDropoffAddress, $dropoffCoordinates, $dropoffAddressCandidates);

        if ($this->isSameCourierLocation($pickupAddress, $dropoffAddress, $pickupCoordinates, $dropoffCoordinates)) {
            throw new \RuntimeException('Seller pickup and buyer drop-off cannot be the same location for courier booking.');
        }

        $quotation = $this->lalamoveService->createQuotation([
            'serviceType' => (string) config('services.lalamove.service_type', 'MOTORCYCLE'),
            'language' => 'en_PH',
            'stops' => [
                [
                    'coordinates' => [
                        'lat' => $pickupCoordinates['lat'],
                        'lng' => $pickupCoordinates['lng'],
                    ],
                    'address' => $pickupAddress,
                ],
                [
                    'coordinates' => [
                        'lat' => $dropoffCoordinates['lat'],
                        'lng' => $dropoffCoordinates['lng'],
                    ],
                    'address' => $dropoffAddress,
                ],
                [
                    'coordinates' => [
                        'lat' => $pickupCoordinates['lat'],
                        'lng' => $pickupCoordinates['lng'],
                    ],
                    'address' => $pickupAddress,
                ],
            ],
        ]);

        $quotationId = (string) ($quotation['quotationId'] ?? '');
        $quotationStops = $quotation['stops'] ?? [];

        if (
            $quotationId === ''
            || empty($quotationStops[0]['stopId'])
            || empty($quotationStops[1]['stopId'])
            || empty($quotationStops[2]['stopId'])
        ) {
            throw new \RuntimeException('Lalamove quotation did not return the expected replacement stop details.');
        }

        $replacementExchangeRemark = trim(implode(' ', array_filter([
            'Deliver the replacement item and collect the rejected item from the buyer.',
            trim((string) $order->shipping_notes),
        ])));

        $orderPayload = [
            'quotationId' => $quotationId,
            'isPODEnabled' => true,
            'sender' => [
                'stopId' => $quotationStops[0]['stopId'],
                'name' => $seller->shop_name ?: $seller->name,
                'phone' => $this->lalamoveService->normalizePhone((string) $seller->getPreferredCourierContactPhone()),
            ],
            'recipients' => [
                [
                    'stopId' => $quotationStops[1]['stopId'],
                    'name' => (string) $order->shipping_recipient_name,
                    'phone' => $this->lalamoveService->normalizePhone((string) $order->shipping_contact_phone),
                    'remarks' => $replacementExchangeRemark,
                ],
                [
                    'stopId' => $quotationStops[2]['stopId'],
                    'name' => $seller->shop_name ?: $seller->name,
                    'phone' => $this->lalamoveService->normalizePhone((string) $seller->getPreferredCourierContactPhone()),
                    'remarks' => 'Return the rejected item collected from the buyer to the seller.',
                ],
            ],
            'metadata' => [
                'platform' => 'LikhangKamay',
                'orderId' => (string) $order->id,
                'orderNumber' => $order->order_number,
                'sellerId' => (string) $seller->id,
                'flowType' => 'replacement_exchange',
            ],
        ];
        $lalamoveOrder = $this->lalamoveService->createOrder($orderPayload);
        $persistedOrderPayload = array_replace_recursive($lalamoveOrder, [
            'metadata' => $orderPayload['metadata'],
        ]);

        return $this->persistBookedDelivery(
            $order,
            $quotation,
            $persistedOrderPayload,
            $quotationId,
            'Replacement courier booked',
            'Your replacement is now booked with Lalamove. The courier will deliver the replacement and bring the rejected item back to the seller.',
        );
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

    public function autoCancelFailedDelivery(OrderDelivery $delivery): bool
    {
        return DB::transaction(function () use ($delivery) {
            /** @var OrderDelivery $lockedDelivery */
            $lockedDelivery = OrderDelivery::query()
                ->with(['order.items', 'order.user', 'order.artisan'])
                ->lockForUpdate()
                ->findOrFail($delivery->id);

            $order = $lockedDelivery->order;

            if (!$order || !$lockedDelivery->terminal_failed_at || $lockedDelivery->auto_cancelled_at) {
                return false;
            }

            if ($order->status === 'Cancelled') {
                $lockedDelivery->update(['auto_cancelled_at' => now()]);
                return true;
            }

            if (!$lockedDelivery->isTerminalFailure()) {
                return false;
            }

            foreach ($order->items as $item) {
                $product = Product::query()->lockForUpdate()->find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);
                    $product->decrement('sold', $item->quantity);
                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }
                }
            }

            $updateData = [
                'status' => 'Cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'return_to_sender_failed_delivery',
            ];
            $shouldMarkRefunded = $order->payment_method !== 'COD' && $order->payment_status === 'paid';

            if ($shouldMarkRefunded) {
                $updateData['payment_status'] = 'refunded';
            }

            $order->update($updateData);

            $lockedDelivery->update([
                'auto_cancelled_at' => now(),
                'failure_reason' => $lockedDelivery->failure_reason ?: 'Delivery failed and was automatically cancelled after the hold window.',
            ]);

            $buyerUrl = route('my-orders.index');
            $sellerUrl = route('orders.index');

            $order->user?->notify(new OrderDeliveryUpdateNotification(
                $order,
                'Order cancelled after failed delivery',
                'The courier could not complete delivery, so the order was automatically cancelled.',
                $buyerUrl
            ));

            $order->artisan?->notify(new OrderDeliveryUpdateNotification(
                $order,
                'Delivery auto-cancelled',
                'This order was automatically cancelled after an unresolved courier failure.',
                $sellerUrl
            ));

            return true;
        });
    }

    public function bookingRequirements(Order $order, User $seller): array
    {
        $seller->loadMissing('addresses');

        $missing = [];
        $pickupAddress = $seller->getPreferredCourierPickupAddress();
        $dropoffAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);
        $dropoffAddress = $dropoffAddress !== '' ? $dropoffAddress : trim((string) $order->shipping_address);

        if (blank($pickupAddress)) {
            $missing[] = 'Add a default seller Address Book entry with a full address, or complete the primary shop address before booking Lalamove.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($pickupAddress)) {
            $missing[] = 'Seller pickup address is still too broad. Add street, barangay, city, and province before booking Lalamove.';
        }

        if (blank($seller->getPreferredCourierContactPhone())) {
            $missing[] = 'Add a seller contact number in your profile or default Address Book before booking Lalamove.';
        }

        if ($dropoffAddress === '') {
            $missing[] = 'Buyer shipping address is missing.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($dropoffAddress)) {
            $missing[] = 'Buyer delivery address is still too broad. Complete the street, barangay, city, and province before booking Lalamove.';
        }

        if (trim((string) $order->shipping_recipient_name) === '') {
            $missing[] = 'Buyer recipient name is missing.';
        }

        if (trim((string) $order->shipping_contact_phone) === '') {
            $missing[] = 'Buyer contact number is missing.';
        }

        if (
            $pickupAddress !== null
            && $dropoffAddress !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) === StructuredAddress::normalizeForComparison($dropoffAddress)
        ) {
            $missing[] = 'Seller pickup and buyer drop-off cannot be the same address.';
        }

        return $missing;
    }

    /**
     * @param  array<int, string>  $fallbackCandidates
     */
    private function resolveCourierStopAddress(string $preferredAddress, array $coordinates, array $fallbackCandidates): string
    {
        $preferredAddress = trim($preferredAddress);
        $matchedQuery = trim((string) ($coordinates['matched_query'] ?? ''));
        $fallbackAddress = trim((string) ($fallbackCandidates[0] ?? ''));

        if ($preferredAddress === '') {
            return $matchedQuery !== '' ? $matchedQuery : $fallbackAddress;
        }

        if ($this->addressesAreEquivalent($preferredAddress, $matchedQuery)) {
            return $preferredAddress;
        }

        return $matchedQuery !== '' ? $matchedQuery : $preferredAddress;
    }

    private function addressesAreEquivalent(?string $left, ?string $right): bool
    {
        $left = StructuredAddress::normalizeForComparison($left);
        $right = StructuredAddress::normalizeForComparison($right);

        return $left !== '' && $left === $right;
    }

    private function isSameCourierLocation(array|string $pickupAddress, array|string $dropoffAddress, array $pickupCoordinates, array $dropoffCoordinates): bool
    {
        if ($this->addressesAreEquivalent((string) $pickupAddress, (string) $dropoffAddress)) {
            return true;
        }

        $distanceMeters = $this->distanceBetweenCoordinates(
            (float) ($pickupCoordinates['lat'] ?? 0),
            (float) ($pickupCoordinates['lng'] ?? 0),
            (float) ($dropoffCoordinates['lat'] ?? 0),
            (float) ($dropoffCoordinates['lng'] ?? 0),
        );

        return $distanceMeters !== null && $distanceMeters <= 100;
    }

    private function distanceBetweenCoordinates(float $latA, float $lngA, float $latB, float $lngB): ?float
    {
        if ($latA === 0.0 || $lngA === 0.0 || $latB === 0.0 || $lngB === 0.0) {
            return null;
        }

        $earthRadius = 6371000;
        $latDelta = deg2rad($latB - $latA);
        $lngDelta = deg2rad($lngB - $lngA);
        $latA = deg2rad($latA);
        $latB = deg2rad($latB);

        $haversine = sin($latDelta / 2) ** 2
            + cos($latA) * cos($latB) * sin($lngDelta / 2) ** 2;

        $arc = 2 * atan2(sqrt($haversine), sqrt(1 - $haversine));

        return $earthRadius * $arc;
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

    private function persistBookedDelivery(
        Order $order,
        array $quotation,
        array $lalamoveOrder,
        string $quotationId,
        string $notificationTitle,
        string $notificationMessage
    ): OrderDelivery {
        return DB::transaction(function () use ($order, $quotation, $lalamoveOrder, $quotationId, $notificationTitle, $notificationMessage) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->with('delivery')->lockForUpdate()->findOrFail($order->id);

            if ($this->isReplacementExchange($lockedOrder)) {
                $lockedOrder->delivery()->delete();
                $lockedOrder->unsetRelation('delivery');
            } elseif ($lockedOrder->delivery?->external_order_id) {
                return $lockedOrder->delivery;
            }

            $delivery = $lockedOrder->delivery()->create([
                'provider' => OrderDelivery::PROVIDER_LALAMOVE,
                'status' => strtoupper((string) ($lalamoveOrder['status'] ?? 'ASSIGNING_DRIVER')),
                'service_type' => (string) ($quotation['serviceType'] ?? config('services.lalamove.service_type', 'MOTORCYCLE')),
                'quotation_id' => $quotationId,
                'external_order_id' => (string) ($lalamoveOrder['orderId'] ?? ''),
                'request_id' => (string) ($lalamoveOrder['orderId'] ?? ''),
                'share_link' => $lalamoveOrder['shareLink'] ?? null,
                'price_currency' => $lalamoveOrder['priceBreakdown']['currency'] ?? ($quotation['priceBreakdown']['currency'] ?? null),
                'price_total' => isset($lalamoveOrder['priceBreakdown']['total'])
                    ? (float) $lalamoveOrder['priceBreakdown']['total']
                    : (isset($quotation['priceBreakdown']['total']) ? (float) $quotation['priceBreakdown']['total'] : null),
                'price_breakdown' => $lalamoveOrder['priceBreakdown'] ?? ($quotation['priceBreakdown'] ?? null),
                'quotation_payload' => $quotation,
                'order_payload' => $lalamoveOrder,
                'latest_payload' => $lalamoveOrder,
                'is_pod_enabled' => true,
            ]);

            $lockedOrder->update([
                'status' => 'Shipped',
                'shipped_at' => now(),
                'tracking_number' => (string) ($lalamoveOrder['orderId'] ?? $quotationId),
            ]);

            $lockedOrder->loadMissing(['user', 'delivery']);

            if ($lockedOrder->user) {
                $lockedOrder->user->notify(new OrderDeliveryUpdateNotification(
                    $lockedOrder,
                    $notificationTitle,
                    $notificationMessage,
                    route('my-orders.index')
                ));
            }

            if ($lockedOrder->user?->email) {
                $this->sendMailSilently(
                    $lockedOrder->user->email,
                    new OrderShipped($lockedOrder),
                    'order_shipped_lalamove',
                    ['order_id' => $lockedOrder->id, 'order_number' => $lockedOrder->order_number]
                );
            }

            return $delivery;
        });
    }

    private function isReplacementExchange(Order $order): bool
    {
        return $order->shipping_method === 'Delivery'
            && $order->replacement_started_at !== null
            && $order->replacement_resolved_at === null;
    }

    private function deliveryFlowType(OrderDelivery $delivery): string
    {
        return (string) (data_get($delivery->order_payload, 'metadata.flowType') ?: 'standard_delivery');
    }

    private function sendMailSilently(string $recipient, OrderShipped $mailable, string $context, array $extraContext = []): void
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
