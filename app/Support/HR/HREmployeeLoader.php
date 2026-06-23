<?php

namespace App\Support\HR;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StaffAccessAudit;
use App\Models\User;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Services\HR\PayrollCalculatorService;
use App\Services\StaffAttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class HREmployeeLoader
{
    public static function getEmployeeRecordsWithLogin(User $seller): Collection
    {
        $supportsEmployeeLoginLinks = Cache::remember('schema_users_has_employee_id', 86400, fn() => Schema::hasColumn('users', 'employee_id'));
        $employeeQuery = Employee::query()
            ->where('user_id', $seller->id)
            ->orderBy('created_at', 'desc');

        if ($supportsEmployeeLoginLinks) {
            $loginAccountColumns = array_values(array_filter([
                'id',
                'name',
                'email',
                'role',
                'avatar',
                'updated_at',
                'email_verified_at',
                'employee_id',
                'staff_plan_suspended_at',
                Cache::remember('schema_users_has_must_change_password', 86400, fn() => Schema::hasColumn('users', 'must_change_password')) ? 'must_change_password' : null,
                Cache::remember('schema_users_has_staff_role_preset_key', 86400, fn() => Schema::hasColumn('users', 'staff_role_preset_key')) ? 'staff_role_preset_key' : null,
                Cache::remember('schema_users_has_staff_module_permissions', 86400, fn() => Schema::hasColumn('users', 'staff_module_permissions')) ? 'staff_module_permissions' : null,
            ]));

            $employeeQuery->with([
                'loginAccount' => fn($query) => $query->select($loginAccountColumns),
            ]);
        }

        return $employeeQuery->get();
    }

    public static function getRecentAccessAudits(User $seller): array
    {
        if (!HRStaffProvisioner::supportsStaffAccessAuditSchema()) {
            return [];
        }

        return StaffAccessAudit::query()
            ->with([
                'actor:id,name,avatar',
                'staffUser:id,name,email,avatar',
                'employee:id,name,role',
            ])
            ->where('seller_owner_id', $seller->id)
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (StaffAccessAudit $audit) => [
                'id' => $audit->id,
                'event' => $audit->event,
                'summary' => $audit->summary,
                'details' => $audit->details ?? [],
                'created_at' => optional($audit->created_at)->toIso8601String(),
                'actor' => $audit->actor ? [
                    'id' => $audit->actor->id,
                    'name' => $audit->actor->name,
                    'avatar' => $audit->actor->avatar,
                ] : null,
                'staff_user' => $audit->staffUser ? [
                    'id' => $audit->staffUser->id,
                    'name' => $audit->staffUser->name,
                    'email' => $audit->staffUser->email,
                    'avatar' => $audit->staffUser->avatar,
                ] : null,
                'employee' => $audit->employee ? [
                    'id' => $audit->employee->id,
                    'name' => $audit->employee->name,
                    'role' => $audit->employee->role,
                ] : null,
            ])
            ->values()
            ->all();
    }

    public static function resolveActivePeriod(Request $request): Carbon
    {
        $monthQuery = $request->query('month');
        $parsedMonth = null;
        if ($monthQuery) {
            try {
                $parsedMonth = Carbon::parse($monthQuery);
            } catch (\Exception $e) {
                // ignore and fall back to null
            }
        }

        return $parsedMonth ?: now(config('app.timezone'));
    }

    public static function getEmployeesWithAttendance(
        User $seller,
        StaffAttendanceService $attendanceService,
        ?Carbon $parsedMonth = null
    ): Collection {
        $employeeRecords = self::getEmployeeRecordsWithLogin($seller);
        $attendanceSummaries = $attendanceService->buildEmployeeMonthlySummaries($employeeRecords, $seller, $parsedMonth);
        return $attendanceService->transformEmployeeRecords($employeeRecords, $attendanceSummaries);
    }

    public static function buildSellerSettings(User $seller, Carbon $activePeriod): array
    {
        return [
            'overtime_rate' => $seller->overtime_rate ?? 50.00,
            'overtime_multiplier' => $seller->overtime_multiplier ?? 1.25,
            'payroll_factor_method' => $seller->payroll_factor_method ?? 'custom',
            'rest_day_ot_multiplier' => $seller->rest_day_ot_multiplier ?? 1.69,
            'holiday_ot_multiplier' => $seller->holiday_ot_multiplier ?? 2.60,
            'payroll_working_days' => $seller->payroll_working_days ?? 22,
            'attendance_month_label' => $activePeriod->format('F Y'),
            'attendance_month_value' => $activePeriod->format('Y-m'),
            'created_at' => $seller->created_at ? $seller->created_at->toIso8601String() : now(config('app.timezone'))->toIso8601String(),
        ];
    }

    public static function recordStaffAccessAudit(
        User $seller,
        User $actor,
        string $event,
        Employee $employee,
        ?User $staffUser,
        array $details = []
    ): void {
        if (!HRStaffProvisioner::supportsStaffAccessAuditSchema()) {
            return;
        }

        $actionText = match ($event) {
            'login_created' => 'created seller portal access for',
            'login_suspended' => 'suspended seller portal access for',
            'login_restored' => 'restored seller portal access for',
            'login_removed' => 'removed seller portal access for',
            default => 'updated seller portal access for',
        };

        StaffAccessAudit::create([
            'seller_owner_id' => $seller->id,
            'actor_user_id' => $actor->id,
            'staff_user_id' => $staffUser?->id,
            'employee_id' => $employee->id,
            'event' => $event,
            'summary' => trim(($actor->name ?: 'A workspace user') . ' ' . $actionText . ' ' . ($employee->name ?: 'an employee') . '.'),
            'details' => $details,
        ]);
    }

    public static function handleUpdateAuditLog(
        User $seller,
        User $actor,
        Employee $employee,
        ?User $linkedLogin,
        ?array $auditBefore,
        array $result
    ): void {
        $createdLogin = $result['createdLogin'] ?? false;
        $workspaceSuspended = $result['workspaceSuspended'] ?? false;
        $workspaceRestored = $result['workspaceRestored'] ?? false;
        $emailChanged = $result['emailChanged'] ?? false;
        $passwordReset = $result['passwordReset'] ?? false;
        $auditAfter = $result['auditAfter'] ?? null;

        $auditChanges = [];
        if ($createdLogin) {
            $auditChanges[] = 'Created seller portal login';
        }
        if ($workspaceSuspended) {
            $auditChanges[] = 'Suspended workspace access';
        }
        if ($workspaceRestored) {
            $auditChanges[] = 'Restored workspace access';
        }
        if ($emailChanged) {
            $auditChanges[] = 'Updated login email';
        }
        if ($passwordReset) {
            $auditChanges[] = 'Reset login password';
        }
        if ($auditBefore !== null && $auditAfter !== null) {
            if (($auditBefore['permission_level'] ?? null) !== ($auditAfter['permission_level'] ?? null)) {
                $auditChanges[] = 'Changed People & Payroll access to ' . HRRolePresets::permissionLevelLabel($auditAfter['permission_level'] ?? null);
            }
            if (($auditBefore['role_preset_key'] ?? null) !== ($auditAfter['role_preset_key'] ?? null)) {
                $auditChanges[] = 'Changed capability template';
            }
            if (($auditBefore['modules'] ?? []) !== ($auditAfter['modules'] ?? [])) {
                $auditChanges[] = 'Updated capability access';
            }
        }
        if ($createdLogin && $auditAfter !== null) {
            $auditChanges[] = 'Assigned capability-specific access levels';
        }

        if ($createdLogin || $workspaceSuspended || $workspaceRestored || !empty($auditChanges)) {
            $event = $createdLogin
                ? 'login_created'
                : ($workspaceSuspended
                    ? 'login_suspended'
                    : ($workspaceRestored ? 'login_restored' : 'login_updated'));

            self::recordStaffAccessAudit($seller, $actor, $event, $employee, $linkedLogin, [
                'changes' => array_values(array_unique($auditChanges)),
                'before' => $auditBefore,
                'after' => $auditAfter,
            ]);
        }
    }

    public static function notifyAccountingOfPayrollRun(Payroll $payroll, User $seller, string $month, User $actor): void
    {
        $requesterName = $actor->name ?: 'A staff member';
        $message = "{$requesterName} submitted the payroll request for {$month} for Accounting approval.";

        self::accountingRecipientsForSeller($seller)->each(function (User $recipient) use ($payroll, $message) {
            $recipient->notify(new AccountingApprovalRequestedNotification(
                'New Payroll Request',
                $message,
                route('accounting.index'),
                'payroll',
                $payroll->id,
            ));
        });
    }

    public static function accountingRecipientsForSeller(User $seller): Collection
    {
        return User::query()
            ->where(function ($query) use ($seller) {
                $query->where('id', $seller->id)
                    ->orWhere('seller_owner_id', $seller->id);
            })
            ->get()
            ->filter(function (User $user) use ($seller) {
                if ($user->id === $seller->id) {
                    return true;
                }

                return $user->isStaff()
                    && $user->isWorkspaceAccessEnabled()
                    && $user->canAccessSellerModule('accounting');
            })
            ->unique('id')
            ->values();
    }

    public static function serializePayrollRun(Payroll $payroll, User $seller): array
    {
        $payrollService = app(PayrollCalculatorService::class);

        $lineItems = $payroll->items->map(function (PayrollItem $item) use ($seller, $payrollService) {
            if (!$item->employee) {
                return [
                    'id' => $item->id,
                    'employee_name' => $item->employee_name ?? "Employee #{$item->employee_id}",
                    'employee_role' => null,
                    'base_salary' => (float) $item->base_salary,
                    'days_worked' => (float) $item->days_worked,
                    'absences_days' => (float) $item->absences_days,
                    'paid_leave_days' => (float) $item->paid_leave_days,
                    'absence_deduction' => 0.00,
                    'undertime_hours' => (float) $item->undertime_hours,
                    'undertime_deduction' => 0.00,
                    'overtime_hours' => (float) $item->overtime_hours,
                    'overtime_pay' => (float) $item->overtime_pay,
                    'rest_day_ot_hours' => (float) $item->rest_day_ot_hours,
                    'rest_day_ot_pay' => (float) $item->rest_day_ot_pay,
                    'holiday_ot_hours' => (float) $item->holiday_ot_hours,
                    'holiday_ot_pay' => (float) $item->holiday_ot_pay,
                    'net_pay' => (float) $item->net_pay,
                    'meta' => null,
                ];
            }

            $inputs = [
                'absences_days' => (float) $item->absences_days,
                'paid_leave_days' => (float) $item->paid_leave_days,
                'undertime_hours' => (float) $item->undertime_hours,
                'overtime_hours' => (float) $item->overtime_hours,
                'rest_day_ot_hours' => (float) $item->rest_day_ot_hours,
                'holiday_ot_hours' => (float) $item->holiday_ot_hours,
            ];

            $calculated = $payrollService->calculateEmployeeRow($item->employee, $inputs, $seller);

            return [
                'id' => $item->id,
                'employee_name' => $item->employee->name,
                'employee_role' => $item->employee->role,
                'base_salary' => (float) $item->base_salary,
                'days_worked' => (float) $item->days_worked,
                'absences_days' => (float) $item->absences_days,
                'paid_leave_days' => (float) $item->paid_leave_days,
                'absence_deduction' => $calculated['absence_deduction'],
                'undertime_hours' => (float) $item->undertime_hours,
                'undertime_deduction' => $calculated['undertime_deduction'],
                'overtime_hours' => (float) $item->overtime_hours,
                'overtime_pay' => (float) $item->overtime_pay,
                'rest_day_ot_hours' => (float) $item->rest_day_ot_hours,
                'rest_day_ot_pay' => (float) $item->rest_day_ot_pay,
                'holiday_ot_hours' => (float) $item->holiday_ot_hours,
                'holiday_ot_pay' => (float) $item->holiday_ot_pay,
                'net_pay' => (float) $item->net_pay,
                'meta' => $calculated['meta'],
            ];
        })->values();

        return [
            'id' => $payroll->id,
            'run_number' => $payroll->run_number ?: "Payroll #{$payroll->id}",
            'month' => $payroll->month,
            'pay_date' => $payroll->pay_date?->toDateString(),
            'notes' => $payroll->notes,
            'status' => $payroll->status,
            'total_amount' => (float) $payroll->total_amount,
            'employee_count' => (int) $payroll->employee_count,
            'rejection_reason' => $payroll->rejection_reason,
            'created_at' => $payroll->created_at?->toIso8601String(),
            'updated_at' => $payroll->updated_at?->toIso8601String(),
            'submitted_at' => $payroll->submitted_at?->toIso8601String(),
            'requester' => $payroll->requester ? [
                'id' => $payroll->requester->id,
                'name' => $payroll->requester->name,
                'role' => $payroll->requester->role,
            ] : null,
            'summary' => [
                'base_pay' => (float) $lineItems->sum('base_salary'),
                'deductions' => (float) $lineItems->sum(fn(array $item) => $item['absence_deduction'] + $item['undertime_deduction']),
                'overtime' => (float) $lineItems->sum(fn(array $item) => $item['overtime_pay'] + ($item['rest_day_ot_pay'] ?? 0) + ($item['holiday_ot_pay'] ?? 0)),
                'net_pay' => (float) $lineItems->sum('net_pay'),
            ],
            'line_items' => $lineItems->all(),
        ];
    }

    public static function parseSelectedPayrollItems(array $validated): array
    {
        $selectedEmployeeIds = collect($validated['selected_employee_ids'] ?? [])
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values();

        return collect($validated['items'])
            ->filter(function (array $item) use ($selectedEmployeeIds) {
                if ($selectedEmployeeIds->isNotEmpty()) {
                    return $selectedEmployeeIds->contains((int) $item['employee_id']);
                }

                return !array_key_exists('isSelected', $item) || filter_var($item['isSelected'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) !== false;
            })
            ->map(function (array $item) {
                return [
                    'employee_id' => $item['employee_id'],
                    'absences_days' => (float) ($item['absences_days'] ?? 0),
                    'paid_leave_days' => (float) ($item['paid_leave_days'] ?? 0),
                    'undertime_hours' => (float) ($item['undertime_hours'] ?? 0),
                    'overtime_hours' => (float) ($item['overtime_hours'] ?? 0),
                    'rest_day_ot_hours' => (float) ($item['rest_day_ot_hours'] ?? 0),
                    'holiday_ot_hours' => (float) ($item['holiday_ot_hours'] ?? 0),
                ];
            })
            ->values()
            ->all();
    }
}
