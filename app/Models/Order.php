<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'artisan_id', 'user_id', 'order_number', 'customer_name', 
        'total_amount', 'status', 'payment_method', 'payment_status', 'paymongo_session_id', 'review_reminder_sent', 'shipment_reminder_sent', 'shipping_address',
        'shipping_notes', 'tracking_number', 'received_at', 'warranty_expires_at',
        'accepted_at', 'shipped_at', 'delivered_at', 'shipping_method', 'proof_of_delivery'
    ];

    // Format date automatically for frontend (e.g., "Oct 24, 2025")
    protected $casts = [
        'created_at' => 'datetime:M d, Y • h:i A',
        'received_at' => 'datetime',
        'warranty_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
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
}