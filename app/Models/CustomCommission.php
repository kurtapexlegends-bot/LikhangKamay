<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CustomCommission extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_AWAITING_DEPOSIT = 'awaiting_deposit';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_READY_FOR_BALANCE = 'ready_for_balance';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'artisan_id',
        'buyer_id',
        'order_id',
        'commission_number',
        'title',
        'description',
        'total_amount',
        'deposit_amount',
        'balance_amount',
        'deposit_percentage',
        'status',
        'deposit_payment_method',
        'deposit_payment_id',
        'deposit_paid_at',
        'balance_payment_method',
        'balance_payment_id',
        'balance_paid_at',
        'paymongo_deposit_session_id',
        'paymongo_balance_session_id',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'deposit_percentage' => 'decimal:2',
        'deposit_paid_at' => 'datetime',
        'balance_paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function artisan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'artisan_id')->withTrashed();
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id')->withTrashed();
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'commission_id');
    }

    public function isAwaitingDeposit(): bool
    {
        return $this->status === self::STATUS_AWAITING_DEPOSIT;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isReadyForBalance(): bool
    {
        return $this->status === self::STATUS_READY_FOR_BALANCE;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public static function generateCommissionNumber(): string
    {
        return 'CMS-' . date('Ymd') . '-' . strtoupper(Str::random(6));
    }
}
