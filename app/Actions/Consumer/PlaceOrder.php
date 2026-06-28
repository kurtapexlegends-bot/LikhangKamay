<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\PlatformActivity;
use App\Mail\OrderPlaced;
use App\Support\OrderWorkflowHelper;
use App\Services\SponsorshipAnalyticsService;
use App\Services\OrderFinanceService;
use App\Services\CheckoutShippingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class PlaceOrder
{
    private $sponsorshipAnalytics;
    private $orderFinanceService;
    private $checkoutShippingService;

    public function __construct(
        SponsorshipAnalyticsService $sponsorshipAnalytics,
        OrderFinanceService $orderFinanceService,
        CheckoutShippingService $checkoutShippingService
    ) {
        $this->sponsorshipAnalytics = $sponsorshipAnalytics;
        $this->orderFinanceService = $orderFinanceService;
        $this->checkoutShippingService = $checkoutShippingService;
    }

    /**
     * Execute order placement
     *
     * @param Request $request
     * @param User $buyer
     * @return void
     */
    public function execute(Request $request, User $buyer): void
    {
        $shippingContext = $request->shipping_method === 'Delivery'
            ? OrderWorkflowHelper::resolveCheckoutDeliveryContext($request, $buyer, true)
            : [
                'selected_address' => null,
                'shipping_address' => 'Store Pick-up - Negotiate via Chat',
                'shipping_address_type' => null,
                'shipping_recipient_name' => null,
                'shipping_contact_phone' => null,
                'shipping_street_address' => null,
                'shipping_barangay' => null,
                'shipping_city' => null,
                'shipping_region' => null,
                'shipping_postal_code' => null,
            ];

        $selectedAddress = $shippingContext['selected_address'];
        $shippingAddress = $shippingContext['shipping_address'];
        $shippingAddressType = $shippingContext['shipping_address_type'];
        $shippingRecipientName = $shippingContext['shipping_recipient_name'];
        $shippingContactPhone = $shippingContext['shipping_contact_phone'];
        $shippingStreetAddress = $shippingContext['shipping_street_address'];
        $shippingBarangay = $shippingContext['shipping_barangay'];
        $shippingCity = $shippingContext['shipping_city'];
        $shippingRegion = $shippingContext['shipping_region'];
        $shippingPostalCode = $shippingContext['shipping_postal_code'];

        $paymentMethod = $request->shipping_method === 'Pick Up' ? 'COD' : $request->payment_method;

        if ($request->boolean('save_address') && $request->shipping_method === 'Delivery' && $selectedAddress === null) {
            $buyer->addresses()->update(['is_default' => false]);

            $buyer->addresses()->create([
                'label' => ucfirst((string) $shippingAddressType),
                'address_type' => $shippingAddressType,
                'recipient_name' => $shippingRecipientName,
                'phone_number' => $shippingContactPhone,
                'street_address' => $shippingStreetAddress,
                'barangay' => $shippingBarangay,
                'full_address' => $shippingAddress,
                'city' => $shippingCity,
                'region' => $shippingRegion,
                'postal_code' => $shippingPostalCode,
                'is_default' => true,
            ]);

            $buyer->update(['saved_address' => $shippingAddress]);
        } elseif ($selectedAddress !== null) {
            $buyer->update(['saved_address' => $selectedAddress->full_address]);
        }

        $supportsWasSponsored = \Illuminate\Support\Facades\Cache::remember('schema_order_items_was_sponsored', 86400, fn() => Schema::hasColumn('order_items', 'was_sponsored'));
        $supportsSponsorshipRequestId = \Illuminate\Support\Facades\Cache::remember('schema_order_items_sponsorship_request_id', 86400, fn() => Schema::hasColumn('order_items', 'sponsorship_request_id'));
        $supportsSponsoredAtCheckout = \Illuminate\Support\Facades\Cache::remember('schema_order_items_sponsored_at_checkout', 86400, fn() => Schema::hasColumn('order_items', 'sponsored_at_checkout'));

        $groupedItems = OrderWorkflowHelper::groupCheckoutItemsBySeller($request->items);

        $financeBySeller = [];
        $grandTotal = 0.0;

        foreach ($groupedItems as $artisanId => $items) {
            $merchandiseSubtotal = 0;

            foreach ($items as $item) {
                $product = Product::find($item['id']);
                if ($product) {
                    $merchandiseSubtotal += $product->price * $item['qty'];
                }
            }

            $seller = User::find((int) $artisanId);
            $shippingFee = 0.0;

            if ($request->shipping_method === 'Delivery' && $seller) {
                $shippingQuote = $this->checkoutShippingService->estimateForSeller($seller, [
                    'shipping_method' => $request->shipping_method,
                    'shipping_address' => $shippingAddress,
                    'shipping_street_address' => $shippingStreetAddress,
                    'shipping_barangay' => $shippingBarangay,
                    'shipping_city' => $shippingCity,
                    'shipping_region' => $shippingRegion,
                    'shipping_postal_code' => $shippingPostalCode,
                ]);

                $shippingFee = (float) ($shippingQuote['amount'] ?? 0);
            }

            $financeBySeller[(string) $artisanId] = $this->orderFinanceService->calculateAmounts(
                $merchandiseSubtotal,
                $request->shipping_method,
                $shippingFee
            );
            $grandTotal += $financeBySeller[(string) $artisanId]['total_amount'];
        }

        DB::transaction(function () use (
            $request,
            $buyer,
            $groupedItems,
            $shippingAddress,
            $shippingAddressType,
            $shippingRecipientName,
            $shippingContactPhone,
            $shippingStreetAddress,
            $shippingBarangay,
            $shippingCity,
            $shippingRegion,
            $shippingPostalCode,
            $paymentMethod,
            $financeBySeller,
            $supportsWasSponsored,
            $supportsSponsorshipRequestId,
            $supportsSponsoredAtCheckout
        ) {
            foreach ($groupedItems as $artisanId => $items) {
                $finance = $financeBySeller[(string) $artisanId];
                $paymentStatus = 'pending';

                $order = Order::create(Order::filterSchemaCompatibleAttributes([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'user_id' => $buyer->id,
                    'artisan_id' => $artisanId,
                    'customer_name' => $buyer->name,
                    'merchandise_subtotal' => $finance['merchandise_subtotal'],
                    'convenience_fee_amount' => $finance['convenience_fee_amount'],
                    'shipping_fee_amount' => $finance['shipping_fee_amount'],
                    'platform_commission_amount' => $finance['platform_commission_amount'],
                    'seller_net_amount' => $finance['seller_net_amount'],
                    'total_amount' => $finance['total_amount'],
                    'status' => 'Pending',
                    'shipping_address' => $shippingAddress,
                    'shipping_address_type' => $shippingAddressType,
                    'shipping_street_address' => $shippingStreetAddress,
                    'shipping_barangay' => $shippingBarangay,
                    'shipping_city' => $shippingCity,
                    'shipping_region' => $shippingRegion,
                    'shipping_postal_code' => $shippingPostalCode,
                    'shipping_recipient_name' => $shippingRecipientName,
                    'shipping_contact_phone' => $shippingContactPhone,
                    'shipping_notes' => $request->shipping_notes,
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                    'shipping_method' => $request->shipping_method,
                ]));

                foreach ($items as $item) {
                    $product = Product::lockForUpdate()->find($item['id']);
                    
                    if (!$product || $product->stock < $item['qty']) {
                        throw new \RuntimeException("Insufficient stock for product: " . ($product ? $product->name : $item['name']));
                    }

                    $product->decrement('stock', $item['qty']);
                    $product->increment('sold', $item['qty']);
                    $product->refresh();

                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }

                    if ($product->stock <= 5) {
                        $seller = User::find($product->user_id);
                        if ($seller) {
                            $seller->notify(new \App\Notifications\LowStockNotification($product));
                        }
                    }

                    $orderItemData = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'variant' => $item['variant'] ?? null,
                        'price' => $product->price,
                        'cost' => $product->cost_price ?? 0,
                        'quantity' => $item['qty'],
                        'product_img' => $product->cover_photo_path,
                    ];

                    if ($supportsWasSponsored || $supportsSponsorshipRequestId || $supportsSponsoredAtCheckout) {
                        $activeSponsorshipRequest = $this->sponsorshipAnalytics->resolveActiveRequestForProduct($product);

                        if ($supportsWasSponsored) {
                            $orderItemData['was_sponsored'] = (bool) $activeSponsorshipRequest;
                        }

                        if ($supportsSponsorshipRequestId) {
                            $orderItemData['sponsorship_request_id'] = $activeSponsorshipRequest?->id;
                        }

                        if ($supportsSponsoredAtCheckout) {
                            $orderItemData['sponsored_at_checkout'] = $activeSponsorshipRequest ? now() : null;
                        }
                    }

                    $order->items()->create($orderItemData);
                }

                $seller = User::find($artisanId);
                if ($seller && $seller->email) {
                    $order->load('items');
                    $this->sendMailSilently(
                        $seller->email,
                        new OrderPlaced($order),
                        'order_placed',
                        ['order_id' => $order->id, 'order_number' => $order->order_number]
                    );
                    $seller->notify(new \App\Notifications\NewOrderNotification($order));
                }

                PlatformActivity::create([
                    'user_id' => $buyer->id,
                    'action' => 'order_placed',
                    'description' => 'A buyer placed an order (#' . $order->order_number . ').',
                    'metadata' => ['order_id' => $order->id]
                ]);
            }
        });

        $cart = Session::get('cart', []);
        foreach ($request->items as $item) {
            $cartKey = $item['cart_key'] ?? null;

            if ($cartKey && isset($cart[$cartKey])) {
                unset($cart[$cartKey]);
                continue;
            }

            if (isset($cart[$item['id']])) {
                unset($cart[$item['id']]);
            }
        }
        Session::put('cart', $cart);
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
