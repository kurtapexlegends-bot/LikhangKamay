<?php

namespace App\Services;

use App\Models\StaffAttendanceSession;
use App\Models\User;
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

    public function ensureClockedIn(User $staff): ?StaffAttendanceSession
    {
        if (!$staff->isStaff()) {
            return null;
        }

        $openSession = $this->getOpenSession($staff);

        if ($openSession) {
            return $openSession;
        }

        $now = $this->now();

        return StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $staff->getEffectiveSellerId(),
            'employee_id' => $staff->employee_id,
            'attendance_date' => $now->toDateString(),
            'clock_in_at' => $now,
            'last_heartbeat_at' => $now,
            'worked_minutes' => 0,
        ]);
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

        $openSession->update([
            'clock_out_at' => $now,
            'last_heartbeat_at' => $openSession->last_heartbeat_at ?: $now,
            'close_mode' => $mode,
            'close_reason' => $resolvedReason,
            'worked_minutes' => $workedMinutes,
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

        return $this->getLatestSession($staff)?->close_reason === self::CLOSE_REASON_INACTIVITY_TIMEOUT;
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
        $threshold = $now->copy()->subMinutes(self::INACTIVITY_TIMEOUT_MINUTES);

        $sessions = StaffAttendanceSession::query()
            ->whereNull('clock_out_at')
            ->where(function ($query) use ($threshold) {
                $query->where('last_heartbeat_at', '<=', $threshold)
                    ->orWhere(function ($fallback) use ($threshold) {
                        $fallback->whereNull('last_heartbeat_at')
                            ->where('clock_in_at', '<=', $threshold);
                    });
            })
            ->get();

        foreach ($sessions as $session) {
            $closedAt = $session->last_heartbeat_at ?: $threshold;
            $workedMinutes = max(0, $session->clock_in_at->diffInMinutes($closedAt));

            $session->update([
                'clock_out_at' => $closedAt,
                'last_heartbeat_at' => $closedAt,
                'close_mode' => self::MODE_PAUSED,
                'close_reason' => self::CLOSE_REASON_INACTIVITY_TIMEOUT,
                'worked_minutes' => $workedMinutes,
            ]);
        }

        return $sessions->count();
    }

    public function getOpenSession(User $staff): ?StaffAttendanceSession
    {
        return StaffAttendanceSession::query()
            ->where('staff_user_id', $staff->id)
            ->whereNull('clock_out_at')
            ->latest('clock_in_at')
            ->first();
    }

    public function getLatestSession(User $staff): ?StaffAttendanceSession
    {
        return StaffAttendanceSession::query()
            ->where('staff_user_id', $staff->id)
            ->latest('clock_in_at')
            ->first();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\Employee>  $employees
     * @return array<int, array<string, mixed>>
     */
    public function buildEmployeeMonthlySummaries(Collection $employees, User $seller, ?CarbonInterface $month = null): array
    {
        $period = $this->resolveMonth($month);
        $today = $this->now()->toDateString();
        $workingDays = (int) ($seller->payroll_working_days ?? 22);
        $employeeIds = $employees->pluck('id')->filter()->values();

        $sessions = $employeeIds->isEmpty()
            ? collect()
            : StaffAttendanceSession::query()
                ->where('seller_owner_id', $seller->id)
                ->whereIn('employee_id', $employeeIds)
                ->whereBetween('attendance_date', [$period->copy()->startOfMonth()->toDateString(), $period->copy()->endOfMonth()->toDateString()])
                ->orderBy('clock_in_at')
                ->get();

        $sessionsByEmployee = $sessions->groupBy('employee_id');

        return $employees->mapWithKeys(function ($employee) use ($sessionsByEmployee, $today, $workingDays, $period) {
            $employeeSessions = $sessionsByEmployee->get($employee->id, collect());
            $latestSession = $employeeSessions->last();
            $todaySessions = $employeeSessions->filter(function (StaffAttendanceSession $session) use ($today) {
                return $session->attendance_date?->toDateString() === $today;
            });
            $todayFirstClockIn = $todaySessions
                ->sortBy('clock_in_at')
                ->first()?->clock_in_at;
            $dailyMinutes = $employeeSessions
                ->groupBy(fn (StaffAttendanceSession $session) => $session->attendance_date->toDateString())
                ->map(function (Collection $sessionsForDay) {
                    return $sessionsForDay->sum(function (StaffAttendanceSession $session) {
                        return $this->resolveWorkedMinutes($session);
                    });
                });

            $daysWorked = $dailyMinutes->filter(fn ($minutes) => $minutes > 0)->count();
            $undertimeMinutes = $dailyMinutes
                ->map(fn ($minutes) => max(0, self::STANDARD_WORKDAY_MINUTES - $minutes))
                ->sum();
            $overtimeMinutes = $dailyMinutes
                ->map(fn ($minutes) => max(0, $minutes - self::STANDARD_WORKDAY_MINUTES))
                ->sum();
            $calendarDays = [];
            $cursor = $period->copy()->startOfMonth();
            $periodEnd = $period->copy()->endOfMonth();

            while ($cursor->lte($periodEnd)) {
                $dateKey = $cursor->toDateString();
                $workedMinutes = (int) ($dailyMinutes->get($dateKey, 0) ?? 0);

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
                $employee->id => [
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
                ],
            ];
        })->all();
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
            ->sortBy('clock_in_at')
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
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, \App\Models\StaffAttendanceSession>
     */
    protected function getTodaySessions(User $staff): Collection
    {
        return StaffAttendanceSession::query()
            ->where('staff_user_id', $staff->id)
            ->whereDate('attendance_date', $this->now()->toDateString())
            ->orderBy('clock_in_at')
            ->get();
    }

    protected function resolveWorkedMinutes(StaffAttendanceSession $session): int
    {
        if ($session->clock_out_at) {
            return max(0, (int) $session->worked_minutes);
        }

        return max(0, $session->clock_in_at->diffInMinutes($this->now()));
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
}
