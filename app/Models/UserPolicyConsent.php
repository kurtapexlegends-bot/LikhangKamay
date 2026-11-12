<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPolicyConsent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'platform_policy_id',
        'policy_type',
        'policy_version',
        'context',
        'order_id',
        'criteria_acknowledged',
        'accepted_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'criteria_acknowledged' => 'array',
        'accepted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(PlatformPolicy::class, 'platform_policy_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withTrashed();
    }
}
