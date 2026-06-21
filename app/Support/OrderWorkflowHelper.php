<?php

namespace App\Support;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Models\User;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderWorkflowHelper
{
    /**
     * Group checkout items by seller ID
     *
     * @param array $items
     * @return \Illuminate\Support\Collection
     */
    public static function groupCheckoutItemsBySeller(array $items)
    {
        return collect($items)
            ->map(function (array $item) {
                $product = Product::findOrFail($item['id']);

                return [
                    'id' => $product->id,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'qty' => (int) $item['qty'],
                    'variant' => $item['variant'] ?? null,
                ];
            })
            ->groupBy('artisan_id');
    }

    /**
     * Resolve delivery details context for checkout
     *
     * @param Request $request
     * @param User $buyer
     * @param bool $requireContactDetails
     * @return array
     */
    public static function resolveCheckoutDeliveryContext(Request $request, User $buyer, bool $requireContactDetails): array
    {
        $selectedAddressId = $request->input('selected_address_id');
        $selectedAddress = null;

        $shippingAddressType = null;
        $shippingRecipientName = null;
        $shippingContactPhone = null;
        $shippingStreetAddress = null;
        $shippingBarangay = null;
        $shippingCity = null;
        $shippingRegion = null;
        $shippingPostalCode = null;

        if ($selectedAddressId !== null && $selectedAddressId !== '' && $selectedAddressId !== 'new') {
            if (!is_scalar($selectedAddressId) || !ctype_digit((string) $selectedAddressId)) {
                throw ValidationException::withMessages([
                    'selected_address_id' => 'Select a valid saved address or choose a new delivery address.',
                ]);
            }

            $selectedAddress = $buyer->addresses()->find((int) $selectedAddressId);

            if (!$selectedAddress) {
                throw ValidationException::withMessages([
                    'selected_address_id' => 'Select a valid saved address or choose a new delivery address.',
                ]);
            }

            $shippingStreetAddress = StructuredAddress::clean($selectedAddress->street_address);
            $shippingBarangay = StructuredAddress::clean($selectedAddress->barangay);
            $shippingCity = StructuredAddress::clean($selectedAddress->city);
            $shippingRegion = StructuredAddress::clean($selectedAddress->region);
            $shippingPostalCode = StructuredAddress::clean($selectedAddress->postal_code);
            $shippingAddress = $selectedAddress->full_address ?: StructuredAddress::formatPhilippineAddress([
                'street_address' => $shippingStreetAddress,
                'barangay' => $shippingBarangay,
                'city' => $shippingCity,
                'region' => $shippingRegion,
                'postal_code' => $shippingPostalCode,
            ]);
            $shippingAddressType = $selectedAddress->address_type ?: 'home';
            $shippingRecipientName = $request->filled('recipient_name')
                ? $request->input('recipient_name')
                : ($selectedAddress->recipient_name ?: $buyer->name);
            $shippingContactPhone = $request->filled('phone_number')
                ? $request->input('phone_number')
                : ($selectedAddress->phone_number ?: $buyer->phone_number);
        } else {
            $hasStructuredShippingInput = collect([
                $request->input('shipping_street_address'),
                $request->input('shipping_barangay'),
                $request->input('shipping_city'),
                $request->input('shipping_region'),
                $request->input('shipping_postal_code'),
            ])->contains(fn ($value) => StructuredAddress::clean($value) !== null);

            if ($hasStructuredShippingInput) {
                $request->validate([
                    'shipping_street_address' => 'required|string|max:255',
                    'shipping_barangay' => 'required|string|max:255',
                    'shipping_city' => 'required|string|max:255',
                    'shipping_region' => 'required|string|max:255',
                    'shipping_postal_code' => 'nullable|string|max:20',
                    'shipping_address_type' => 'required|string|in:home,office,other',
                ]);

                $shippingStreetAddress = StructuredAddress::clean($request->shipping_street_address);
                $shippingBarangay = StructuredAddress::clean($request->shipping_barangay);
                $shippingCity = StructuredAddress::clean($request->shipping_city);
                $shippingRegion = StructuredAddress::clean($request->shipping_region);
                $shippingPostalCode = StructuredAddress::clean($request->shipping_postal_code);
                $shippingAddress = StructuredAddress::formatPhilippineAddress([
                    'street_address' => $shippingStreetAddress,
                    'barangay' => $shippingBarangay,
                    'city' => $shippingCity,
                    'region' => $shippingRegion,
                    'postal_code' => $shippingPostalCode,
                ]);
            } else {
                $request->validate([
                    'shipping_address' => 'required|string',
                    'shipping_address_type' => 'required|string|in:home,office,other',
                ]);

                $shippingAddress = (string) $request->shipping_address;
            }

            $shippingAddressType = $request->input('shipping_address_type');
            $shippingRecipientName = $request->filled('recipient_name')
                ? $request->input('recipient_name')
                : $buyer->name;
            $shippingContactPhone = $request->filled('phone_number')
                ? $request->input('phone_number')
                : $buyer->phone_number;
        }

        if ($requireContactDetails && (blank($shippingRecipientName) || blank($shippingContactPhone))) {
            throw ValidationException::withMessages([
                'phone_number' => 'Recipient name and phone number are required for delivery bookings.',
            ]);
        }

        return [
            'selected_address' => $selectedAddress,
            'shipping_address' => (string) $shippingAddress,
            'shipping_address_type' => $shippingAddressType,
            'shipping_recipient_name' => $shippingRecipientName,
            'shipping_contact_phone' => $shippingContactPhone,
            'shipping_street_address' => $shippingStreetAddress,
            'shipping_barangay' => $shippingBarangay,
            'shipping_city' => $shippingCity,
            'shipping_region' => $shippingRegion,
            'shipping_postal_code' => $shippingPostalCode,
        ];
    }

    /**
     * Serialize a delivery model to array
     *
     * @param OrderDelivery|null $delivery
     * @return array|null
     */
    public static function serializeDelivery(?OrderDelivery $delivery): ?array
    {
        if (!$delivery) {
            return null;
        }

        $status = strtoupper((string) $delivery->status);
        $holdEndsAt = $delivery->terminal_failed_at?->copy()->addDay();
        $flowType = (string) (data_get($delivery->order_payload, 'metadata.flowType') ?: 'standard_delivery');
        $isReplacementExchange = $flowType === 'replacement_exchange';

        return [
            'provider' => $delivery->provider,
            'status' => $status,
            'service_type' => $delivery->service_type,
            'external_order_id' => $delivery->external_order_id,
            'quotation_id' => $delivery->quotation_id,
            'share_link' => $delivery->share_link,
            'price_total' => $delivery->price_total !== null ? number_format((float) $delivery->price_total, 2) : null,
            'price_currency' => $delivery->price_currency,
            'failure_reason' => $delivery->failure_reason,
            'terminal_failed_at' => $delivery->terminal_failed_at?->format('M d, Y h:i A'),
            'auto_cancelled_at' => $delivery->auto_cancelled_at?->format('M d, Y h:i A'),
            'pending_auto_cancel' => $delivery->terminal_failed_at !== null && $delivery->auto_cancelled_at === null,
            'cancel_hold_ends_at' => $holdEndsAt?->format('M d, Y h:i A'),
            'last_updated_at' => $delivery->last_webhook_received_at?->format('M d, Y h:i A') ?? $delivery->updated_at?->format('M d, Y h:i A'),
            'flow_type' => $flowType,
            'flow_label' => $isReplacementExchange ? 'Replacement Exchange' : 'Standard Delivery',
            'flow_summary' => $isReplacementExchange
                ? 'Courier will deliver the replacement item to the buyer, collect the rejected item, and return it to the seller.'
                : 'Courier will move the order from the seller to the buyer.',
            'route_legs' => $isReplacementExchange
                ? [
                    ['label' => 'Replacement delivery', 'from' => 'Seller', 'to' => 'Buyer'],
                    ['label' => 'Rejected item return', 'from' => 'Buyer', 'to' => 'Seller'],
                ]
                : [
                    ['label' => 'Delivery', 'from' => 'Seller', 'to' => 'Buyer'],
                ],
        ];
    }

    /**
     * Build timeline entries for an order
     *
     * @param Order $order
     * @return array
     */
    public static function buildOrderTimeline(Order $order): array
    {
        $entries = collect();

        $pushEntry = function (
            string $key,
            ?\Carbon\CarbonInterface $timestamp,
            string $label,
            ?string $description = null,
            string $source = 'order'
        ) use (&$entries): void {
            if (!$timestamp) {
                return;
            }

            $entries->push([
                'key' => $key,
                'label' => $label,
                'description' => $description,
                'source' => $source,
                'timestamp' => $timestamp->toIso8601String(),
            ]);
        };

        $pushEntry('order_placed', $order->created_at, 'Order placed', 'Buyer submitted the order.');
        $pushEntry('order_accepted', $order->accepted_at, 'Order accepted', 'Seller confirmed the order.');

        if ($order->shipping_method === 'Pick Up') {
            $pushEntry(
                'pickup_ready',
                $order->shipped_at,
                'Ready for pickup',
                'Seller marked the order as ready for buyer pickup.'
            );
            $pushEntry(
                'pickup_completed',
                $order->delivered_at,
                'Picked up',
                'Seller marked the order as picked up by the buyer.'
            );
        } else {
            $pushEntry(
                'order_shipped',
                $order->shipped_at,
                'Order shipped',
                $order->tracking_number
                    ? 'Tracking number: ' . $order->tracking_number
                    : 'Seller marked the order as shipped.'
            );
            $pushEntry(
                'order_delivered',
                $order->delivered_at,
                'Marked as delivered',
                'Seller or courier marked the order as delivered.'
            );
        }

        $pushEntry('buyer_confirmed', $order->received_at, 'Buyer confirmed receipt', 'Buyer marked the order as received.');
        $pushEntry('order_cancelled', $order->cancelled_at, 'Order cancelled', $order->cancellation_reason ? 'Reason: ' . $order->cancellation_reason : null);
        $pushEntry('replacement_started', $order->replacement_started_at, 'Replacement started', $order->replacement_resolution_description ?: 'Seller approved a replacement workflow.');
        $pushEntry('replacement_resolved', $order->replacement_resolved_at, 'Replacement resolved', 'Buyer confirmed receipt of the replacement item.');

        if ($order->relationLoaded('delivery') && $order->delivery) {
            $order->delivery->loadMissing('events');

            $order->delivery->events
                ->sortByDesc('created_at')
                ->each(function (OrderDeliveryEvent $event) use (&$entries) {
                    $entries->push([
                        'key' => 'delivery_event_' . $event->id,
                        'label' => self::deliveryEventLabel($event),
                        'description' => self::deliveryEventDescription($event),
                        'source' => 'courier',
                        'timestamp' => optional($event->created_at)?->toIso8601String(),
                    ]);
                });
        }

        $currentStatusTimestamp = $order->updated_at;
        if ($currentStatusTimestamp) {
            $entries->push([
                'key' => 'current_status',
                'label' => 'Current status: ' . $order->status,
                'description' => null,
                'source' => 'status',
                'timestamp' => $currentStatusTimestamp->toIso8601String(),
            ]);
        }

        return $entries
            ->filter(fn (array $entry) => !empty($entry['timestamp']))
            ->sortByDesc('timestamp')
            ->unique(fn (array $entry) => $entry['key'])
            ->values()
            ->take(8)
            ->all();
    }

    /**
     * Check lalamove booking requirements
     *
     * @param Order $order
     * @param User $seller
     * @return array
     */
    public static function lalamoveBookingRequirements(Order $order, User $seller): array
    {
        $seller->loadMissing('addresses');

        $requirements = [];
        $pickupAddress = $seller->getPreferredCourierPickupAddress();
        $buyerStructuredAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);
        $dropoffAddress = $buyerStructuredAddress !== '' ? $buyerStructuredAddress : trim((string) $order->shipping_address);

        if (blank($pickupAddress)) {
            $requirements[] = 'Add a default seller Address Book entry with a full address, or complete the primary shop address.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($pickupAddress)) {
            $requirements[] = 'Seller pickup address is too broad. Add street, barangay, city, and province.';
        }

        if (blank($seller->getPreferredCourierContactPhone())) {
            $requirements[] = 'Add a seller contact number in your profile or default Address Book.';
        }

        if ($dropoffAddress === '') {
            $requirements[] = 'Buyer shipping address is missing.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($dropoffAddress)) {
            $requirements[] = 'Buyer delivery address is too broad. Complete the street, barangay, city, and province.';
        }

        if (blank($order->shipping_recipient_name)) {
            $requirements[] = 'Buyer recipient name is missing.';
        }

        if (blank($order->shipping_contact_phone)) {
            $requirements[] = 'Buyer contact number is missing.';
        }

        if (
            $pickupAddress !== null
            && $dropoffAddress !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) === StructuredAddress::normalizeForComparison($dropoffAddress)
        ) {
            $requirements[] = 'Seller pickup and buyer drop-off cannot be the same address.';
        }

        return $requirements;
    }

    private static function deliveryEventLabel(OrderDeliveryEvent $event): string
    {
        $eventType = strtoupper((string) $event->event_type);
        $payloadStatus = strtoupper((string) (data_get($event->payload, 'data.status') ?? ''));

        return match (true) {
            $eventType === 'DRIVER_ASSIGNED' => 'Courier assigned',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'COMPLETED' => 'Courier completed delivery',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'PICKED_UP' => 'Courier picked up parcel',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'ON_GOING' => 'Courier started trip',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'CANCELED' => 'Courier cancelled booking',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'REJECTED' => 'Courier rejected booking',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'EXPIRED' => 'Courier booking expired',
            $eventType === 'POLL_SYNC' => 'Courier status synced',
            default => str_replace('_', ' ', ucfirst(strtolower($eventType ?: 'delivery update'))),
        };
    }

    private static function deliveryEventDescription(OrderDeliveryEvent $event): ?string
    {
        $payloadStatus = strtoupper((string) (data_get($event->payload, 'data.status') ?? ''));

        if ($payloadStatus !== '') {
            return 'Lalamove status: ' . str_replace('_', ' ', ucfirst(strtolower($payloadStatus)));
        }

        if ($event->external_order_id) {
            return 'Courier order ID: ' . $event->external_order_id;
        }

        return null;
    }
}
