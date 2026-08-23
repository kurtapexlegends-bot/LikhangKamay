<?php

namespace App\Services;

use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Models\Employee;
use App\Mail\StaffClockInOtpMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class StaffAttendanceService
{
    public const MODE_PAUSED = 'paused';
    public const MODE_CLOCKED_OUT = 'clocked_out';
    public const CLOSE_REASON_MANUAL_PAUSE = 'manual_pause';
    public const CLOSE_REASON_MANUAL_CLOCK_OUT = 'manual_clock_out';
    public const CLOSE_REASON_INACTIVITY_TIMEOUT = 'inactivity_timeout';
    public const HEARTBEAT_INTERVAL_SECONDS = 60;
    public const INACTIVITY_TIMEOUT_MINUTES = 10;
    private const STANDARD_WORKDAY_MINUTES = 480;

    public function ensureClockedIn(User $staff, array $payload = []): ?StaffAttendanceSession
    {
        if (!$staff->isStaff()) {
            return null;
        }

        if ($staff->isSuspended()) {
            throw ValidationException::withMessages([
                'attendance' => "Your staff access is temporarily paused until " . $staff->suspended_until->format('M d, Y') . " due to: " . ($staff->suspension_reason ?: 'Policy review') . ".",
            ]);
        }

        $openSession = $this->getOpenSession($staff);

        if ($openSession) {
            return $openSession;
        }

        $now = $this->now();
        $photoPath = null;

        // Process Base64 selfie photo if provided
        if (!empty($payload['photo_data']) && is_string($payload['photo_data'])) {
            try {
                $photoData = $payload['photo_data'];
                if (preg_match('/^data:image\/(\w+);base64,/', $photoData, $type)) {
                    $photoData = substr($photoData, strpos($photoData, ',') + 1);
                    $type = strtolower($type[1]); // jpg, png, etc.
                    $photoData = base64_decode($photoData);

                    if ($photoData !== false) {
                        $fileName = 'attendance/selfies/' . date('Y/m') . '/selfie_' . $staff->id . '_' . time() . '.' . ($type === 'png' ? 'png' : 'jpg');
                        \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $photoData);
                        $photoPath = $fileName;
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed saving clock-in selfie: ' . $e->getMessage());
            }
        }

        // GPS Geofencing Check
        $lat = isset($payload['latitude']) ? (float) $payload['latitude'] : null;
        $lng = isset($payload['longitude']) ? (float) $payload['longitude'] : null;
        $sellerLocation = null;
        $sellerLocationId = null;
        $distanceMeters = null;
        $isWithinGeofence = true;

        if ($lat !== null && $lng !== null) {
            $staff->loadMissing('employee.assignedLocation');
            $sellerLocation = $staff->employee?->assignedLocation;

            if (!$sellerLocation) {
                // Fallback to seller owner's first active location
                $sellerLocation = \App\Models\SellerLocation::where('user_id', $staff->getEffectiveSellerId())
                    ->where('is_active', true)
                    ->first();
            }

            if ($sellerLocation && $sellerLocation->latitude && $sellerLocation->longitude) {
                $sellerLocationId = $sellerLocation->id;
                $distanceMeters = $this->calculateDistanceMeters(
                    $lat,
                    $lng,
                    (float) $sellerLocation->latitude,
                    (float) $sellerLocation->longitude
                );
                $allowedRadius = (int) ($sellerLocation->radius_meters ?: 200);
                $isWithinGeofence = ($distanceMeters <= $allowedRadius);
                $isRemoteWorker = (bool) ($staff->employee?->allow_remote_clock_in ?? false);

                if (!$isWithinGeofence && !$isRemoteWorker && $sellerLocation->enforce_strict_geofence) {
                    throw ValidationException::withMessages([
                        'location' => [
                            "Clock-in blocked: You are {$distanceMeters}m away from {$sellerLocation->name}. Strict geofence enforcement requires you to be within {$allowedRadius}m."
                        ],
                    ]);
                }
            }
        }

        if (!empty($payload['otp_code'])) {
            $cacheKey = 'staff_clockin_otp:' . $staff->id;
            $cachedData = Cache::get($cacheKey);

            if (!$cachedData || trim((string)$payload['otp_code']) !== (string)($cachedData['code'] ?? '')) {
                throw ValidationException::withMessages([
                    'otp_code' => ['Invalid or expired verification OTP. Please request a new code.'],
                ]);
            }

            // Invalidate OTP on successful verification so it cannot be reused
            Cache::forget($cacheKey);
        } elseif (!empty($payload['workplace_pin'])) {
            $staff->loadMissing('employee.assignedLocation');
            $targetLocation = $staff->employee?->assignedLocation ?: \App\Models\SellerLocation::where('user_id', $staff->getEffectiveSellerId())->where('is_active', true)->first();
            $expectedPin = $targetLocation?->getOrGenerateDailyPin();

            if ($expectedPin && trim((string)$payload['workplace_pin']) !== trim((string)$expectedPin)) {
                throw ValidationException::withMessages([
                    'workplace_pin' => ['Invalid 4-digit Workplace Daily PIN. Please check with your workplace manager.'],
                ]);
            }
        }

        $staff->loadMissing('employee');
        $sellerOwner = User::find($staff->getEffectiveSellerId());
        $employee = $staff->employee;
        $shiftPolicy = $employee 
            ? $employee->getEffectiveShiftPolicy($sellerOwner) 
            : [
                'shift_start_time' => $sellerOwner?->shift_start_time ?? '08:00',
                'shift_end_time' => $sellerOwner?->shift_end_time ?? '17:00',
                'grace_period_minutes' => (int) ($sellerOwner?->grace_period_minutes ?? 15),
                'earliest_clock_in_minutes' => (int) ($sellerOwner?->earliest_clock_in_minutes ?? 30),
                'enforce_strict_shift_window' => (bool) ($sellerOwner?->enforce_strict_shift_window ?? true),
                'break_allowance_minutes' => (int) ($sellerOwner?->break_allowance_minutes ?? 60),
                'working_days' => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
            ];

        // Shift schedule & Operating window evaluation
        $isLate = false;
        $lateMinutes = 0;
        $isOutOfShiftWindow = false;
        $outOfShiftReason = null;

        $isRestDay = $employee ? $employee->isRestDay($now, $sellerOwner) : false;

        if (!empty($shiftPolicy['shift_start_time'])) {
            try {
                $shiftStart = Carbon::parse($now->toDateString() . ' ' . $shiftPolicy['shift_start_time'], config('app.timezone'));
                $earliestBuffer = (int) ($shiftPolicy['earliest_clock_in_minutes'] ?? 30);
                $earliestAllowed = $shiftStart->copy()->subMinutes($earliestBuffer);
                $graceThreshold = $shiftStart->copy()->addMinutes((int) ($shiftPolicy['grace_period_minutes'] ?? 15));

                $shiftEnd = !empty($shiftPolicy['shift_end_time'])
                    ? Carbon::parse($now->toDateString() . ' ' . $shiftPolicy['shift_end_time'], config('app.timezone'))
                    : $shiftStart->copy()->addHours(9);
                $latestAllowed = $shiftEnd->copy()->addMinutes(60);

                // 1. Check if too early (e.g. attempting to clock in before earliest allowed entry)
                if ($now->lt($earliestAllowed)) {
                    $minutesEarly = (int) $now->diffInMinutes($shiftStart);
                    if ($shiftPolicy['enforce_strict_shift_window'] ?? true) {
                        $earliestFormatted = $earliestAllowed->format('h:i A');
                        $shiftStartFormatted = $shiftStart->format('h:i A');
                        throw ValidationException::withMessages([
                            'shift' => ["Workshop is closed. Earliest allowed clock-in for your {$shiftStartFormatted} shift is {$earliestFormatted}."],
                        ]);
                    }

                    $isOutOfShiftWindow = true;
                    $outOfShiftReason = "Early Clock In ({$minutesEarly}m before shift start)";
                }
                // 2. Check if too late after closing hours
                elseif ($now->gt($latestAllowed)) {
                    $minutesAfter = (int) $shiftEnd->diffInMinutes($now);
                    if ($shiftPolicy['enforce_strict_shift_window'] ?? true) {
                        $shiftEndFormatted = $shiftEnd->format('h:i A');
                        throw ValidationException::withMessages([
                            'shift' => ["Workshop is closed. Shift ended at {$shiftEndFormatted}."],
                        ]);
                    }

                    $isOutOfShiftWindow = true;
                    $outOfShiftReason = "After-Hours Clock In ({$minutesAfter}m after shift end)";
                }
                // 3. Normal shift window tardiness check
                elseif ($now->gt($graceThreshold)) {
                    $isLate = true;
                    $lateMinutes = (int) $shiftStart->diffInMinutes($now);
                }

                // 4. Rest day flag (if employee is working on their scheduled rest day, flag for manager review)
                if ($isRestDay && !$isOutOfShiftWindow) {
                    $isOutOfShiftWindow = true;
                    $outOfShiftReason = "Rest Day Clock In";
                }
            } catch (ValidationException $valEx) {
                throw $valEx;
            } catch (\Throwable $e) {
                // Ignore parsing errors and fallback
            }
        }

        // Break duration evaluation if resuming from pause
        $latestSession = $this->getLatestSession($staff);
        $totalBreakMinutes = 0;
        $isExtendedBreak = false;
        if ($latestSession && $latestSession->close_mode === self::MODE_PAUSED && $latestSession->clock_out_at) {
            $totalBreakMinutes = (int) $latestSession->clock_out_at->diffInMinutes($now);
            $breakAllowance = (int) ($shiftPolicy['break_allowance_minutes'] ?? ($sellerOwner?->break_allowance_minutes ?? 60));
            if ($breakAllowance > 0 && $totalBreakMinutes > $breakAllowance) {
                $isExtendedBreak = true;
            }
        }

        $livenessVerified = !empty($payload['liveness_verified']) || !empty($photoPath);

        $isRemoteWorker = (bool) ($staff->employee?->allow_remote_clock_in ?? false);
        $isGeofenceViolation = !$isWithinGeofence && !$isRemoteWorker;

        $isFlagged = $isGeofenceViolation || $isOutOfShiftWindow;
        $flagReasons = [];
        if ($isGeofenceViolation) {
            $flagReasons[] = "Off-Site Clock In ({$distanceMeters}m from assigned workplace)";
        }
        if ($isOutOfShiftWindow && $outOfShiftReason) {
            $flagReasons[] = $outOfShiftReason;
        }
        $flagReason = !empty($flagReasons) ? implode(' • ', $flagReasons) : null;
        $approvalStatus = $isFlagged ? 'pending' : 'approved';

        $session = StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $staff->getEffectiveSellerId(),
            'employee_id' => $staff->employee_id,
            'attendance_date' => $now->toDateString(),
            'clock_in_at' => $now,
            'last_heartbeat_at' => $now,
            'last_activity_at' => $now,
            'worked_minutes' => 0,
            'clock_in_photo_path' => $photoPath,
            'clock_in_latitude' => $lat,
            'clock_in_longitude' => $lng,
            'seller_location_id' => $sellerLocationId,
            'distance_meters' => $distanceMeters,
            'is_within_geofence' => $isWithinGeofence,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'total_break_minutes' => $totalBreakMinutes,
            'is_extended_break' => $isExtendedBreak,
            'liveness_verified' => $livenessVerified,
            'is_flagged' => $isFlagged,
            'flag_reason' => $flagReason,
            'approval_status' => $approvalStatus,
        ]);

        if ($isFlagged && $sellerLocation) {
            try {
                $sellerOwner = User::find($staff->getEffectiveSellerId());
                if ($sellerOwner) {
                    $url = route('hr.employees.time-card', ['employee' => $staff->employee_id ?: $staff->id]);
                    $sellerOwner->notify(new \App\Notifications\OffSiteClockInNotification(
                        $session,
                        $staff->name,
                        $sellerLocation->name,
                        (int) $distanceMeters,
                        $url
                    ));
                }
            } catch (\Throwable $e) {
                // Prevent notification failure from blocking session creation
            }
        }

        return $session;
    }

    public function approveSession(StaffAttendanceSession $session, User $manager): StaffAttendanceSession
    {
        $session->update([
            'approval_status' => 'approved',
            'approved_by_user_id' => $manager->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return $session;
    }

    public function rejectSession(StaffAttendanceSession $session, User $manager, ?string $reason = null): StaffAttendanceSession
    {
        $session->update([
            'approval_status' => 'rejected',
            'approved_by_user_id' => $manager->id,
            'approved_at' => now(),
            'rejection_reason' => $reason ?: 'Rejected by manager',
        ]);

        return $session;
    }

    public function calculateDistanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return (int) round($earthRadius * $c);
    }

    public function closeOpenSession(
        User $staff,
        string $mode,
        ?string $reason = null,
        ?CarbonInterface $closedAt = null
    ): ?StaffAttendanceSession
    {
        if (!$staff->isStaff()) {
            return null;
        }

        if (!in_array($mode, [self::MODE_PAUSED, self::MODE_CLOCKED_OUT], true)) {
            throw new \InvalidArgumentException('Unsupported attendance close mode.');
        }

        $openSession = $this->getOpenSession($staff);

        if (!$openSession) {
            return null;
        }

        $now = $closedAt ? Carbon::parse($closedAt) : $this->now();
        $workedMinutes = max(0, $openSession->clock_in_at->diffInMinutes($now));
        $resolvedReason = $reason ?: $this->defaultCloseReasonFor($mode);

        $isEarlyDeparture = false;
        $undertimeMinutes = 0;
        $earlyDepartureReason = null;

        if ($mode === self::MODE_CLOCKED_OUT) {
            $staff->loadMissing('employee');
            $sellerOwner = User::find($staff->getEffectiveSellerId());
            $shiftPolicy = $staff->employee 
                ? $staff->employee->getEffectiveShiftPolicy($sellerOwner) 
                : [
                    'shift_start_time' => $sellerOwner?->shift_start_time ?? '08:00',
                    'shift_end_time' => $sellerOwner?->shift_end_time ?? '17:00',
                ];

            if (!empty($shiftPolicy['shift_end_time']) && $openSession->clock_in_at) {
                try {
                    $shiftDateStr = $openSession->clock_in_at->toDateString();
                    $shiftStart = Carbon::parse($shiftDateStr . ' ' . ($shiftPolicy['shift_start_time'] ?? '08:00'), config('app.timezone'));
                    $shiftEnd = Carbon::parse($shiftDateStr . ' ' . $shiftPolicy['shift_end_time'], config('app.timezone'));

                    // Only count as early departure if leaving before shift end during the workday
                    if ($now->gte($shiftStart->copy()->subHours(2)) && $now->lt($shiftEnd)) {
                        $isEarlyDeparture = true;
                        $undertimeMinutes = (int) $now->diffInMinutes($shiftEnd);
                        $earlyDepartureReason = $reason ?: 'Early Departure';
                    }
                } catch (\Throwable $e) {
                    // Safe fallback
                }
            }
        }

        $openSession->update([
            'clock_out_at' => $now,
            'last_heartbeat_at' => $openSession->last_heartbeat_at ?: $now,
            'close_mode' => $mode,
            'close_reason' => $resolvedReason,
            'worked_minutes' => $workedMinutes,
            'is_early_departure' => $isEarlyDeparture,
            'early_departure_reason' => $earlyDepartureReason,
            'undertime_minutes' => $undertimeMinutes,
        ]);

        return $openSession->fresh();
    }

    public function touchHeartbeat(User $staff): ?StaffAttendanceSession
    {
        if (!$staff->isStaff()) {
            return null;
        }

        $openSession = $this->getOpenSession($staff);

        if (!$openSession) {
            return null;
        }

        $openSession->forceFill([
            'last_heartbeat_at' => $this->now(),
        ])->save();

        return $openSession->fresh();
    }

    public function requiresResumePrompt(User $staff): bool
    {
        if (!$staff->isStaff()) {
            return false;
        }

        if ($this->getOpenSession($staff)) {
            return false;
        }

        $latestSession = $this->getLatestSession($staff);

        return $latestSession && $latestSession->close_mode === self::MODE_PAUSED;
    }

    /**
     * @return array<string, mixed>
     */
    public function buildResumeContext(User $staff): array
    {
        $latestSession = $this->getLatestSession($staff);
        $workedMinutes = $latestSession ? $this->resolveWorkedMinutes($latestSession) : 0;

        return [
            'requires_resume' => $this->requiresResumePrompt($staff),
            'timeout_minutes' => self::INACTIVITY_TIMEOUT_MINUTES,
            'heartbeat_interval_seconds' => self::HEARTBEAT_INTERVAL_SECONDS,
            'attendance_date' => $latestSession?->attendance_date?->toDateString(),
            'clock_in_at' => $latestSession?->clock_in_at?->toIso8601String(),
            'timed_out_at' => $latestSession?->clock_out_at?->toIso8601String(),
            'worked_minutes' => $workedMinutes,
            'worked_hours_label' => $this->formatWorkedHoursLabel($workedMinutes),
            'close_reason' => $latestSession?->close_reason,
        ];
    }

    public function autoPauseInactiveSessions(?CarbonInterface $referenceTime = null): int
    {
        $now = $referenceTime ? Carbon::parse($referenceTime) : $this->now();
        $timeoutMinutes = 120; // 2 hours of absolute silence

        $sessions = StaffAttendanceSession::query()
            ->whereNull('clock_out_at')
            ->get();

        $closedCount = 0;

        foreach ($sessions as $session) {
            $lastSignOfLife = $session->clock_in_at;
            if ($session->last_heartbeat_at && $session->last_heartbeat_at->gt($lastSignOfLife)) {
                $lastSignOfLife = $session->last_heartbeat_at;
            }
            if ($session->last_activity_at && $session->last_activity_at->gt($lastSignOfLife)) {
                $lastSignOfLife = $session->last_activity_at;
            }

            $minutesSilent = $lastSignOfLife->diffInMinutes($now);
            $isPastDay = $session->attendance_date->lt($now->toDateString());

            if ($minutesSilent >= $timeoutMinutes || ($isPastDay && $minutesSilent >= 60)) {
                // Retroactively cap at last sign of life + 15 minutes
                $closedAt = $lastSignOfLife->copy()->addMinutes(15);
                if ($closedAt->gt($now)) {
                    $closedAt = $now->copy();
                }

                $workedMinutes = max(0, $session->clock_in_at->diffInMinutes($closedAt));

                $session->update([
                    'clock_out_at' => $closedAt,
                    'last_heartbeat_at' => $session->last_heartbeat_at && $session->last_heartbeat_at->gt($closedAt) ? $session->last_heartbeat_at : $closedAt,
                    'last_activity_at' => $session->last_activity_at && $session->last_activity_at->gt($closedAt) ? $session->last_activity_at : $closedAt,
                    'close_mode' => self::MODE_PAUSED,
                    'close_reason' => self::CLOSE_REASON_INACTIVITY_TIMEOUT,
                    'worked_minutes' => $workedMinutes,
                ]);

                $closedCount++;
            }
        }

        return $closedCount;
    }

    public function getOpenSession(User $staff): ?StaffAttendanceSession
    {
        return StaffAttendanceSession::query()
            ->where("staff_user_id", $staff->id)
            ->whereNull('clock_out_at')
            ->latest("clock_in_at")
            ->first();
    }

    public function getLatestSession(User $staff): ?StaffAttendanceSession
    {
        return StaffAttendanceSession::query()
            ->where("staff_user_id", $staff->id)
            ->latest("clock_in_at")
            ->first();
    }

    /**
     * @param  Collection<int, \App\Models\Employee>  $employees
     * @return array<int, array<string, mixed>>
     */
    public function buildEmployeeMonthlySummaries(Collection $employees, User $seller, ?CarbonInterface $month = null): array
    {
        $this->autoPauseInactiveSessions();

        $period = $this->resolveMonth($month);
        $today = $this->now()->toDateString();
        $workingDays = (int) ($seller->payroll_working_days ?? 22);
        $employeeIds = $employees->pluck("id")->filter()->values();

        $sessions = $employeeIds->isEmpty()
            ? collect()
            : StaffAttendanceSession::query()
                ->where("seller_owner_id", $seller->id)
                ->whereIn("employee_id", $employeeIds)
                ->whereBetween('attendance_date', [$period->copy()->startOfMonth()->toDateString(), $period->copy()->endOfMonth()->toDateString()])
                ->orderBy("clock_in_at")
                ->get();

        $sessionsByEmployee = $sessions->groupBy("employee_id");

        return $employees->mapWithKeys(function ($employee) use ($sessionsByEmployee, $today, $workingDays, $period, $seller) {
            return [
                $employee->id => $this->buildEmployeeSummary(
                    $employee,
                    $sessionsByEmployee->get($employee->id, collect()),
                    $today,
                    $workingDays,
                    $period,
                    $seller
                )
            ];
        })->all();
    }

    /**
     * @param \App\Models\Employee $employee
     * @param Collection<int, StaffAttendanceSession> $employeeSessions
     * @return array<string, mixed>
     */
    private function buildEmployeeSummary($employee, Collection $employeeSessions, string $today, int $workingDays, CarbonInterface $period, User $seller): array
    {
        $latestSession = $employeeSessions->last();
        $todaySessions = $employeeSessions->filter(function (StaffAttendanceSession $session) use ($today) {
            return $session->attendance_date?->toDateString() === $today;
        });
        
        $todayFirstClockIn = $todaySessions
            ->sortBy('clock_in_at')
            ->first()?->clock_in_at;

        $dailyMinutes = $employeeSessions
            ->groupBy(fn (StaffAttendanceSession $session) => $session->attendance_date?->toDateString())
            ->map(function (Collection $sessionsForDay) {
                return $sessionsForDay->sum(function (StaffAttendanceSession $session) {
                    return $this->resolveWorkedMinutes($session);
                });
            });

        $daysWorked = $dailyMinutes->filter(fn ($minutes) => $minutes > 0)->count();
        $standardWorkdayMinutes = (int) ((float) $employee->getEffectiveWorkdayHours($seller) * 60);

        $undertimeMinutes = $dailyMinutes
            ->filter(fn ($minutes) => $minutes > 0)
            ->map(fn ($minutes) => max(0, $standardWorkdayMinutes - $minutes))
            ->sum();
        $overtimeMinutes = $dailyMinutes
            ->filter(fn ($minutes) => $minutes > 0)
            ->map(fn ($minutes) => max(0, $minutes - $standardWorkdayMinutes))
            ->sum();
        
        $calendarDays = [];
        $cursor = $period->copy()->startOfMonth();
        $periodEnd = $period->copy()->endOfMonth();
        $sessionsByDate = $employeeSessions->groupBy(fn (StaffAttendanceSession $session) => $session->attendance_date?->toDateString());

        while ($cursor->lte($periodEnd)) {
            $dateKey = $cursor->toDateString();
            $workedMinutes = (int) ($dailyMinutes->get($dateKey, 0) ?? 0);
            $daySessions = $sessionsByDate->get($dateKey, collect());

            $firstSession = $daySessions->first();
            $lastSession = $daySessions->last();

            $calendarDays[] = [
                'date' => $dateKey,
                'day_number' => (int) $cursor->format('j'),
                'weekday_short' => $cursor->format('D'),
                'weekday_index' => (int) $cursor->dayOfWeek,
                'worked_minutes' => $workedMinutes,
                'worked_hours_decimal' => round($workedMinutes / 60, 2),
                'worked_hours_label' => $this->formatWorkedHoursLabel($workedMinutes),
                'has_hours' => $workedMinutes > 0,
                'is_today' => $dateKey === $today,
                'is_scheduled_workday' => $employee->isScheduledWorkingDay($cursor, $seller),
                'is_rest_day' => $employee->isRestDay($cursor, $seller),
                'is_late' => (bool) $daySessions->contains('is_late', true),
                'late_minutes' => (int) $daySessions->sum('late_minutes'),
                'is_early_departure' => (bool) $daySessions->contains('is_early_departure', true),
                'early_departure_reason' => $daySessions->where('is_early_departure', true)->pluck('early_departure_reason')->first(),
                'undertime_minutes' => (int) $daySessions->sum('undertime_minutes'),
                'total_break_minutes' => (int) $daySessions->sum('total_break_minutes'),
                'is_extended_break' => (bool) $daySessions->contains('is_extended_break', true),
                'photo_url' => $daySessions->firstWhere('clock_in_photo_path', '!=', null)?->photo_url,
                'clock_in_time' => $firstSession?->clock_in_at?->format('h:i A'),
                'clock_out_time' => $lastSession?->clock_out_at?->format('h:i A'),
                'sessions_count' => $daySessions->count(),
            ];

            $cursor->addDay();
        }

        $hasLinkedStaffLogin = (bool) optional($employee->loginAccount)->id;
        $latestAction = null;
        $currentState = 'manual';

        if ($hasLinkedStaffLogin) {
            if ($latestSession && !$latestSession->clock_out_at) {
                $latestAction = 'Clocked in';
                $currentState = 'clocked_in';
            } elseif ($latestSession?->close_mode === self::MODE_PAUSED) {
                $latestAction = 'Paused';
                $currentState = 'paused';
            } elseif ($latestSession?->close_mode === self::MODE_CLOCKED_OUT) {
                $latestAction = 'Clocked out';
                $currentState = 'clocked_out';
            } else {
                $latestAction = 'No attendance yet';
                $currentState = 'no_record';
            }
        }

        return [
            'current_state' => $currentState,
            'latest_action' => $latestAction,
            'today_first_clock_in' => $todayFirstClockIn ? Carbon::parse($todayFirstClockIn)->toIso8601String() : null,
            'days_worked' => $daysWorked,
            'attended_days' => $daysWorked,
            'absences_days' => $hasLinkedStaffLogin ? max(0, $workingDays - $daysWorked) : 0,
            'undertime_hours' => round($undertimeMinutes / 60, 2),
            'overtime_hours' => round($overtimeMinutes / 60, 2),
            'worked_minutes' => (int) $dailyMinutes->sum(),
            'has_attendance_source' => $hasLinkedStaffLogin,
            'open_session' => $latestSession && !$latestSession->clock_out_at,
            'month_label' => $period->format('F Y'),
            'calendar_days' => $calendarDays,
            'effective_shift_policy' => $employee->getEffectiveShiftPolicy($seller),
            'schedule_type' => $employee->schedule_type ?: 'default',
            'working_days' => $employee->getEffectiveWorkingDays($seller),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildLogoutContext(User $staff): array
    {
        $openSession = $this->getOpenSession($staff);
        $latestSession = $openSession ?: $this->getLatestSession($staff);
        $currentState = 'no_record';
        $todaySessions = $this->getTodaySessions($staff);
        $todayFirstClockIn = $todaySessions
            ->sortBy("clock_in_at")
            ->first()?->clock_in_at;
        $todayWorkedMinutes = $todaySessions->sum(function (StaffAttendanceSession $session) {
            return $this->resolveWorkedMinutes($session);
        });
        $todayCompletedWorkedSeconds = $todaySessions
            ->filter(fn (StaffAttendanceSession $session) => (bool) $session->clock_out_at)
            ->sum(fn (StaffAttendanceSession $session) => max(0, (int) $session->worked_minutes) * 60);

        if ($openSession) {
            $currentState = 'clocked_in';
        } elseif ($latestSession?->close_mode === self::MODE_PAUSED) {
            $currentState = 'paused';
        } elseif ($latestSession?->close_mode === self::MODE_CLOCKED_OUT) {
            $currentState = 'clocked_out';
        }

        $staff->loadMissing('employee.assignedLocation');
        $assignedLocation = $staff->employee?->assignedLocation;
        if (!$assignedLocation) {
            $assignedLocation = \App\Models\SellerLocation::where('user_id', $staff->getEffectiveSellerId())
                ->where('is_active', true)
                ->first();
        }

        $sellerOwner = User::find($staff->getEffectiveSellerId());
        $employee = $staff->employee;
        $shiftPolicy = $employee 
            ? $employee->getEffectiveShiftPolicy($sellerOwner) 
            : [
                'schedule_type' => 'default',
                'is_custom' => false,
                'working_days' => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
                'shift_start_time' => $sellerOwner->shift_start_time ?? '08:00',
                'shift_end_time' => $sellerOwner->shift_end_time ?? '17:00',
                'grace_period_minutes' => (int) ($sellerOwner->grace_period_minutes ?? 15),
                'earliest_clock_in_minutes' => (int) ($sellerOwner->earliest_clock_in_minutes ?? 30),
                'enforce_strict_shift_window' => (bool) ($sellerOwner->enforce_strict_shift_window ?? true),
                'break_window_start' => $sellerOwner->break_window_start ?? '11:30',
                'break_window_end' => $sellerOwner->break_window_end ?? '13:30',
                'break_allowance_minutes' => (int) ($sellerOwner->break_allowance_minutes ?? 60),
                'standard_workday_hours' => (float) ($sellerOwner->standard_workday_hours ?? 8.0),
            ];

        $shiftPolicy['is_today_scheduled_workday'] = $employee ? $employee->isScheduledWorkingDay($this->now(), $sellerOwner) : true;
        $shiftPolicy['is_today_rest_day'] = $employee ? $employee->isRestDay($this->now(), $sellerOwner) : false;

        return [
            'has_open_session' => (bool) $openSession,
            'clock_in_at' => $openSession?->clock_in_at?->toIso8601String(),
            'attendance_date' => $openSession?->attendance_date?->toDateString(),
            'current_state' => $currentState,
            'latest_action_at' => $latestSession?->clock_out_at?->toIso8601String(),
            'today_first_clock_in' => $todayFirstClockIn?->toIso8601String(),
            'today_worked_minutes' => $todayWorkedMinutes,
            'today_worked_seconds_base' => $todayCompletedWorkedSeconds,
            'active_session_started_at' => $openSession?->clock_in_at?->toIso8601String(),
            'break_started_at' => $currentState === 'paused'
                ? $latestSession?->clock_out_at?->toIso8601String()
                : null,
            'staff_email' => $staff->email,
            'masked_email' => $this->maskEmail((string) $staff->email),
            'shift_policy' => $shiftPolicy,
            'server_time' => $this->now()->toIso8601String(),
            'server_timestamp' => $this->now()->timestamp,
            'assigned_location' => $assignedLocation ? [
                'id' => $assignedLocation->id,
                'name' => $assignedLocation->name,
                'latitude' => (float) $assignedLocation->latitude,
                'longitude' => (float) $assignedLocation->longitude,
                'radius_meters' => (int) ($assignedLocation->radius_meters ?: 200),
                'enforce_strict_geofence' => (bool) $assignedLocation->enforce_strict_geofence,
                'daily_workplace_pin' => $assignedLocation->getOrGenerateDailyPin(),
            ] : null,
        ];
    }

    /**
     * Generate, cache, and email a single-use clock-in OTP to the staff member's email.
     *
     * @return array{masked_email: string, expires_in_minutes: int, cooldown_seconds: int}
     */
    public function sendClockInOtp(User $staff): array
    {
        $cooldownKey = 'staff_clockin_otp_cooldown:' . $staff->id;
        if (Cache::has($cooldownKey)) {
            $timestamp = (int) Cache::get($cooldownKey);
            $secondsRemaining = max(1, $timestamp - now()->timestamp);
            if ($secondsRemaining > 0) {
                throw ValidationException::withMessages([
                    'otp' => ["Please wait {$secondsRemaining}s before requesting another verification code."],
                ]);
            }
        }

        $code = (string) random_int(100000, 999999);
        $expiresInMinutes = 10;

        // Store OTP in Cache for 10 minutes
        Cache::put('staff_clockin_otp:' . $staff->id, [
            'code' => $code,
            'email' => $staff->email,
            'created_at' => now()->timestamp,
        ], now()->addMinutes($expiresInMinutes));

        // Set 60-second resend cooldown
        Cache::put($cooldownKey, now()->addSeconds(60)->timestamp, now()->addSeconds(60));

        // Send OTP mail immediately
        try {
            Mail::to($staff->email)->send(new StaffClockInOtpMail($staff, $code, $expiresInMinutes));
        } catch (\Throwable $e) {
            report($e);
        }

        return [
            'masked_email' => $this->maskEmail((string) $staff->email),
            'expires_in_minutes' => $expiresInMinutes,
            'cooldown_seconds' => 60,
        ];
    }

    /**
     * Mask email address for user privacy (e.g., ku***@gmail.com).
     */
    public function maskEmail(string $email): string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }

        [$name, $domain] = explode('@', $email, 2);
        $len = strlen($name);

        if ($len <= 2) {
            $maskedName = substr($name, 0, 1) . '***';
        } else {
            $maskedName = substr($name, 0, 2) . str_repeat('*', max(3, $len - 3)) . substr($name, -1);
        }

        return $maskedName . '@' . $domain;
    }

    /**
     * @return Collection<int, StaffAttendanceSession>
     */
    protected function getTodaySessions(User $staff): Collection
    {
        return StaffAttendanceSession::query()
            ->where("staff_user_id", $staff->id)
            ->whereDate('attendance_date', $this->now()->toDateString())
            ->orderBy("clock_in_at")
            ->get();
    }

    protected function resolveWorkedMinutes(StaffAttendanceSession $session): int
    {
        if ($session->clock_out_at) {
            return max(0, (int) $session->worked_minutes);
        }

        $now = $this->now();
        $isPastDay = $session->attendance_date ? $session->attendance_date->lt($now->toDateString()) : false;

        // If session was left open on a past day, cap worked duration at last heartbeat/activity or 15 mins after clock_in
        if ($isPastDay) {
            $lastActive = $session->last_activity_at ?: ($session->last_heartbeat_at ?: $session->clock_in_at);
            return max(0, $session->clock_in_at->diffInMinutes($lastActive));
        }

        // For open sessions today, cap at elapsed minutes up to current time (max 16 hours / 960 mins)
        $elapsed = $session->clock_in_at ? $session->clock_in_at->diffInMinutes($now) : 0;
        return min(960, max(0, $elapsed));
    }

    protected function resolveMonth(?CarbonInterface $month = null): CarbonInterface
    {
        return ($month ? Carbon::parse($month) : $this->now())->startOfMonth();
    }

    protected function defaultCloseReasonFor(string $mode): string
    {
        return match ($mode) {
            self::MODE_PAUSED => self::CLOSE_REASON_MANUAL_PAUSE,
            self::MODE_CLOCKED_OUT => self::CLOSE_REASON_MANUAL_CLOCK_OUT,
            default => throw new \InvalidArgumentException('Unsupported attendance close mode.'),
        };
    }

    protected function now(): CarbonInterface
    {
        return now(config('app.timezone'));
    }

    protected function formatWorkedHoursLabel(int $workedMinutes): string
    {
        if ($workedMinutes <= 0) {
            return '0h';
        }

        $hours = intdiv($workedMinutes, 60);
        $minutes = $workedMinutes % 60;

        if ($hours === 0) {
            return "{$minutes}m";
        }

        if ($minutes === 0) {
            return "{$hours}h";
        }

        return "{$hours}h {$minutes}m";
    }

    public function attendanceMonthLabel(): string
    {
        return now(config('app.timezone'))->format('F Y');
    }

    public function transformEmployeeRecords(\Illuminate\Support\Collection $employeeRecords, array $attendanceSummaries): \Illuminate\Support\Collection
    {
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $supportsMustChangePassword = Schema::hasColumn('users', 'must_change_password');
        $supportsRolePresetKey = Schema::hasColumn('users', 'staff_role_preset_key');
        $supportsStaffModulePermissions = Schema::hasColumn('users', 'staff_module_permissions');

        return $employeeRecords->map(function (Employee $employee) use ($supportsEmployeeLoginLinks, $supportsMustChangePassword, $supportsRolePresetKey, $supportsStaffModulePermissions, $attendanceSummaries) {
            $loginAccount = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
            $attendanceSummary = $attendanceSummaries[$employee->id] ?? [
                'current_state' => 'manual',
                'latest_action' => null,
                'today_first_clock_in' => null,
                'days_worked' => 0,
                'attended_days' => 0,
                'absences_days' => 0,
                'undertime_hours' => 0,
                'overtime_hours' => 0,
                'worked_minutes' => 0,
                'has_attendance_source' => false,
                'open_session' => false,
                'month_label' => $this->attendanceMonthLabel(),
                'calendar_days' => [],
            ];

            return [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'role' => $employee->role,
                'salary' => $employee->salary,
                'status' => $employee->status,
                'join_date' => $employee->join_date,
                'has_login_account' => $supportsEmployeeLoginLinks && (bool) $loginAccount,
                'login_account' => $loginAccount ? [
                    'id' => $loginAccount->id,
                    'name' => $loginAccount->name,
                    'email' => $loginAccount->email,
                    'avatar' => $loginAccount->avatar,
                    'updated_at' => $loginAccount->updated_at,
                    'workspace_access_enabled' => $loginAccount->isWorkspaceAccessEnabled(),
                    'plan_workspace_suspended' => $loginAccount->isPlanWorkspaceSuspended(),
                    'is_verified' => (bool) $loginAccount->email_verified_at,
                    'must_change_password' => $supportsMustChangePassword ? (bool) $loginAccount->must_change_password : false,
                    'user_level' => $loginAccount->getStaffUserLevel(),
                    'staff_access_permission_level' => $loginAccount->getStaffAccessPermissionLevel(),
                    'role_preset_key' => $supportsRolePresetKey ? ($loginAccount->staff_role_preset_key ?: 'custom') : 'custom',
                    'module_permissions' => $supportsStaffModulePermissions ? User::stripStaffControlFlags((array) $loginAccount->staff_module_permissions) : [],
                ] : null,
                'attendance' => [
                    'current_state' => $attendanceSummary['current_state'],
                    'latest_action' => $attendanceSummary['latest_action'],
                    'today_first_clock_in' => $attendanceSummary['today_first_clock_in'],
                    'days_worked' => $attendanceSummary['days_worked'],
                    'worked_minutes' => $attendanceSummary['worked_minutes'],
                    'has_attendance_source' => $attendanceSummary['has_attendance_source'],
                    'open_session' => $attendanceSummary['open_session'],
                    'month_label' => $attendanceSummary['month_label'],
                    'calendar_days' => $attendanceSummary['calendar_days'],
                ],
                'payroll_prefill' => [
                    'absences_days' => $attendanceSummary['absences_days'],
                    'undertime_hours' => $attendanceSummary['undertime_hours'],
                    'overtime_hours' => $attendanceSummary['overtime_hours'],
                    'days_worked' => $attendanceSummary['days_worked'],
                ],
            ];
        });
    }
}
