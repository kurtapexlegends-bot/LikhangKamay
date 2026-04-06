<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Builder as SchemaBuilder;
use Illuminate\Support\Facades\Schema;

class Order extends Model
{
    use HasFactory;

    protected static ?bool $supportsShippingFeeAmountColumn = null;
    protected static ?bool $supportsPlatformCommissionAmountColumn = null;
    protected static ?bool $supportsSellerNetAmountColumn = null;
    protected static ?bool $supportsWalletSettledAtColumn = null;
    protected static ?bool $supportsRefundedToWalletAtColumn = null;

    protected $fillable = [
        'artisan_id', 'user_id', 'order_number', 'customer_name', 
        'merchandise_subtotal', 'convenience_fee_amount', 'shipping_fee_amount', 'platform_commission_amount', 'seller_net_amount',
        'total_amount', 'status', 'payment_method', 'payment_status', 'paymongo_session_id', 'review_reminder_sent', 'shipment_reminder_sent', 'shipping_address', 'shipping_address_type',
        'shipping_street_address', 'shipping_barangay', 'shipping_city', 'shipping_region', 'shipping_postal_code',
        'shipping_recipient_name', 'shipping_contact_phone', 'shipping_notes', 'tracking_number', 'received_at', 'warranty_expires_at',
        'accepted_at', 'shipped_at', 'delivered_at', 'cancelled_at', 'cancellation_reason', 'shipping_method', 'proof_of_delivery',
        'return_reason', 'return_proof_image',
        'wallet_settled_at', 'refunded_to_wallet_at',
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
        'wallet_settled_at' => 'datetime',
        'refunded_to_wallet_at' => 'datetime',
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

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function delivery()
    {
        return $this->hasOne(OrderDelivery::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function (self $order) {
            foreach (static::filterSchemaCompatibleAttributes($order->attributes) as $key => $value) {
                $order->attributes[$key] = $value;
            }

            if (!static::supportsShippingFeeAmountColumn()) {
                unset($order->attributes['shipping_fee_amount']);
            }

            if (!static::supportsPlatformCommissionAmountColumn()) {
                unset($order->attributes['platform_commission_amount']);
            }

            if (!static::supportsSellerNetAmountColumn()) {
                unset($order->attributes['seller_net_amount']);
            }

            if (!static::supportsWalletSettledAtColumn()) {
                unset($order->attributes['wallet_settled_at']);
            }

            if (!static::supportsRefundedToWalletAtColumn()) {
                unset($order->attributes['refunded_to_wallet_at']);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        if (!static::supportsShippingFeeAmountColumn()) {
            unset($attributes['shipping_fee_amount']);
        }

        if (!static::supportsPlatformCommissionAmountColumn()) {
            unset($attributes['platform_commission_amount']);
        }

        if (!static::supportsSellerNetAmountColumn()) {
            unset($attributes['seller_net_amount']);
        }

        if (!static::supportsWalletSettledAtColumn()) {
            unset($attributes['wallet_settled_at']);
        }

        if (!static::supportsRefundedToWalletAtColumn()) {
            unset($attributes['refunded_to_wallet_at']);
        }

        return $attributes;
    }

    public static function supportsShippingFeeAmountColumn(): bool
    {
        if (static::$supportsShippingFeeAmountColumn !== null) {
            return static::$supportsShippingFeeAmountColumn;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$supportsShippingFeeAmountColumn = $schema->hasColumn((new static())->getTable(), 'shipping_fee_amount');
        } catch (\Throwable) {
            static::$supportsShippingFeeAmountColumn = false;
        }

        return static::$supportsShippingFeeAmountColumn;
    }

    public static function supportsPlatformCommissionAmountColumn(): bool
    {
        if (static::$supportsPlatformCommissionAmountColumn !== null) {
            return static::$supportsPlatformCommissionAmountColumn;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$supportsPlatformCommissionAmountColumn = $schema->hasColumn((new static())->getTable(), 'platform_commission_amount');
        } catch (\Throwable) {
            static::$supportsPlatformCommissionAmountColumn = false;
        }

        return static::$supportsPlatformCommissionAmountColumn;
    }

    public static function supportsSellerNetAmountColumn(): bool
    {
        if (static::$supportsSellerNetAmountColumn !== null) {
            return static::$supportsSellerNetAmountColumn;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$supportsSellerNetAmountColumn = $schema->hasColumn((new static())->getTable(), 'seller_net_amount');
        } catch (\Throwable) {
            static::$supportsSellerNetAmountColumn = false;
        }

        return static::$supportsSellerNetAmountColumn;
    }

    public static function supportsWalletSettledAtColumn(): bool
    {
        if (static::$supportsWalletSettledAtColumn !== null) {
            return static::$supportsWalletSettledAtColumn;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$supportsWalletSettledAtColumn = $schema->hasColumn((new static())->getTable(), 'wallet_settled_at');
        } catch (\Throwable) {
            static::$supportsWalletSettledAtColumn = false;
        }

        return static::$supportsWalletSettledAtColumn;
    }

    public static function supportsRefundedToWalletAtColumn(): bool
    {
        if (static::$supportsRefundedToWalletAtColumn !== null) {
            return static::$supportsRefundedToWalletAtColumn;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$supportsRefundedToWalletAtColumn = $schema->hasColumn((new static())->getTable(), 'refunded_to_wallet_at');
        } catch (\Throwable) {
            static::$supportsRefundedToWalletAtColumn = false;
        }

        return static::$supportsRefundedToWalletAtColumn;
    }

    public function getResolvedShippingFeeAmount(): float
    {
        if (static::supportsShippingFeeAmountColumn()) {
            return round((float) ($this->getAttribute('shipping_fee_amount') ?? 0), 2);
        }

        $fallback = (float) $this->total_amount - (float) $this->merchandise_subtotal - (float) $this->convenience_fee_amount;

        return round(max(0, $fallback), 2);
    }

    public function getResolvedPlatformCommissionAmount(): float
    {
        if (static::supportsPlatformCommissionAmountColumn()) {
            return round((float) ($this->getAttribute('platform_commission_amount') ?? 0), 2);
        }

        return round((float) $this->merchandise_subtotal * 0.05, 2);
    }

    public function getResolvedSellerNetAmount(): float
    {
        if (static::supportsSellerNetAmountColumn()) {
            return round((float) ($this->getAttribute('seller_net_amount') ?? 0), 2);
        }

        return round((float) $this->merchandise_subtotal - $this->getResolvedPlatformCommissionAmount(), 2);
    }
}
