<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderDelivery extends Model
{
    use HasFactory;

    public const PROVIDER_LALAMOVE = 'lalamove';

    public const STATUS_ASSIGNING_DRIVER = 'ASSIGNING_DRIVER';
    public const STATUS_ON_GOING = 'ON_GOING';
    public const STATUS_PICKED_UP = 'PICKED_UP';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_CANCELED = 'CANCELED';
    public const STATUS_REJECTED = 'REJECTED';
    public const STATUS_EXPIRED = 'EXPIRED';

    protected $fillable = [
        'order_id',
        'provider',
        'status',
        'service_type',
        'quotation_id',
        'external_order_id',
        'request_id',
        'share_link',
        'price_currency',
        'price_total',
        'price_breakdown',
        'quotation_payload',
        'order_payload',
        'latest_payload',
        'last_webhook_type',
        'last_webhook_received_at',
        'terminal_failed_at',
        'auto_cancelled_at',
        'failure_reason',
        'is_pod_enabled',
    ];

    protected $casts = [
        'price_breakdown' => 'array',
        'quotation_payload' => 'array',
        'order_payload' => 'array',
        'latest_payload' => 'array',
        'last_webhook_received_at' => 'datetime',
        'terminal_failed_at' => 'datetime',
        'auto_cancelled_at' => 'datetime',
        'is_pod_enabled' => 'boolean',
        'price_total' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function events()
    {
        return $this->hasMany(OrderDeliveryEvent::class);
    }

    public function isTerminalFailure(): bool
    {
        return in_array(strtoupper((string) $this->status), [
            self::STATUS_CANCELED,
            self::STATUS_REJECTED,
            self::STATUS_EXPIRED,
        ], true);
    }
}
