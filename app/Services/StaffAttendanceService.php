<?php

namespace App\Services;

use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Models\Employee;
use Illuminate\Support\Facades\Schema;
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
            'last_activity_at' => $now,
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
        $standardWorkdayMinutes = (int) ((float) ($seller->standard_workday_hours ?? 8.0) * 60);

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
