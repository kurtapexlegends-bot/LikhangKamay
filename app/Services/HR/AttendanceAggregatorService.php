<?php

namespace App\Services\HR;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AttendanceAggregatorService
{
    /**
     * Aggregate staff attendance session logs for an employee within a date range.
     *
     * @param Employee $employee
     * @param string|Carbon $startDate
     * @param string|Carbon $endDate
     * @param User|null $seller
     * @return array<string, mixed>
     */
    public function aggregateForPeriod(Employee $employee, $startDate, $endDate, ?User $seller = null): array
    {
        (new \App\Services\StaffAttendanceService())->autoPauseInactiveSessions();

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();
        $standardHours = (float) $employee->getEffectiveWorkdayHours($seller);
        $standardMinutes = $standardHours * 60;

        // Locate staff user linked to employee record (or match via employee_id / email)
        $staffUserId = $employee->linked_user_id ?: $employee->user_id;

        /** @var Collection<int, StaffAttendanceSession> $sessions */
        $sessions = StaffAttendanceSession::query()
            ->where(function ($query) use ($staffUserId, $employee) {
                if ($staffUserId) {
                    $query->where('staff_user_id', $staffUserId);
                }
                if ($employee->id) {
                    $query->orWhere('employee_id', $employee->id);
                }
            })
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->where(function ($q) {
                $q->where('approval_status', '!=', 'rejected')
                  ->orWhereNull('approval_status');
            })
            ->orderBy('attendance_date', 'asc')
            ->orderBy('clock_in_at', 'asc')
            ->get();

        if ($sessions->isEmpty()) {
            return [
                'has_records' => false,
                'total_sessions' => 0,
                'total_worked_minutes' => 0,
                'total_worked_hours' => 0,
                'calculated_days_worked' => 0,
                'absences_days' => 0,
                'undertime_hours' => 0,
                'overtime_hours' => 0,
                'rest_day_ot_hours' => 0,
                'holiday_ot_hours' => 0,
                'sessions' => [],
            ];
        }

        // Group sessions by date
        $groupedByDate = $sessions->groupBy(fn ($session) => $session->attendance_date->toDateString());
        
        $totalWorkedMinutes = 0;
        $totalOvertimeMinutes = 0;
        $totalUndertimeMinutes = 0;
        $restDayOtMinutes = 0;
        $holidayOtMinutes = 0;

        foreach ($groupedByDate as $dateStr => $daySessions) {
            $dayMinutes = $daySessions->sum('worked_minutes');
            $totalWorkedMinutes += $dayMinutes;
            $dateCarbon = Carbon::parse($dateStr);
            $isRestDay = $employee->isRestDay($dateCarbon, $seller);

            if ($isRestDay) {
                // All hours worked on employee's scheduled rest day qualify for Rest Day OT
                $restDayOtMinutes += $dayMinutes;
            } else {
                // Compute overtime/undertime per scheduled workday
                if ($dayMinutes > $standardMinutes) {
                    $totalOvertimeMinutes += ($dayMinutes - $standardMinutes);
                } elseif ($dayMinutes < $standardMinutes && $dayMinutes > 0) {
                    $totalUndertimeMinutes += ($standardMinutes - $dayMinutes);
                }
            }
        }

        $workedHours = round($totalWorkedMinutes / 60, 2);
        $overtimeHours = round($totalOvertimeMinutes / 60, 2);
        $undertimeHours = round($totalUndertimeMinutes / 60, 2);
        $restDayOtHours = round($restDayOtMinutes / 60, 2);
        $daysWorked = round($totalWorkedMinutes / max(1, $standardMinutes), 1);

        return [
            'has_records' => true,
            'total_sessions' => $sessions->count(),
            'total_worked_minutes' => $totalWorkedMinutes,
            'total_worked_hours' => $workedHours,
            'calculated_days_worked' => $daysWorked,
            'absences_days' => 0, // Left for manual override if working days count exceeds worked days
            'undertime_hours' => $undertimeHours,
            'overtime_hours' => $overtimeHours,
            'rest_day_ot_hours' => $restDayOtHours,
            'holiday_ot_hours' => round($holidayOtMinutes / 60, 2),
            'sessions' => $sessions->map(fn ($s) => [
                'id' => $s->id,
                'date' => $s->attendance_date->toDateString(),
                'clock_in_at' => $s->clock_in_at?->toIso8601String(),
                'clock_out_at' => $s->clock_out_at?->toIso8601String(),
                'worked_minutes' => $s->worked_minutes,
                'worked_hours_label' => round($s->worked_minutes / 60, 1) . ' hrs',
                'close_mode' => $s->close_mode,
                'close_reason' => $s->close_reason,
                'photo_url' => $s->photo_url,
                'latitude' => $s->clock_in_latitude,
                'longitude' => $s->clock_in_longitude,
                'is_late' => (bool) $s->is_late,
                'late_minutes' => (int) $s->late_minutes,
                'is_early_departure' => (bool) $s->is_early_departure,
                'early_departure_reason' => $s->early_departure_reason,
                'undertime_minutes' => (int) $s->undertime_minutes,
                'total_break_minutes' => (int) $s->total_break_minutes,
                'is_extended_break' => (bool) $s->is_extended_break,
                'liveness_verified' => (bool) $s->liveness_verified,
                'distance_meters' => $s->distance_meters,
                'is_within_geofence' => (bool) $s->is_within_geofence,
                'is_flagged' => (bool) ($s->is_flagged || (!$s->is_within_geofence && $s->distance_meters !== null && $s->approval_status === 'pending')),
                'flag_reason' => $s->flag_reason,
                'approval_status' => $s->approval_status ?: (($s->is_flagged || (!$s->is_within_geofence && $s->distance_meters !== null)) ? 'pending' : 'approved'),
                'rejection_reason' => $s->rejection_reason,
                'approved_at' => $s->approved_at?->toIso8601String(),
                'approver_name' => $s->approver?->name,
            ])->values()->all(),
        ];
    }
}
