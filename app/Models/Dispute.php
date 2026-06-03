<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'status',
        'reason',
        'proof_photos',
        'seller_response_type',
        'seller_explanation',
        'seller_proposed_description',
        'escalation_reason',
        'admin_notes',
        'admin_decision',
        'resolved_at',
    ];

    protected $casts = [
        'proof_photos' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
