<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderDeliveryEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_delivery_id',
        'provider',
        'event_key',
        'event_type',
        'external_order_id',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function delivery()
    {
        return $this->belongsTo(OrderDelivery::class, 'order_delivery_id');
    }
}
