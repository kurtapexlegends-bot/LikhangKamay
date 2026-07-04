<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Models\Product;
use App\Models\User;
use App\Support\StructuredAddress;
use App\Support\CourierAddressResolver;
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
            $structuredDropoffAddress !== '' ? $structuredDropoffAddress : trim((string) $order->shipping_address),
        ]));
        $preferredDropoffAddress = trim((string) ($structuredDropoffAddress !== '' ? $structuredDropoffAddress : ($dropoffAddressCandidates[0] ?? '')));
        $dropoffGeocodeQuery = count($dropoffAddressCandidates) === 1
            ? $dropoffAddressCandidates[0]
            : $dropoffAddressCandidates;

        $pickupCoordinates = $this->geocodingService->geocode($pickupAddressCandidates, 'seller pickup');
        $dropoffCoordinates = $this->geocodingService->geocode($dropoffGeocodeQuery, 'buyer drop-off');
        $pickupAddress = CourierAddressResolver::resolveCourierStopAddress($preferredPickupAddress, $pickupCoordinates, $pickupAddressCandidates);
        $dropoffAddress = CourierAddressResolver::resolveCourierStopAddress($preferredDropoffAddress, $dropoffCoordinates, $dropoffAddressCandidates);

        if (CourierAddressResolver::isSameCourierLocation($pickupAddress, $dropoffAddress, $pickupCoordinates, $dropoffCoordinates)) {
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
        $pickupAddress = CourierAddressResolver::resolveCourierStopAddress($preferredPickupAddress, $pickupCoordinates, $pickupAddressCandidates);
        $dropoffAddress = CourierAddressResolver::resolveCourierStopAddress($preferredDropoffAddress, $dropoffCoordinates, $dropoffAddressCandidates);

        if (CourierAddressResolver::isSameCourierLocation($pickupAddress, $dropoffAddress, $pickupCoordinates, $dropoffCoordinates)) {
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
        return app(\App\Services\Logistics\LalamoveWebhookService::class)->handleWebhook($payload, $rawBody);
    }

    public function syncDelivery(OrderDelivery $delivery): OrderDelivery
    {
        return app(\App\Services\Logistics\LalamoveWebhookService::class)->syncDelivery($delivery);
    }

    /**
     * @param  iterable<OrderDelivery|null>  $deliveries
     */
    public function syncVisibleDeliveries(iterable $deliveries, int $limit = 5, int $staleAfterSeconds = 15): void
    {
        app(\App\Services\Logistics\LalamoveWebhookService::class)->syncVisibleDeliveries($deliveries, $limit, $staleAfterSeconds);
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
                    $product->refresh();
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

            if ($order->user && $order->user->email) {
                try {
                    \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\OrderCancelled($order, 'Failed delivery hold period expired.'));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Failed to send order cancellation mail: " . $e->getMessage());
                }
            }

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
