<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $artisan_id
 * @property int $user_id
 * @property string $order_number
 * @property string $customer_name
 * @property float $merchandise_subtotal
 * @property float $convenience_fee_amount
 * @property float $shipping_fee_amount
 * @property float $platform_commission_amount
 * @property float $seller_net_amount
 * @property float $total_amount
 * @property string $status
 * @property string $payment_method
 * @property string $payment_status
 * @property string|null $paymongo_session_id
 * @property bool $review_reminder_sent
 * @property bool $shipment_reminder_sent
 * @property string|null $shipping_address
 * @property string|null $tracking_number
 * @property \Illuminate\Support\Carbon|null $received_at
 * @property \Illuminate\Support\Carbon|null $accepted_at
 * @property \Illuminate\Support\Carbon|null $shipped_at
 * @property \Illuminate\Support\Carbon|null $delivered_at
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property string|null $cancellation_reason
 * @property string|null $return_reason
 * @property string|null $return_proof_image
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\OrderItem[] $items
 * @property-read \App\Models\User $user
 * @property-read \App\Models\User $artisan
 */
class Order extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_ONLINE = 'online';
    public const TYPE_POS_WALKIN = 'pos_walkin';

    public const STATUS_PENDING = 'Pending';
    public const STATUS_ACCEPTED = 'Accepted';
    public const STATUS_PROCESSING = 'Processing';
    public const STATUS_READY_FOR_PICKUP = 'Ready for Pickup';
    public const STATUS_SHIPPED = 'Shipped';
    public const STATUS_DELIVERED = 'Delivered';
    public const STATUS_COMPLETED = 'Completed';
    public const STATUS_CANCELLED = 'Cancelled';
    public const STATUS_REJECTED = 'Rejected';
    public const STATUS_REFUNDED = 'Refunded';
    public const STATUS_REPLACED = 'Replaced';

    protected $fillable = [
        'artisan_id', 'user_id', 'order_type', 'order_number', 'customer_name',
        'merchandise_subtotal', 'convenience_fee_amount', 'shipping_fee_amount', 'platform_commission_amount', 'seller_net_amount',
        'total_amount', 'pos_cash_tendered', 'pos_change_amount', 'pos_payment_reference', 'pos_processed_by_user_id', 'pos_location_id',
        'status', 'auto_complete_at', 'payment_method', 'payment_status', 'paymongo_session_id', 'payment_id', 'review_reminder_sent', 'shipment_reminder_sent', 'shipping_address', 'shipping_address_type',
        'shipping_street_address', 'shipping_barangay', 'shipping_city', 'shipping_region', 'shipping_postal_code',
        'shipping_latitude', 'shipping_longitude',
        'shipping_recipient_name', 'shipping_contact_phone', 'shipping_notes', 'tracking_number', 'received_at', 'warranty_expires_at',
        'accepted_at', 'shipped_at', 'delivered_at', 'cancelled_at', 'cancellation_reason', 'shipping_method', 'proof_of_delivery',
        'pickup_date', 'pickup_time_slot', 'pickup_pin', 'pickup_location_id', 'pickup_location_snapshot',
        'return_reason', 'return_proof_image',
        'replacement_resolution_description', 'replacement_started_at', 'replacement_resolved_at',
        'vat_type', 'vatable_sales', 'vat_amount', 'vat_exempt_sales', 'vat_rate',
        'voucher_id', 'voucher_code', 'voucher_discount_amount',
        'is_test',
    ];

    // Format date automatically for frontend (e.g., "Oct 24, 2025")
    protected $casts = [
        'is_test' => \App\Casts\PostgresCompatibleBoolean::class,
        'created_at' => 'datetime:M d, Y • h:i A',
        'auto_complete_at' => 'datetime',
        'received_at' => 'datetime',
        'warranty_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'replacement_started_at' => 'datetime',
        'replacement_resolved_at' => 'datetime',
        'pickup_date' => 'date',
        'pickup_location_snapshot' => 'array',
        'shipping_latitude' => 'float',
        'shipping_longitude' => 'float',
        'merchandise_subtotal' => 'decimal:2',
        'convenience_fee_amount' => 'decimal:2',
        'shipping_fee_amount' => 'decimal:2',
        'platform_commission_amount' => 'decimal:2',
        'seller_net_amount' => 'decimal:2',
        'pos_cash_tendered' => 'decimal:2',
        'pos_change_amount' => 'decimal:2',
        'vatable_sales' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'vat_exempt_sales' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'voucher_discount_amount' => 'decimal:2',
        'review_reminder_sent' => \App\Casts\PostgresCompatibleBoolean::class,
        'shipment_reminder_sent' => \App\Casts\PostgresCompatibleBoolean::class,
    ];

    protected static function booted(): void
    {
        static::saved(function (Order $order) {
            // Data Integrity Guard: An order in Pending state must never retain an active or orphaned delivery record
            if ($order->status === 'Pending' && $order->id) {
                \Illuminate\Support\Facades\DB::table('order_deliveries')
                    ->where('order_id', $order->id)
                    ->delete();
            }

            if (in_array($order->status, ['Cancelled', 'Rejected'], true) && $order->id) {
                rescue(fn () => app(\App\Services\VoucherService::class)->revertRedemptionsForOrder($order), report: false);
            }
        });
    }

    // Relationship: Order has many Items
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Relationship: Order belongs to a Buyer
    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function artisan()
    {
        return $this->belongsTo(User::class, 'artisan_id')->withTrashed();
    }

    public function seller()
    {
        return $this->artisan();
    }

    public function delivery()
    {
        return $this->hasOne(OrderDelivery::class);
    }

    public function dispute()
    {
        return $this->hasOne(Dispute::class);
    }

    public function pickupLocation()
    {
        return $this->belongsTo(SellerLocation::class, 'pickup_location_id');
    }

    public function voucher()
    {
        return $this->belongsTo(Voucher::class, 'voucher_id')->withTrashed();
    }

    public function voucherRedemptions()
    {
        return $this->hasMany(VoucherRedemption::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'pos_processed_by_user_id')->withTrashed();
    }

    public function posLocation()
    {
        return $this->belongsTo(SellerLocation::class, 'pos_location_id')->withTrashed();
    }

    public function isPosWalkIn(): bool
    {
        return ($this->order_type ?? self::TYPE_ONLINE) === self::TYPE_POS_WALKIN;
    }

    /**
     * Check if this order contains any wholesale B2B supply items.
     */
    public function isB2BOrder(): bool
    {
        if ($this->relationLoaded('items')) {
            return $this->items->contains(fn($item) => (bool) $item->is_b2b_supply);
        }

        return $this->items()->where('is_b2b_supply', \App\Casts\PostgresCompatibleBoolean::dbVal(true))->exists();
    }

    /**
     * Scope query to orders with B2B supply items.
     */
    public function scopeWhereB2B($query)
    {
        return $query->whereHas('items', function ($q) {
            $q->where('is_b2b_supply', \App\Casts\PostgresCompatibleBoolean::dbVal(true));
        });
    }

    /**
     * Scope query to retail orders (excluding B2B supply items).
     */
    public function scopeWhereRetail($query)
    {
        return $query->whereDoesntHave('items', function ($q) {
            $q->where('is_b2b_supply', \App\Casts\PostgresCompatibleBoolean::dbVal(true));
        });
    }

    /**
     * Get the tracking/orders portal URL for the buyer.
     */
    public function buyerTrackingUrl(): string
    {
        return $this->isB2BOrder() ? route('seller.supply-hub.orders') : route('my-orders.index');
    }

    /**
     * Get the tracking/orders portal URL for the seller.
     */
    public function sellerTrackingUrl(): string
    {
        return $this->isB2BOrder() ? route('seller.supply-hub.sales') : route('orders.index');
    }

    protected static function boot()
    {
        parent::boot();

        static::saved(function (self $order) {
            \Illuminate\Support\Facades\Cache::forget("seller_{$order->artisan_id}_analytics_daily_rollup_" . \Carbon\Carbon::now(config('app.timezone'))->toDateString());
        });

        static::deleted(function (self $order) {
            \Illuminate\Support\Facades\Cache::forget("seller_{$order->artisan_id}_analytics_daily_rollup_" . \Carbon\Carbon::now(config('app.timezone'))->toDateString());
        });
    }

    /** @var array<string>|null */
    protected static ?array $cachedOrderColumns = null;

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        if (static::$cachedOrderColumns === null) {
            static::$cachedOrderColumns = rescue(
                fn () => \Illuminate\Support\Facades\Schema::getColumnListing('orders'),
                []
            );
        }

        if (empty(static::$cachedOrderColumns)) {
            return $attributes;
        }

        return array_intersect_key($attributes, array_flip(static::$cachedOrderColumns));
    }

    public static function supportsShippingFeeAmountColumn(): bool
    {
        return true;
    }

    public static function supportsPlatformCommissionAmountColumn(): bool
    {
        return true;
    }

    public static function supportsSellerNetAmountColumn(): bool
    {
        return true;
    }

    public function getResolvedShippingFeeAmount(): float
    {
        $fee = (float) ($this->getAttribute('shipping_fee_amount') ?? 0);
        $netMerchandise = max(0.0, (float) $this->merchandise_subtotal - (float) ($this->voucher_discount_amount ?? 0));
        if ($fee <= 0 && (float) $this->total_amount > $netMerchandise) {
            $diff = (float) $this->total_amount - $netMerchandise - (float) ($this->convenience_fee_amount ?? 0);
            if ($diff > 0) {
                return round($diff, 2);
            }
        }
        return round($fee, 2);
    }

    public function getResolvedPlatformCommissionAmount(): float
    {
        return round((float) ($this->getAttribute('platform_commission_amount') ?? 0), 2);
    }

    public function getResolvedSellerNetAmount(): float
    {
        return round((float) ($this->getAttribute('seller_net_amount') ?? 0), 2);
    }

    /**
     * Get the resolved recipient name for logistics and shipping.
     */
    public function getResolvedRecipientName(): string
    {
        $name = trim((string) $this->shipping_recipient_name);
        if ($name !== '') {
            return $name;
        }

        $customer = trim((string) $this->customer_name);
        if ($customer !== '') {
            return $customer;
        }

        return trim((string) ($this->user?->name ?: ($this->user?->shop_name ?: '')));
    }

    /**
     * Get the resolved recipient contact phone for logistics and shipping.
     */
    public function getResolvedContactPhone(): string
    {
        $phone = trim((string) $this->shipping_contact_phone);
        if ($phone !== '') {
            return $phone;
        }

        return trim((string) ($this->user?->phone ?: ($this->user?->phone_number ?: '')));
    }
}
