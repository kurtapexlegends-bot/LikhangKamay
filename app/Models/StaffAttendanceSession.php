<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'close_mode',
        'close_reason',
        'worked_minutes',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'last_heartbeat_at' => 'datetime',
            'worked_minutes' => 'integer',
        ];
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
}
