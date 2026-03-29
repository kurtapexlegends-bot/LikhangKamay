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
            'worked_minutes' => 0,
        ]);
    }

    public function closeOpenSession(User $staff, string $mode): ?StaffAttendanceSession
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

        $now = $this->now();
        $workedMinutes = max(0, $openSession->clock_in_at->diffInMinutes($now));

        $openSession->update([
            'clock_out_at' => $now,
            'close_mode' => $mode,
            'worked_minutes' => $workedMinutes,
        ]);

        return $openSession->fresh();
    }

    public function getOpenSession(User $staff): ?StaffAttendanceSession
    {
        return StaffAttendanceSession::query()
            ->where('staff_user_id', $staff->id)
            ->whereNull('clock_out_at')
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

        return $employees->mapWithKeys(function ($employee) use ($sessionsByEmployee, $today, $workingDays) {
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

        return [
            'has_open_session' => (bool) $openSession,
            'clock_in_at' => $openSession?->clock_in_at?->toIso8601String(),
            'attendance_date' => $openSession?->attendance_date?->toDateString(),
        ];
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

    protected function now(): CarbonInterface
    {
        return now(config('app.timezone'));
    }
}
