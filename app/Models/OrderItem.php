<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'product_id', 'product_name', 
        'variant', 'price', 'cost', 'quantity', 'product_img',
        'was_sponsored', 'sponsorship_request_id', 'sponsored_at_checkout',
    ];

    protected $casts = [
        'was_sponsored' => 'boolean',
        'sponsored_at_checkout' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function sponsorshipRequest()
    {
        return $this->belongsTo(SponsorshipRequest::class);
    }
}
