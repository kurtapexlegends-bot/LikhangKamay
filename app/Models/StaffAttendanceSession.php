<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $staff_user_id
 * @property int|null $seller_owner_id
 * @property int|null $employee_id
 * @property \Carbon\Carbon|null $attendance_date
 * @property \Carbon\Carbon|null $clock_in_at
 * @property \Carbon\Carbon|null $clock_out_at
 * @property \Carbon\Carbon|null $last_heartbeat_at
 * @property \Carbon\Carbon|null $last_activity_at
 * @property string|null $close_mode
 * @property string|null $close_reason
 * @property int $worked_minutes
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class StaffAttendanceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_user_id',
        'seller_owner_id',
        'employee_id',
        'attendance_date',
        'clock_in_at',
        'clock_out_at',
        'last_heartbeat_at',
        'last_activity_at',
        'close_mode',
        'close_reason',
        'worked_minutes',
        'clock_in_photo_path',
        'clock_in_latitude',
        'clock_in_longitude',
        'seller_location_id',
        'distance_meters',
        'is_within_geofence',
        'is_late',
        'late_minutes',
        'is_early_departure',
        'early_departure_reason',
        'undertime_minutes',
        'total_break_minutes',
        'is_extended_break',
        'liveness_verified',
        'is_flagged',
        'flag_reason',
        'approval_status',
        'approved_by_user_id',
        'approved_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'last_heartbeat_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'approved_at' => 'datetime',
            'worked_minutes' => 'integer',
            'clock_in_latitude' => 'float',
            'clock_in_longitude' => 'float',
            'distance_meters' => 'integer',
            'is_within_geofence' => 'boolean',
            'is_late' => 'boolean',
            'late_minutes' => 'integer',
            'is_early_departure' => 'boolean',
            'undertime_minutes' => 'integer',
            'total_break_minutes' => 'integer',
            'is_extended_break' => 'boolean',
            'liveness_verified' => 'boolean',
            'is_flagged' => 'boolean',
        ];
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function staffUser()
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function sellerOwner()
    {
        return $this->belongsTo(User::class, 'seller_owner_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function sellerLocation()
    {
        return $this->belongsTo(SellerLocation::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->clock_in_photo_path ? \Illuminate\Support\Facades\Storage::url($this->clock_in_photo_path) : null;
    }
}
