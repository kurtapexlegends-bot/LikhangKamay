<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SponsorshipRequest extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'status',
        'requested_at',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function events()
    {
        return $this->hasMany(SponsorshipEvent::class);
    }
}
