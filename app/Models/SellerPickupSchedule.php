<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property bool $is_enabled
 * @property array|null $operating_days
 * @property array|null $time_slots
 * @property int|null $pickup_location_id
 * @property int|null $max_advance_days
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @property-read \App\Models\SellerLocation|null $pickupLocation
 */
class SellerPickupSchedule extends Model
{
    use HasFactory;

    public const MODE_UNIFORM = 'uniform';
    public const MODE_PER_DAY = 'per_day';

    protected $fillable = [
        'user_id',
        'is_enabled',
        'schedule_mode',
        'operating_days',
        'time_slots',
        'daily_time_slots',
        'pickup_location_id',
        'max_advance_days',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'schedule_mode' => 'string',
        'operating_days' => 'array',
        'time_slots' => 'array',
        'daily_time_slots' => 'array',
        'pickup_location_id' => 'integer',
        'max_advance_days' => 'integer',
    ];

    protected $attributes = [
        'is_enabled' => true,
    ];

    /**
     * Default operating days: Monday through Saturday (1 to 6).
     */
    public const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5, 6];

    /**
     * Default time slot windows.
     */
    public const DEFAULT_TIME_SLOTS = [
        [
            'id' => 'slot_morning',
            'label' => '09:00 AM - 12:00 PM',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'max_capacity' => 5,
        ],
        [
            'id' => 'slot_afternoon',
            'label' => '01:00 PM - 05:00 PM',
            'start_time' => '13:00',
            'end_time' => '17:00',
            'max_capacity' => 5,
        ],
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function pickupLocation(): BelongsTo
    {
        return $this->belongsTo(SellerLocation::class, 'pickup_location_id');
    }

    /**
     * Check if schedule is configured per day of the week.
     */
    public function isPerDayMode(): bool
    {
        return ($this->schedule_mode ?? self::MODE_UNIFORM) === self::MODE_PER_DAY;
    }

    /**
     * Determine if store pickup is active on a specific ISO day of the week (1=Mon ... 7=Sun).
     */
    public function isOperatingOnDay(int $isoDayOfWeek): bool
    {
        if (!$this->is_enabled) {
            return false;
        }

        if ($this->isPerDayMode() && is_array($this->daily_time_slots)) {
            $key = (string) $isoDayOfWeek;
            $dayConfig = $this->daily_time_slots[$key] ?? null;

            if (is_array($dayConfig)) {
                if (isset($dayConfig['is_open'])) {
                    return (bool) $dayConfig['is_open'] && !empty($dayConfig['slots'] ?? []);
                }
                return !empty($dayConfig);
            }

            return false;
        }

        return in_array($isoDayOfWeek, $this->getEffectiveOperatingDays(), true);
    }

    /**
     * Get configured operating days or system defaults.
     *
     * @return array<int>
     */
    public function getEffectiveOperatingDays(): array
    {
        if ($this->isPerDayMode() && is_array($this->daily_time_slots)) {
            $activeDays = [];
            for ($day = 1; $day <= 7; $day++) {
                if ($this->isOperatingOnDay($day)) {
                    $activeDays[] = $day;
                }
            }
            return $activeDays;
        }

        if (is_array($this->operating_days) && !empty($this->operating_days)) {
            return array_values(array_map('intval', $this->operating_days));
        }

        return self::DEFAULT_OPERATING_DAYS;
    }

    /**
     * Get configured time slots or system defaults.
     *
     * @return array<array<string, mixed>>
     */
    public function getEffectiveTimeSlots(): array
    {
        if (is_array($this->time_slots) && !empty($this->time_slots)) {
            return $this->time_slots;
        }

        return self::DEFAULT_TIME_SLOTS;
    }

    /**
     * Get effective time slots for a specific ISO day of the week (1=Mon ... 7=Sun).
     *
     * @return array<array<string, mixed>>
     */
    public function getEffectiveTimeSlotsForDay(int $isoDayOfWeek): array
    {
        if ($this->isPerDayMode() && is_array($this->daily_time_slots)) {
            $key = (string) $isoDayOfWeek;
            $dayConfig = $this->daily_time_slots[$key] ?? null;

            if (is_array($dayConfig)) {
                if (isset($dayConfig['slots']) && is_array($dayConfig['slots'])) {
                    return ($dayConfig['is_open'] ?? true) ? $dayConfig['slots'] : [];
                }
                return $dayConfig;
            }

            return [];
        }

        return $this->getEffectiveTimeSlots();
    }
}
