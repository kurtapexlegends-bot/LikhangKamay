<?php

namespace App\Support\HR;

use App\Models\Employee;
use App\Models\User;
use App\Services\SellerEntitlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

class HRStaffProvisioner
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

    public static function supportsStaffProvisioningSchema(): bool
    {
        return Cache::remember('schema_users_supports_provisioning', 86400, function () {
            return Schema::hasColumn('users', 'seller_owner_id')
                && Schema::hasColumn('users', 'staff_role_preset_key')
                && Schema::hasColumn('users', 'staff_module_permissions')
                && Schema::hasColumn('users', 'must_change_password')
                && Schema::hasColumn('users', 'created_by_user_id')
                && Schema::hasColumn('users', 'employee_id');
        });
    }

    public static function supportsStaffAccessAuditSchema(): bool
    {
        return Cache::remember('schema_has_table_staff_access_audits', 86400, function () {
            try {
                return Schema::hasTable('staff_access_audits');
            } catch (Throwable) {
                return false;
            }
        });
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
        $presetModules = HRRolePresets::rolePresetModules($presetKey);
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

    public static function buildStaffProvisioningData(
        User $actor,
        SellerEntitlementService $entitlementService,
        bool $supportsProvisioning,
        bool $canEditHrRecords
    ): array {
        return [
            'canEditHrRecords' => $canEditHrRecords,
            'canManageStaffAccounts' => $actor->canUpdateStaffAccounts() && $supportsProvisioning,
            'canCreateStaffAccounts' => $actor->canCreateStaffAccounts() && $supportsProvisioning,
            'canDeleteStaffAccounts' => $actor->canDeleteStaffAccounts() && $supportsProvisioning,
            'rolePresets' => HRRolePresets::rolePresetOptions($entitlementService),
            'userLevels' => HRRolePresets::userLevelOptions(),
            'availableModules' => HRRolePresets::moduleOptions($entitlementService),
            'requiresStaffSchemaUpdate' => !$supportsProvisioning,
        ];
    }

    public static function sanitizeAndPrepareProvisionRequest(Request $request): void
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'role' => trim((string) $request->input('role')),
        ]);

        if ($request->filled('email')) {
            $request->merge([
                'email' => strtolower(trim((string) $request->input('email'))),
            ]);
        }

        if ($request->filled('staff_user_level')) {
            $request->merge([
                'staff_user_level' => User::normalizeStaffUserLevel($request->input('staff_user_level')),
            ]);
        }

        if ($request->filled('staff_access_permission_level')) {
            $request->merge([
                'staff_access_permission_level' => User::normalizeStaffAccessPermissionLevel($request->input('staff_access_permission_level')),
            ]);
        } elseif ($request->boolean('create_login_account')) {
            $request->merge([
                'staff_access_permission_level' => self::resolveRequestedStaffAccessPermissionLevel($request),
            ]);
        }
    }

    public static function getProvisionValidationRules(
        User $seller,
        SellerEntitlementService $entitlementService,
        ?Employee $employee = null,
        ?User $linkedLogin = null,
        bool $shouldManageLoginSettings = false
    ): array {
        $rules = [
            'employee_id' => [
                'nullable',
                'string',
                'max:12',
                'regex:/^[A-Za-z0-9-]+$/',
                $employee
                    ? \Illuminate\Validation\Rule::unique('employees', 'employee_id')->where('user_id', $seller->id)->ignore($employee->id)
                    : \Illuminate\Validation\Rule::unique('employees', 'employee_id')->where('user_id', $seller->id)
            ],
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'salary' => ['required', 'numeric', 'min:0'],
            'create_login_account' => ['nullable', 'boolean'],
        ];

        if ($shouldManageLoginSettings) {
            $rules = array_merge($rules, [
                'email' => [
                    'required',
                    'string',
                    'email',
                    'max:255',
                    'regex:/^[A-Z0-9._%+-]+@gmail\.com$/i',
                    $linkedLogin
                        ? \Illuminate\Validation\Rule::unique('users', 'email')->ignore($linkedLogin->id)
                        : \Illuminate\Validation\Rule::unique('users', 'email'),
                ],
                'default_password' => [$linkedLogin ? 'nullable' : 'required', 'string', \Illuminate\Validation\Rules\Password::defaults()],
                'staff_role_preset_key' => ['required', 'string', \Illuminate\Validation\Rule::in(array_keys($entitlementService->getRolePresetDefaults()))],
                'staff_access_permission_level' => ['nullable', 'string', \Illuminate\Validation\Rule::in(User::staffAccessPermissionLevels())],
                'staff_user_level' => ['nullable', 'string', \Illuminate\Validation\Rule::in(User::staffUserLevelValidationValues())],
                'module_overrides' => ['nullable', 'array'],
                'module_overrides.*' => ['nullable'],
            ]);
        }

        return $rules;
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
}
