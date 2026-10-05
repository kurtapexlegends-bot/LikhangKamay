<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReviewDispute extends Model
{
    /** @use HasFactory<\Database\Factories\ReviewDisputeFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'review_id',
        'seller_id',
        'seller_owner_id',
        'reported_by_user_id',
        'status',
        'reason',
        'explanation',
        'details',
        'resolved_at',
        'resolution_notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function review()
    {
        return $this->belongsTo(Review::class)->withTrashed();
    }

    public function sellerOwner()
    {
        return $this->belongsTo(User::class, 'seller_owner_id')->withTrashed();
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by_user_id')->withTrashed();
    }
}
