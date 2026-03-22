<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SponsorshipEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'sponsorship_request_id',
        'product_id',
        'seller_id',
        'viewer_user_id',
        'session_id',
        'placement',
        'event_type',
        'event_key',
        'event_date',
        'occurred_at',
    ];

    protected $casts = [
        'event_date' => 'date',
        'occurred_at' => 'datetime',
    ];

    public function sponsorshipRequest()
    {
        return $this->belongsTo(SponsorshipRequest::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function viewer()
    {
        return $this->belongsTo(User::class, 'viewer_user_id');
    }
}
