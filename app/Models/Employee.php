<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $employee_id
 * @property string|null $name
 * @property string|null $role
 * @property float|string|null $salary
 * @property string|null $status
 * @property string|null $join_date
 * @property-read \App\Models\User|null $user
 * @property-read \App\Models\User|null $loginAccount
 */
class Employee extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    public const SCHEDULE_DEFAULT = 'default';
    public const SCHEDULE_CUSTOM = 'custom';
    public const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    protected $dates = ['deleted_at'];

    protected $fillable = [
        'user_id',
        'assigned_location_id',
        'schedule_type',
        'working_days',
        'shift_start_time',
        'shift_end_time',
        'break_window_start',
        'break_window_end',
        'break_allowance_minutes',
        'grace_period_minutes',
        'earliest_clock_in_minutes',
        'standard_workday_hours',
        'enforce_strict_shift_window',
        'allow_remote_clock_in',
        'employee_id',
        'name',
        'role',
        'salary',
        'status',
        'join_date'
    ];

    protected $casts = [
        'working_days' => 'array',
        'allow_remote_clock_in' => 'boolean',
        'enforce_strict_shift_window' => 'boolean',
        'break_allowance_minutes' => 'integer',
        'grace_period_minutes' => 'integer',
        'earliest_clock_in_minutes' => 'integer',
        'standard_workday_hours' => 'float',
    ];

    // Optional: Relationship back to the Seller
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function loginAccount()
    {
        return $this->hasOne(User::class, 'employee_id');
    }

    public function assignedLocation()
    {
        return $this->belongsTo(SellerLocation::class, 'assigned_location_id');
    }

    public function sellerLocation()
    {
        return $this->assignedLocation();
    }

    /**
     * Resolve effective working days array (e.g. ['mon', 'tue', 'wed', 'thu', 'fri']).
     *
     * @param User|null $seller
     * @return array<int, string>
     */
    public function getEffectiveWorkingDays(?User $seller = null): array
    {
        if ($this->schedule_type === self::SCHEDULE_CUSTOM && is_array($this->working_days) && !empty($this->working_days)) {
            return array_values(array_map('strtolower', $this->working_days));
        }

        $seller = $seller ?: $this->user;
        $factorMethod = (string) ($seller?->payroll_factor_method ?? 'custom');

        if ($factorMethod === '261') {
            return ['mon', 'tue', 'wed', 'thu', 'fri'];
        }

        return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    }

    /**
     * Determine if a given date is a scheduled working day for this employee.
     *
     * @param \Carbon\CarbonInterface|string $date
     * @param User|null $seller
     * @return bool
     */
    public function isScheduledWorkingDay($date, ?User $seller = null): bool
    {
        $carbonDate = is_string($date) ? \Carbon\Carbon::parse($date) : $date;
        $shortDay = strtolower($carbonDate->format('D')); // 'mon', 'tue', etc.
        $workingDays = $this->getEffectiveWorkingDays($seller);

        return in_array($shortDay, $workingDays, true);
    }

    /**
     * Determine if a given date is a rest day for this employee.
     *
     * @param \Carbon\CarbonInterface|string $date
     * @param User|null $seller
     * @return bool
     */
    public function isRestDay($date, ?User $seller = null): bool
    {
        return !$this->isScheduledWorkingDay($date, $seller);
    }

    /**
     * Resolve effective standard workday hours for overtime/undertime thresholds.
     *
     * @param User|null $seller
     * @return float
     */
    public function getEffectiveWorkdayHours(?User $seller = null): float
    {
        if ($this->schedule_type === self::SCHEDULE_CUSTOM && $this->standard_workday_hours !== null && $this->standard_workday_hours > 0) {
            return (float) $this->standard_workday_hours;
        }

        $seller = $seller ?: $this->user;
        return max((float) ($seller?->standard_workday_hours ?? 8.0), 1.0);
    }

    /**
     * Resolve complete effective shift policy dictionary for attendance enforcement and UI.
     *
     * @param User|null $seller
     * @return array<string, mixed>
     */
    public function getEffectiveShiftPolicy(?User $seller = null): array
    {
        $seller = $seller ?: $this->user;
        $isCustom = $this->schedule_type === self::SCHEDULE_CUSTOM;

        $startTime = ($isCustom && !empty($this->shift_start_time)) ? $this->shift_start_time : ($seller?->shift_start_time ?? '08:00');
        $endTime = ($isCustom && !empty($this->shift_end_time)) ? $this->shift_end_time : ($seller?->shift_end_time ?? '17:00');
        $grace = ($isCustom && $this->grace_period_minutes !== null) ? (int) $this->grace_period_minutes : (int) ($seller?->grace_period_minutes ?? 15);
        $earliest = ($isCustom && $this->earliest_clock_in_minutes !== null) ? (int) $this->earliest_clock_in_minutes : (int) ($seller?->earliest_clock_in_minutes ?? 30);
        $strict = ($isCustom && $this->enforce_strict_shift_window !== null) ? (bool) $this->enforce_strict_shift_window : (bool) ($seller?->enforce_strict_shift_window ?? true);
        $breakStart = ($isCustom && !empty($this->break_window_start)) ? $this->break_window_start : ($seller?->break_window_start ?? '11:30');
        $breakEnd = ($isCustom && !empty($this->break_window_end)) ? $this->break_window_end : ($seller?->break_window_end ?? '13:30');
        $breakAllowance = ($isCustom && $this->break_allowance_minutes !== null) ? (int) $this->break_allowance_minutes : (int) ($seller?->break_allowance_minutes ?? 60);
        $standardHours = $this->getEffectiveWorkdayHours($seller);
        $workingDays = $this->getEffectiveWorkingDays($seller);

        return [
            'schedule_type' => $this->schedule_type ?: self::SCHEDULE_DEFAULT,
            'is_custom' => $isCustom,
            'working_days' => $workingDays,
            'shift_start_time' => $startTime,
            'shift_end_time' => $endTime,
            'grace_period_minutes' => $grace,
            'earliest_clock_in_minutes' => $earliest,
            'enforce_strict_shift_window' => $strict,
            'break_window_start' => $breakStart,
            'break_window_end' => $breakEnd,
            'break_allowance_minutes' => $breakAllowance,
            'standard_workday_hours' => $standardHours,
        ];
    }
}
