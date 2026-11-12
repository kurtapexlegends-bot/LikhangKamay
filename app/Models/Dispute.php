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
        'platform_policy_id',
        'policy_version',
        'damage_reason_code',
        'criteria_checklist',
        'photo_angles',
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
        'criteria_checklist' => 'array',
        'photo_angles' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class)->withTrashed();
    }

    public function policy()
    {
        return $this->belongsTo(PlatformPolicy::class, 'platform_policy_id');
    }
}
