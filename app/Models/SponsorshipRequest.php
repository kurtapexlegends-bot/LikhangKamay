<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SponsorshipRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'product_id',
        'status',
        'requested_duration_days',
        'approved_at',
        'rejected_at',
        'admin_notes',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
