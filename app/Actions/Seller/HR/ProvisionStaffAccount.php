<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\DB;

class ProvisionStaffAccount
{
    /**
     * Provision/Create a new employee and optional staff login account.
     */
    public function create(
        array $validated,
        array $supportedModules,
        User $seller,
        User $actor,
        ?string $employeeId
    ): array {
        $staffAccount = null;
        $employee = null;
        $sellerId = $seller->id;

        if (empty($employeeId)) {
            do {
                $employeeId = 'EMP-' . rand(100000, 900000);
            } while (Employee::where('user_id', $sellerId)->where('employee_id', $employeeId)->exists());
        }

        DB::transaction(function () use (&$staffAccount, &$employee, $validated, $sellerId, $actor, $supportedModules, $employeeId) {
            $employee = Employee::create([
                'user_id' => $sellerId,
                'assigned_location_id' => $validated['assigned_location_id'] ?? null,
                'allow_remote_clock_in' => (bool) ($validated['allow_remote_clock_in'] ?? false),
                'schedule_type' => $validated['schedule_type'] ?? Employee::SCHEDULE_DEFAULT,
                'working_days' => $validated['working_days'] ?? null,
                'shift_start_time' => $validated['shift_start_time'] ?? null,
                'shift_end_time' => $validated['shift_end_time'] ?? null,
                'break_window_start' => $validated['break_window_start'] ?? null,
                'break_window_end' => $validated['break_window_end'] ?? null,
                'break_allowance_minutes' => isset($validated['break_allowance_minutes']) && $validated['break_allowance_minutes'] !== '' ? (int) $validated['break_allowance_minutes'] : null,
                'grace_period_minutes' => isset($validated['grace_period_minutes']) && $validated['grace_period_minutes'] !== '' ? (int) $validated['grace_period_minutes'] : null,
                'earliest_clock_in_minutes' => isset($validated['earliest_clock_in_minutes']) && $validated['earliest_clock_in_minutes'] !== '' ? (int) $validated['earliest_clock_in_minutes'] : null,
                'standard_workday_hours' => isset($validated['standard_workday_hours']) && $validated['standard_workday_hours'] !== '' ? (float) $validated['standard_workday_hours'] : null,
                'enforce_strict_shift_window' => isset($validated['enforce_strict_shift_window']) ? (bool) $validated['enforce_strict_shift_window'] : null,
                'employee_id' => $employeeId,
                'name' => $validated['name'],
                'role' => $validated['role'],
                'salary' => $validated['salary'],
                'join_date' => now(),
                'status' => 'Active',
            ]);

            if (!($validated['create_login_account'] ?? false)) {
                return;
            }

            $modulePermissions = HRWorkflowHelper::normalizeRequestedModuleOverrides(
                $validated['module_overrides'] ?? [],
                $supportedModules,
                $validated['staff_role_preset_key'],
                $validated['staff_access_permission_level'] ?? null
            );
            $modulePermissions = User::withWorkspaceAccessFlag($modulePermissions, true);
            $modulePermissions = User::withStaffUserLevelFlag($modulePermissions, $validated['staff_user_level'] ?? null);
            $modulePermissions = User::withStaffAccessPermissionLevelFlag(
                $modulePermissions,
                data_get($modulePermissions, 'hr')
            );
            $modulePermissions = User::withManageStaffAccountsFlag(
                $modulePermissions,
                data_get($modulePermissions, 'hr') === User::STAFF_ACCESS_PERMISSION_CAN_EDIT
            );

            $staffAccount = User::create([
                'name' => $employee->name,
                'email' => $validated['email'],
                'password' => $validated['default_password'],
                'role' => 'staff',
                'seller_owner_id' => $sellerId,
                'staff_role_preset_key' => $validated['staff_role_preset_key'],
                'staff_module_permissions' => $modulePermissions,
                'must_change_password' => true,
                'created_by_user_id' => $actor->id,
                'employee_id' => $employee->id,
                'email_verified_at' => null,
            ]);
        });

        return [
            'employee' => $employee,
            'staffAccount' => $staffAccount,
        ];
    }

    /**
     * Update an employee's details and provision/manage their linked login account.
     */
    public function update(
        Employee $employee,
        array $validated,
        array $supportedModules,
        User $seller,
        User $actor,
        ?User $linkedLogin,
        bool $shouldManageLoginSettings,
        bool $wantsLoginAccount,
        ?string $employeeId
    ): array {
        $sellerId = $seller->id;
        if ($employee->employee_id) {
            $employeeId = $employee->employee_id;
        } elseif (empty($employeeId)) {
            do {
                $employeeId = 'EMP-' . rand(100000, 900000);
            } while (Employee::where('user_id', $sellerId)->where('employee_id', $employeeId)->exists());
        }

        $sendVerification = false;
        $createdLogin = false;
        $emailChanged = false;
        $passwordReset = false;
        $workspaceSuspended = false;
        $workspaceRestored = false;
        $auditAfter = null;

        DB::transaction(function () use (
            $employee,
            &$linkedLogin,
            $validated,
            $shouldManageLoginSettings,
            $supportedModules,
            $wantsLoginAccount,
            &$sendVerification,
            &$createdLogin,
            &$emailChanged,
            &$passwordReset,
            &$workspaceSuspended,
            &$workspaceRestored,
            &$auditAfter,
            $actor,
            $employeeId,
            $seller
        ) {
            $employee->update([
                'employee_id' => $employeeId,
                'name' => trim($validated['name']),
                'role' => trim($validated['role']),
                'salary' => $validated['salary'],
                'assigned_location_id' => $validated['assigned_location_id'] ?? null,
                'allow_remote_clock_in' => (bool) ($validated['allow_remote_clock_in'] ?? false),
                'schedule_type' => $validated['schedule_type'] ?? Employee::SCHEDULE_DEFAULT,
                'working_days' => $validated['working_days'] ?? null,
                'shift_start_time' => $validated['shift_start_time'] ?? null,
                'shift_end_time' => $validated['shift_end_time'] ?? null,
                'break_window_start' => $validated['break_window_start'] ?? null,
                'break_window_end' => $validated['break_window_end'] ?? null,
                'break_allowance_minutes' => isset($validated['break_allowance_minutes']) && $validated['break_allowance_minutes'] !== '' ? (int) $validated['break_allowance_minutes'] : null,
                'grace_period_minutes' => isset($validated['grace_period_minutes']) && $validated['grace_period_minutes'] !== '' ? (int) $validated['grace_period_minutes'] : null,
                'earliest_clock_in_minutes' => isset($validated['earliest_clock_in_minutes']) && $validated['earliest_clock_in_minutes'] !== '' ? (int) $validated['earliest_clock_in_minutes'] : null,
                'standard_workday_hours' => isset($validated['standard_workday_hours']) && $validated['standard_workday_hours'] !== '' ? (float) $validated['standard_workday_hours'] : null,
                'enforce_strict_shift_window' => isset($validated['enforce_strict_shift_window']) ? (bool) $validated['enforce_strict_shift_window'] : null,
            ]);

            if (!$shouldManageLoginSettings) {
                if ($linkedLogin) {
                    $linkedLogin->update([
                        'name' => trim($validated['name']),
                    ]);
                }
                return;
            }

            if (!$wantsLoginAccount) {
                if (!$linkedLogin) {
                    return;
                }
            }

            $modulePermissions = HRWorkflowHelper::normalizeRequestedModuleOverrides(
                $validated['module_overrides'] ?? [],
                $supportedModules,
                $validated['staff_role_preset_key'],
                $validated['staff_access_permission_level'] ?? null
            );
            $modulePermissions = User::withWorkspaceAccessFlag($modulePermissions, $wantsLoginAccount);
            $modulePermissions = User::withStaffUserLevelFlag($modulePermissions, $validated['staff_user_level'] ?? null);
            $modulePermissions = User::withStaffAccessPermissionLevelFlag(
                $modulePermissions,
                data_get($modulePermissions, 'hr')
            );
            $modulePermissions = User::withManageStaffAccountsFlag(
                $modulePermissions,
                data_get($modulePermissions, 'hr') === User::STAFF_ACCESS_PERMISSION_CAN_EDIT
            );

            if ($linkedLogin) {
                $previousWorkspaceAccess = $linkedLogin->isWorkspaceAccessEnabled();
                $emailChanged = $linkedLogin->email !== $validated['email'];

                $updatePayload = [
                    'name' => trim($validated['name']),
                    'email' => $validated['email'],
                    'staff_role_preset_key' => $validated['staff_role_preset_key'],
                    'staff_module_permissions' => $modulePermissions,
                ];

                if ($emailChanged) {
                    $updatePayload['email_verified_at'] = null;
                    $sendVerification = true;
                }

                if (!empty($validated['default_password'])) {
                    $updatePayload['password'] = $validated['default_password'];
                    $updatePayload['must_change_password'] = true;
                    $passwordReset = true;
                }

                $linkedLogin->update($updatePayload);
                $workspaceSuspended = $previousWorkspaceAccess && !$wantsLoginAccount;
                $workspaceRestored = !$previousWorkspaceAccess && $wantsLoginAccount;
                $linkedLogin->refresh();
                $auditAfter = HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin);
                return;
            }

            if (!$wantsLoginAccount) {
                return;
            }

            $linkedLogin = User::create([
                'name' => $employee->name,
                'email' => $validated['email'],
                'password' => $validated['default_password'],
                'role' => 'staff',
                'seller_owner_id' => $seller->id,
                'staff_role_preset_key' => $validated['staff_role_preset_key'],
                'staff_module_permissions' => $modulePermissions,
                'must_change_password' => true,
                'created_by_user_id' => $actor->id,
                'employee_id' => $employee->id,
                'email_verified_at' => null,
            ]);

            $sendVerification = true;
            $createdLogin = true;
            $auditAfter = HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin);
        });

        return [
            'employee' => $employee,
            'linkedLogin' => $linkedLogin,
            'sendVerification' => $sendVerification,
            'createdLogin' => $createdLogin,
            'emailChanged' => $emailChanged,
            'passwordReset' => $passwordReset,
            'workspaceSuspended' => $workspaceSuspended,
            'workspaceRestored' => $workspaceRestored,
            'auditAfter' => $auditAfter,
        ];
    }
}
