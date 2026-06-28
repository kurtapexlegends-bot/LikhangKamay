<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'artisan_id', 'user_id', 'order_number', 'customer_name', 
        'merchandise_subtotal', 'convenience_fee_amount', 'shipping_fee_amount', 'platform_commission_amount', 'seller_net_amount',
        'total_amount', 'status', 'payment_method', 'payment_status', 'paymongo_session_id', 'review_reminder_sent', 'shipment_reminder_sent', 'shipping_address', 'shipping_address_type',
        'shipping_street_address', 'shipping_barangay', 'shipping_city', 'shipping_region', 'shipping_postal_code',
        'shipping_recipient_name', 'shipping_contact_phone', 'shipping_notes', 'tracking_number', 'received_at', 'warranty_expires_at',
        'accepted_at', 'shipped_at', 'delivered_at', 'cancelled_at', 'cancellation_reason', 'shipping_method', 'proof_of_delivery',
        'return_reason', 'return_proof_image',
        'replacement_resolution_description', 'replacement_started_at', 'replacement_resolved_at',
    ];

    // Format date automatically for frontend (e.g., "Oct 24, 2025")
    protected $casts = [
        'created_at' => 'datetime:M d, Y • h:i A',
        'received_at' => 'datetime',
        'warranty_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'replacement_started_at' => 'datetime',
        'replacement_resolved_at' => 'datetime',
        'merchandise_subtotal' => 'decimal:2',
        'convenience_fee_amount' => 'decimal:2',
        'shipping_fee_amount' => 'decimal:2',
        'platform_commission_amount' => 'decimal:2',
        'seller_net_amount' => 'decimal:2',
    ];

    // Relationship: Order has many Items
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Relationship: Order belongs to a Buyer
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function artisan()
    {
        return $this->belongsTo(User::class, 'artisan_id');
    }

    public function delivery()
    {
        return $this->hasOne(OrderDelivery::class);
    }

    public function dispute()
    {
        return $this->hasOne(Dispute::class);
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

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        return $attributes;
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
        return round((float) ($this->getAttribute('shipping_fee_amount') ?? 0), 2);
    }

    public function getResolvedPlatformCommissionAmount(): float
    {
        return round((float) ($this->getAttribute('platform_commission_amount') ?? 0), 2);
    }

    public function getResolvedSellerNetAmount(): float
    {
        return round((float) ($this->getAttribute('seller_net_amount') ?? 0), 2);
    }
}
