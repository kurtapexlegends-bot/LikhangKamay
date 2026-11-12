<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VoucherRedemption extends Model
{
    use HasFactory;

    public const STATUS_REDEEMED = 'redeemed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'voucher_id',
        'user_id',
        'order_id',
        'discount_amount',
        'status',
        'redeemed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'voucher_id' => 'integer',
        'user_id' => 'integer',
        'order_id' => 'integer',
        'discount_amount' => 'decimal:2',
        'redeemed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function voucher()
    {
        return $this->belongsTo(Voucher::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function order()
    {
        return $this->belongsTo(Order::class)->withTrashed();
    }
}
