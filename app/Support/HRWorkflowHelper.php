<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StaffAccessAudit;
use App\Models\User;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Services\HR\PayrollCalculatorService;
use App\Services\SellerEntitlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Throwable;

class HRWorkflowHelper
{
    public static function canEditHrRecords(User $actor): bool
    {
        if ($actor->isSellerOwner()) {
            return true;
        }

        if (!$actor->isStaff() || !$actor->isWorkspaceAccessEnabled()) {
            return false;
        }

        if (!in_array('hr', app(SellerEntitlementService::class)->getGrantedStaffModules($actor), true)) {
            return false;
        }

        return $actor->canEditSellerModule('hr');
    }

    public static function rolePresetOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'shop_manager' => ['label' => 'Shop Manager', 'description' => 'Full administrative control. Can manage products, financials, and staff.'],
            'accountant' => ['label' => 'Accountant', 'description' => 'Focus on financials. Can view revenue, manage payroll, and approve payouts.'],
            'stock_clerk' => ['label' => 'Stock Clerk', 'description' => 'Operations focus. Can manage inventory, process orders, and request supplies.'],
            'customer_support' => ['label' => 'Customer Care', 'description' => 'Orders, buyer messages, team inbox, and customer review handling.'],
            'hr' => ['label' => 'People & Payroll', 'description' => 'Employee records, payroll prep, and workspace access coordination.'],
            'accounting' => ['label' => 'Finance Review', 'description' => 'Legacy finance visibility role.'],
            'procurement' => ['label' => 'Procurement', 'description' => 'Legacy inventory tracking role.'],
            'custom' => ['label' => 'Custom Capability Mix', 'description' => 'Start blank and choose the exact capabilities manually.'],
        ];

        return collect($entitlementService->getRolePresetDefaults())
            ->map(function (array $modules, string $key) use ($labels) {
                return [
                    'key' => $key,
                    'label' => $labels[$key]['label'] ?? ucfirst(str_replace('_', ' ', $key)),
                    'description' => $labels[$key]['description'] ?? '',
                    'modules' => $modules,
                ];
            })
            ->values()
            ->all();
    }

    public static function moduleOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'overview' => ['label' => 'Overview', 'description' => 'Seller dashboard overview.'],
            'products' => ['label' => 'Products', 'description' => 'Product manager and stock actions.'],
            'analytics' => ['label' => 'Analytics', 'description' => 'Sales and product performance reports.'],
            '3d' => ['label' => '3D Manager', 'description' => '3D asset uploads and management.'],
            'orders' => ['label' => 'Orders', 'description' => 'Order processing and status updates.'],
            'messages' => ['label' => 'Messages', 'description' => 'Buyer inbox and seller order conversations.'],
            'team_messages' => ['label' => 'Team Inbox', 'description' => 'Internal seller workspace conversations.'],
            'reviews' => ['label' => 'Reviews', 'description' => 'Customer review replies and moderation.'],
            'shop_settings' => ['label' => 'Shop Settings', 'description' => 'Seller storefront profile settings.'],
            'hr' => ['label' => 'People & Payroll', 'description' => 'Employee records, payroll prep, and workspace access management.'],
            'accounting' => ['label' => 'Finance Approvals', 'description' => 'Finance review, fund visibility, and payroll approval.'],
            'procurement' => ['label' => 'Inventory', 'description' => 'Inventory tracking, supply management, and purchasing workflows.'],
            'stock_requests' => ['label' => 'Restock Requests', 'description' => 'Restock request tracking and approval flow.'],
        ];

        return collect($entitlementService->getSupportedStaffModules())
            ->map(function (string $module) use ($labels) {
                return [
                    'key' => $module,
                    'label' => $labels[$module]['label'] ?? ucfirst(str_replace('_', ' ', $module)),
                    'description' => $labels[$module]['description'] ?? '',
                ];
            })
            ->values()
            ->all();
    }

    public static function supportsStaffProvisioningSchema(): bool
    {
        return Schema::hasColumn('users', 'seller_owner_id')
            && Schema::hasColumn('users', 'staff_role_preset_key')
            && Schema::hasColumn('users', 'staff_module_permissions')
            && Schema::hasColumn('users', 'must_change_password')
            && Schema::hasColumn('users', 'created_by_user_id')
            && Schema::hasColumn('users', 'employee_id');
    }

    public static function supportsStaffAccessAuditSchema(): bool
    {
        try {
            return Schema::hasTable('staff_access_audits');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array<int, array<string, string>>
     */
    public static function userLevelOptions(): array
    {
        return [
            [
                'key' => User::DEFAULT_STAFF_USER_LEVEL,
                'label' => 'Staff',
                'description' => 'Can use the modules you grant, but cannot manage other staff logins or permissions.',
            ],
            [
                'key' => User::STAFF_MANAGER_USER_LEVEL,
                'label' => 'Staff Manager',
                'description' => 'Can manage employee logins and staff permissions inside People & Payroll when that capability is enabled.',
            ],
        ];
    }

    public static function permissionLevelLabel(?string $level): string
    {
        return match (User::normalizeStaffAccessPermissionLevel($level)) {
            User::STAFF_ACCESS_PERMISSION_CAN_EDIT => 'Can Edit',
            default => 'Read Only',
        };
    }

    public static function resolveRequestedStaffAccessPermissionLevel(Request $request): string
    {
        if ($request->boolean('manage_staff_accounts')) {
            return User::STAFF_ACCESS_PERMISSION_CAN_EDIT;
        }

        return User::normalizeStaffUserLevel($request->input('staff_user_level')) === User::STAFF_MANAGER_USER_LEVEL
            ? User::STAFF_ACCESS_PERMISSION_CAN_EDIT
            : User::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    /**
     * @param  array<string, mixed>  $requestedOverrides
     * @param  array<int, string>  $supportedModules
     * @return array<string, mixed>
     */
    public static function normalizeRequestedModuleOverrides(
        array $requestedOverrides,
        array $supportedModules,
        string $presetKey,
        ?string $legacyPermissionLevel = null
    ): array {
        $presetModules = self::rolePresetModules($presetKey);
        $defaultLevel = $legacyPermissionLevel !== null
            ? User::normalizeStaffAccessPermissionLevel($legacyPermissionLevel)
            : User::STAFF_ACCESS_PERMISSION_CAN_EDIT;

        $normalized = collect($supportedModules)
            ->mapWithKeys(function (string $module) use ($presetModules, $defaultLevel) {
                return [$module => in_array($module, $presetModules, true) ? $defaultLevel : false];
            })
            ->all();

        foreach ($requestedOverrides as $module => $value) {
            if (!in_array($module, $supportedModules, true)) {
                continue;
            }

            if ($value === true || $value === 1 || $value === '1') {
                $normalized[$module] = $defaultLevel;
                continue;
            }

            if ($value === false || $value === 0 || $value === '0' || $value === null || $value === '') {
                $normalized[$module] = false;
                continue;
            }

            $normalized[$module] = User::normalizeStaffModuleAccessLevel($value) ?? false;
        }

        return $normalized;
    }

    /**
     * @return array<int, string>
     */
    public static function rolePresetModules(string $presetKey): array
    {
        return app(SellerEntitlementService::class)->getRolePresetDefaults()[$presetKey] ?? [];
    }

    /**
     * @return array<string, mixed>
     */
    public static function buildStaffAccessSnapshot(User $staffUser): array
    {
        return [
            'email' => $staffUser->email,
            'workspace_access_enabled' => $staffUser->isWorkspaceAccessEnabled(),
            'permission_level' => $staffUser->getStaffAccessPermissionLevel(),
            'role_preset_key' => $staffUser->staff_role_preset_key ?: 'custom',
            'modules' => User::stripStaffControlFlags((array) $staffUser->staff_module_permissions),
        ];
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public static function recordStaffAccessAudit(
        User $seller,
        User $actor,
        string $event,
        Employee $employee,
        ?User $staffUser,
        array $details = []
    ): void {
        if (!self::supportsStaffAccessAuditSchema()) {
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

    /**
     * Get accounting recipients.
     */
    public static function accountingRecipientsForSeller(User $seller): \Illuminate\Support\Collection
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

    public static function buildEmployeeUpdateSuccessMessage(
        bool $createdLogin,
        bool $workspaceSuspended,
        bool $workspaceRestored,
        bool $emailChanged,
        bool $passwordReset
    ): string {
        if ($createdLogin) {
            return 'Employee updated and seller login created. A verification code was sent.';
        }

        if ($workspaceSuspended) {
            return self::appendLoginUpdateFollowUps(
                'Employee updated and seller workspace access suspended. The linked login was kept for future reactivation.',
                $emailChanged,
                $passwordReset
            );
        }

        if ($workspaceRestored) {
            return self::appendLoginUpdateFollowUps(
                'Employee updated and seller workspace access restored.',
                $emailChanged,
                $passwordReset
            );
        }

        $baseMessage = ($emailChanged || $passwordReset)
            ? 'Employee and seller login updated successfully.'
            : 'Employee details updated successfully.';

        return self::appendLoginUpdateFollowUps($baseMessage, $emailChanged, $passwordReset);
    }

    public static function appendLoginUpdateFollowUps(string $message, bool $emailChanged, bool $passwordReset): string
    {
        $followUps = [];

        if ($emailChanged) {
            $followUps[] = 'A verification code was sent to the updated address.';
        }

        if ($passwordReset) {
            $followUps[] = 'The employee must change the new password on next sign-in.';
        }

        if (empty($followUps)) {
            return $message;
        }

        return $message . ' ' . implode(' ', $followUps);
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

    public static function getEmployeeRecordsWithLogin(User $seller): \Illuminate\Support\Collection
    {
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
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
                Schema::hasColumn('users', 'must_change_password') ? 'must_change_password' : null,
                Schema::hasColumn('users', 'staff_role_preset_key') ? 'staff_role_preset_key' : null,
                Schema::hasColumn('users', 'staff_module_permissions') ? 'staff_module_permissions' : null,
            ]));

            $employeeQuery->with([
                'loginAccount' => fn($query) => $query->select($loginAccountColumns),
            ]);
        }

        return $employeeQuery->get();
    }

    public static function getRecentAccessAudits(User $seller): array
    {
        if (!self::supportsStaffAccessAuditSchema()) {
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
                'created_at' => optional($audit->created_at)?->toIso8601String(),
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
}
