<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StaffAccessAudit;
use App\Models\User;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Services\StaffAttendanceService;
use App\Services\SellerEntitlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class HRController extends Controller
{
    use InteractsWithSellerContext;

    public function index(SellerEntitlementService $entitlementService, StaffAttendanceService $attendanceService)
    {
        $seller = $this->sellerOwner();
        $actor = $this->sellerActor();
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $supportsMustChangePassword = Schema::hasColumn('users', 'must_change_password');
        $supportsRolePresetKey = Schema::hasColumn('users', 'staff_role_preset_key');
        $supportsStaffModulePermissions = Schema::hasColumn('users', 'staff_module_permissions');

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
                $supportsMustChangePassword ? 'must_change_password' : null,
                $supportsRolePresetKey ? 'staff_role_preset_key' : null,
                $supportsStaffModulePermissions ? 'staff_module_permissions' : null,
            ]));

            $employeeQuery->with([
                'loginAccount' => fn($query) => $query->select($loginAccountColumns),
            ]);
        }

        $employeeRecords = $employeeQuery->get();
        $attendanceSummaries = $attendanceService->buildEmployeeMonthlySummaries($employeeRecords, $seller);

        $employees = $employeeRecords
            ->map(function (Employee $employee) use ($supportsEmployeeLoginLinks, $supportsMustChangePassword, $supportsRolePresetKey, $supportsStaffModulePermissions, $attendanceSummaries) {
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
                        'must_change_password' => $supportsMustChangePassword
                            ? (bool) $loginAccount->must_change_password
                            : false,
                        'user_level' => $loginAccount->getStaffUserLevel(),
                        'staff_access_permission_level' => $loginAccount->getStaffAccessPermissionLevel(),
                        'role_preset_key' => $supportsRolePresetKey
                            ? ($loginAccount->staff_role_preset_key ?: 'custom')
                            : 'custom',
                        'module_permissions' => $supportsStaffModulePermissions
                            ? User::stripStaffControlFlags((array) $loginAccount->staff_module_permissions)
                            : [],
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

        $payrolls = Payroll::with('requester:id,name')
            ->where('user_id', $seller->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        $supportsProvisioning = $this->supportsStaffProvisioningSchema();
        $canEditHrRecords = $this->canEditHrRecords($actor);
        $recentAccessAudits = $this->supportsStaffAccessAuditSchema()
            ? StaffAccessAudit::query()
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
                ->all()
            : [];

        return Inertia::render('Seller/HR', [
            'staff' => $employees,
            'payrolls' => $payrolls,
            'staffAccessAudits' => $recentAccessAudits,
            'sellerSettings' => [
                'overtime_rate' => $seller->overtime_rate ?? 50.00,
                'payroll_working_days' => $seller->payroll_working_days ?? 22,
                'attendance_month_label' => $this->attendanceMonthLabel(),
            ],
            'staffProvisioning' => [
                'canEditHrRecords' => $canEditHrRecords,
                'canManageStaffAccounts' => $actor->canUpdateStaffAccounts() && $supportsProvisioning,
                'canCreateStaffAccounts' => $actor->canCreateStaffAccounts() && $supportsProvisioning,
                'canDeleteStaffAccounts' => $actor->canDeleteStaffAccounts() && $supportsProvisioning,
                'rolePresets' => $this->rolePresetOptions($entitlementService),
                'userLevels' => $this->userLevelOptions(),
                'availableModules' => $this->moduleOptions($entitlementService),
                'requiresStaffSchemaUpdate' => !$supportsProvisioning,
            ],
        ]);
    }

    protected function attendanceMonthLabel(): string
    {
        return now(config('app.timezone'))->format('F Y');
    }

    public function store(Request $request, SellerEntitlementService $entitlementService)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        abort_unless($this->canEditHrRecords($actor), 403, 'Read-only HR access can only view records.');

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
                'staff_access_permission_level' => $this->resolveRequestedStaffAccessPermissionLevel($request),
            ]);
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'salary' => ['required', 'numeric', 'min:0'],
            'create_login_account' => ['nullable', 'boolean'],
        ];

        if ($request->boolean('create_login_account')) {
            if (!$this->supportsStaffProvisioningSchema()) {
                return back()
                    ->withErrors([
                        'create_login_account' => 'Staff login provisioning needs the latest database migration before it can be used.',
                    ])
                    ->withInput();
            }

            abort_unless($actor->canCreateStaffAccounts(), 403, 'Only the shop owner or a user with full staff account access can create staff login accounts.');

            $rules = array_merge($rules, [
                'email' => ['required', 'string', 'email', 'max:255', 'regex:/^[A-Z0-9._%+-]+@gmail\.com$/i', 'unique:users,email'],
                'default_password' => ['required', 'string', Password::defaults()],
                'staff_role_preset_key' => ['required', 'string', Rule::in(array_keys($entitlementService->getRolePresetDefaults()))],
                'staff_access_permission_level' => ['required', 'string', Rule::in(User::staffAccessPermissionLevels())],
                'staff_user_level' => ['nullable', 'string', Rule::in(User::staffUserLevelValidationValues())],
                'module_overrides' => ['nullable', 'array'],
                'module_overrides.*' => ['boolean'],
            ]);
        }

        $validated = $request->validate($rules, [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ]);

        $sellerId = $this->sellerOwnerId();
        $supportedModules = $entitlementService->getSupportedStaffModules();
        $staffAccount = null;
        $employee = null;

        DB::transaction(function () use (&$staffAccount, &$employee, $validated, $sellerId, $actor, $supportedModules) {
            $employee = Employee::create([
                'user_id' => $sellerId,
                'name' => $validated['name'],
                'role' => $validated['role'],
                'salary' => $validated['salary'],
                'join_date' => now(),
                'status' => 'Active',
            ]);

            if (!($validated['create_login_account'] ?? false)) {
                return;
            }

            $modulePermissions = collect($supportedModules)
                ->mapWithKeys(function (string $module) use ($validated) {
                    return [$module => (bool) data_get($validated, "module_overrides.{$module}", false)];
                })
                ->all();
            $modulePermissions = User::withWorkspaceAccessFlag($modulePermissions, true);
            $modulePermissions = User::withStaffUserLevelFlag($modulePermissions, $validated['staff_user_level'] ?? null);
            $modulePermissions = User::withStaffAccessPermissionLevelFlag($modulePermissions, $validated['staff_access_permission_level'] ?? null);
            $modulePermissions = User::withManageStaffAccountsFlag(
                $modulePermissions,
                User::normalizeStaffAccessPermissionLevel($validated['staff_access_permission_level'] ?? null) === User::STAFF_ACCESS_PERMISSION_FULL
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

        if ($staffAccount && $employee instanceof Employee) {
            $this->recordStaffAccessAudit($seller, $actor, 'login_created', $employee, $staffAccount, [
                'changes' => [
                    'Created seller portal login',
                    'Assigned ' . $this->permissionLevelLabel($staffAccount->getStaffAccessPermissionLevel()) . ' permission level',
                ],
                'after' => $this->buildStaffAccessSnapshot($staffAccount),
            ]);

            try {
                $staffAccount->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Staff verification email failed to send.', [
                    'staff_user_id' => $staffAccount->id,
                    'email' => $staffAccount->email,
                    'message' => $exception->getMessage(),
                ]);

                return redirect()->back()->with('error', 'Employee and staff login were created, but the verification email could not be sent right now.');
            }

            return redirect()->back()->with('success', 'Employee and staff login created. A verification email was sent.');
        }

        return redirect()->back()->with('success', 'Employee added successfully.');
    }

    public function destroy($id)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();
        abort_unless($this->canEditHrRecords($actor), 403, 'Read-only HR access can only view records.');
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $linkedLoginSnapshot = $linkedLogin ? $this->buildStaffAccessSnapshot($linkedLogin) : null;

        if ($linkedLogin && !$actor->canDeleteStaffAccounts()) {
            abort(403, 'Only the shop owner or a user with full staff account access can remove staff login accounts.');
        }

        DB::transaction(function () use ($employee, $linkedLogin) {
            if ($linkedLogin) {
                $linkedLogin->delete();
            }

            $employee->delete();
        });

        if ($linkedLoginSnapshot !== null) {
            $this->recordStaffAccessAudit($seller, $actor, 'login_removed', $employee, null, [
                'changes' => ['Removed seller portal login'],
                'before' => $linkedLoginSnapshot,
            ]);
        }

        return redirect()->back();
    }

    public function update(Request $request, $id, SellerEntitlementService $entitlementService)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();
        abort_unless($this->canEditHrRecords($actor), 403, 'Read-only HR access can only view records.');
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $supportsProvisioning = $this->supportsStaffProvisioningSchema();
        $canManageLoginSettings = $actor->canUpdateStaffAccounts() && $supportsProvisioning;
        $canCreateLoginSettings = $actor->canCreateStaffAccounts() && $supportsProvisioning;
        $wantsLoginAccount = $linkedLogin
            ? ($canManageLoginSettings ? $request->boolean('create_login_account', $linkedLogin->isWorkspaceAccessEnabled()) : $linkedLogin->isWorkspaceAccessEnabled())
            : $request->boolean('create_login_account');
        if ($linkedLogin && $request->has('create_login_account') && !$canManageLoginSettings) {
            abort(403, 'Only the shop owner or a user with update or full staff account access can update seller login access.');
        }
        if (!$linkedLogin && $wantsLoginAccount && !$canCreateLoginSettings) {
            abort(403, 'Only the shop owner or a user with full staff account access can create staff login accounts.');
        }
        $shouldManageLoginSettings = $linkedLogin
            ? $canManageLoginSettings
            : ($wantsLoginAccount && $canCreateLoginSettings);

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
        } elseif ($request->boolean('create_login_account') || $linkedLogin) {
            $request->merge([
                'staff_access_permission_level' => $this->resolveRequestedStaffAccessPermissionLevel($request),
            ]);
        }

        $rules = [
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
                    Rule::unique('users', 'email')->ignore($linkedLogin?->id),
                ],
                'default_password' => [$linkedLogin ? 'nullable' : 'required', 'string', Password::defaults()],
                'staff_role_preset_key' => ['required', 'string', Rule::in(array_keys($entitlementService->getRolePresetDefaults()))],
                'staff_access_permission_level' => ['required', 'string', Rule::in(User::staffAccessPermissionLevels())],
                'staff_user_level' => ['nullable', 'string', Rule::in(User::staffUserLevelValidationValues())],
                'module_overrides' => ['nullable', 'array'],
                'module_overrides.*' => ['boolean'],
            ]);
        }

        $validated = $request->validate($rules, [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ]);

        $supportedModules = $entitlementService->getSupportedStaffModules();
        $sendVerification = false;
        $createdLogin = false;
        $emailChanged = false;
        $passwordReset = false;
        $workspaceSuspended = false;
        $workspaceRestored = false;
        $auditBefore = $linkedLogin ? $this->buildStaffAccessSnapshot($linkedLogin) : null;
        $auditAfter = null;
        $auditChanges = [];

        DB::transaction(function () use ($employee, &$linkedLogin, $validated, $shouldManageLoginSettings, $supportedModules, $wantsLoginAccount, &$sendVerification, &$createdLogin, &$emailChanged, &$passwordReset, &$workspaceSuspended, &$workspaceRestored, &$auditAfter, $actor) {
            $employee->update([
                'name' => trim($validated['name']),
                'role' => trim($validated['role']),
                'salary' => $validated['salary'],
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

            $modulePermissions = collect($supportedModules)
                ->mapWithKeys(function (string $module) use ($validated) {
                    return [$module => (bool) data_get($validated, "module_overrides.{$module}", false)];
                })
                ->all();
            $modulePermissions = User::withWorkspaceAccessFlag($modulePermissions, $wantsLoginAccount);
            $modulePermissions = User::withStaffUserLevelFlag($modulePermissions, $validated['staff_user_level'] ?? null);
            $modulePermissions = User::withStaffAccessPermissionLevelFlag($modulePermissions, $validated['staff_access_permission_level'] ?? null);
            $modulePermissions = User::withManageStaffAccountsFlag(
                $modulePermissions,
                User::normalizeStaffAccessPermissionLevel($validated['staff_access_permission_level'] ?? null) === User::STAFF_ACCESS_PERMISSION_FULL
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
                $auditAfter = $this->buildStaffAccessSnapshot($linkedLogin);
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
                'seller_owner_id' => $this->sellerOwnerId(),
                'staff_role_preset_key' => $validated['staff_role_preset_key'],
                'staff_module_permissions' => $modulePermissions,
                'must_change_password' => true,
                'created_by_user_id' => $actor->id,
                'employee_id' => $employee->id,
                'email_verified_at' => null,
            ]);

            $sendVerification = true;
            $createdLogin = true;
            $auditAfter = $this->buildStaffAccessSnapshot($linkedLogin);
        });

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
                $auditChanges[] = 'Changed permission level to ' . $this->permissionLevelLabel($auditAfter['permission_level'] ?? null);
            }
            if (($auditBefore['role_preset_key'] ?? null) !== ($auditAfter['role_preset_key'] ?? null)) {
                $auditChanges[] = 'Changed role preset';
            }
            if (($auditBefore['modules'] ?? []) !== ($auditAfter['modules'] ?? [])) {
                $auditChanges[] = 'Updated module access';
            }
        }
        if ($createdLogin && $auditAfter !== null) {
            $auditChanges[] = 'Assigned ' . $this->permissionLevelLabel($auditAfter['permission_level'] ?? null) . ' permission level';
        }

        if ($createdLogin || $workspaceSuspended || $workspaceRestored || !empty($auditChanges)) {
            $event = $createdLogin
                ? 'login_created'
                : ($workspaceSuspended
                    ? 'login_suspended'
                    : ($workspaceRestored ? 'login_restored' : 'login_updated'));

            $this->recordStaffAccessAudit($seller, $actor, $event, $employee, $linkedLogin, [
                'changes' => array_values(array_unique($auditChanges)),
                'before' => $auditBefore,
                'after' => $auditAfter,
            ]);
        }

        if ($sendVerification && $linkedLogin?->exists) {
            try {
                $linkedLogin->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Updated staff verification email failed to send.', [
                    'staff_user_id' => $linkedLogin->id,
                    'email' => $linkedLogin->email,
                    'message' => $exception->getMessage(),
                ]);

                return redirect()->back()->with('error', 'Employee details were updated, but the verification email could not be sent right now.');
            }
        }

        return redirect()->back()->with('success', $this->buildEmployeeUpdateSuccessMessage(
            $createdLogin,
            $workspaceSuspended,
            $workspaceRestored,
            $emailChanged,
            $passwordReset
        ));
    }

    public function updateSettings(Request $request)
    {
        abort_unless($this->canEditHrRecords($this->sellerActor()), 403, 'Read-only HR access can only view records.');

        $request->validate([
            'overtime_rate' => 'required|numeric|min:0',
            'payroll_working_days' => 'required|integer|min:1|max:31',
        ]);

        User::where('id', $this->sellerOwnerId())->update([
            'overtime_rate' => $request->overtime_rate,
            'payroll_working_days' => $request->payroll_working_days,
        ]);

        return redirect()->back()->with('success', 'Payroll settings updated successfully.');
    }

    public function generatePayroll(Request $request)
    {
        abort_unless($this->canEditHrRecords($this->sellerActor()), 403, 'Read-only HR access can only view records.');

        $validated = $request->validate([
            'action' => ['nullable', 'string', Rule::in(['draft', 'submit'])],
            'month' => 'required|string',
            'pay_date' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'selected_employee_ids' => 'nullable|array',
            'selected_employee_ids.*' => 'required|integer|exists:employees,id',
            'items' => 'required|array',
            'items.*.employee_id' => 'required|exists:employees,id',
            'items.*.absences_days' => 'nullable|numeric|min:0',
            'items.*.undertime_hours' => 'nullable|numeric|min:0',
            'items.*.overtime_hours' => 'nullable|numeric|min:0',
            'items.*.isSelected' => 'nullable|boolean',
        ]);

        $selectedEmployeeIds = collect($validated['selected_employee_ids'] ?? [])
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values();

        $selectedItems = collect($validated['items'])
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
                    'undertime_hours' => (float) ($item['undertime_hours'] ?? 0),
                    'overtime_hours' => (float) ($item['overtime_hours'] ?? 0),
                ];
            })
            ->values()
            ->all();

        if (empty($selectedItems)) {
            return redirect()->back()->withErrors([
                'items' => 'Select at least one employee to generate payroll.',
            ]);
        }

        try {
            $payroll = DB::transaction(function () use ($validated, $selectedItems) {
                $totalAmount = 0;
                $employeeCount = count($selectedItems);
                $seller = $this->sellerOwner();
                $sellerId = $seller->id;
                $otRate = $seller->overtime_rate ?? 50.00;
                $action = $validated['action'] ?? 'submit';
                $isDraft = $action === 'draft';

                $payroll = Payroll::create(Payroll::filterSchemaCompatibleAttributes([
                    'user_id' => $sellerId,
                    'requested_by_user_id' => $this->sellerActor()->id,
                    'month' => $validated['month'],
                    'pay_date' => $validated['pay_date'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'total_amount' => 0,
                    'employee_count' => $employeeCount,
                    'status' => $isDraft ? 'Draft' : 'Pending',
                    'submitted_at' => $isDraft ? null : now(config('app.timezone')),
                ]));

                $workingDays = $seller->payroll_working_days ?? 22;

                foreach ($selectedItems as $item) {
                    $employee = Employee::where('user_id', $sellerId)->findOrFail($item['employee_id']);

                    $dailyRate = $employee->salary / $workingDays;
                    $hourlyRate = $dailyRate / 8;
                    $overtimePay = $item['overtime_hours'] * $otRate;
                    $absenceDeduction = $item['absences_days'] * $dailyRate;
                    $undertimeDeduction = $item['undertime_hours'] * $hourlyRate;
                    $netPay = $employee->salary + $overtimePay - $absenceDeduction - $undertimeDeduction;

                    if ($netPay < 0) {
                        $netPay = 0;
                    }

                    $daysWorked = max(0, $workingDays - $item['absences_days']);

                    PayrollItem::create(PayrollItem::filterSchemaCompatibleAttributes([
                        'payroll_id' => $payroll->id,
                        'employee_id' => $employee->id,
                        'base_salary' => $employee->salary,
                        'days_worked' => round($daysWorked),
                        'absences_days' => round($item['absences_days']),
                        'absence_deduction' => $absenceDeduction,
                        'undertime_hours' => $item['undertime_hours'],
                        'undertime_deduction' => $undertimeDeduction,
                        'overtime_hours' => $item['overtime_hours'],
                        'overtime_pay' => $overtimePay,
                        'bonus' => 0,
                        'net_pay' => $netPay,
                    ]));

                    $totalAmount += $netPay;
                }

                $payroll->update(['total_amount' => $totalAmount]);

                if (!$isDraft) {
                    $this->notifyAccountingOfPayrollRun($payroll, $seller, $validated['month']);
                }

                return $payroll;
            });

            return redirect()
                ->route('hr.payroll.show', $payroll)
                ->with('success', ($validated['action'] ?? 'submit') === 'draft'
                    ? 'Payroll draft saved.'
                    : 'Payroll generated successfully! Waiting for Accounting approval.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to generate payroll: ' . $e->getMessage());
        }
    }

    public function showPayroll(Payroll $payroll): Response
    {
        $seller = $this->sellerOwner();
        abort_unless((int) $payroll->user_id === (int) $seller->id, 404);

        return Inertia::render('Seller/PayrollRunShow', [
            'payroll' => $this->serializePayrollRun($payroll->loadMissing(['items.employee', 'requester']), $seller),
        ]);
    }

    public function submitPayrollRun(Payroll $payroll)
    {
        $seller = $this->sellerOwner();
        abort_unless((int) $payroll->user_id === (int) $seller->id, 404);

        if ($payroll->status !== 'Draft') {
            return back()->with('error', 'Only draft payroll runs can be submitted.');
        }

        $payroll->update(Payroll::filterSchemaCompatibleAttributes([
            'status' => 'Pending',
            'submitted_at' => now(config('app.timezone')),
        ]));

        $this->notifyAccountingOfPayrollRun($payroll->fresh(['requester']), $seller, $payroll->month);

        return redirect()
            ->route('hr.payroll.show', $payroll)
            ->with('success', 'Payroll request sent to Accounting.');
    }

    public function destroyPayroll($id)
    {
        abort_unless($this->canEditHrRecords($this->sellerActor()), 403, 'Read-only HR access can only view records.');

        $payroll = Payroll::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id)
            ->firstOrFail();

        if (!in_array($payroll->status, ['Draft', 'Pending', 'Rejected'], true)) {
            return redirect()->back()->with('error', 'Only draft, pending, or rejected payroll runs can be deleted.');
        }

        $payroll->delete();

        return redirect()->route('hr.index')->with('success', 'Payroll request deleted.');
    }

    private function rolePresetOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'hr' => ['label' => 'HR', 'description' => 'HR records, payroll, and employee management.'],
            'accounting' => ['label' => 'Accounting', 'description' => 'Funds, payroll approval, and finance visibility.'],
            'procurement' => ['label' => 'Procurement', 'description' => 'Inventory and stock request coordination.'],
            'customer_support' => ['label' => 'Customer Support', 'description' => 'Orders, buyer messages, and customer review handling.'],
            'custom' => ['label' => 'Custom', 'description' => 'Start blank and choose modules manually.'],
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

    private function moduleOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'overview' => ['label' => 'Overview', 'description' => 'Seller dashboard overview.'],
            'products' => ['label' => 'Products', 'description' => 'Product manager and stock actions.'],
            'analytics' => ['label' => 'Analytics', 'description' => 'Sales and product performance reports.'],
            '3d' => ['label' => '3D Manager', 'description' => '3D asset uploads and management.'],
            'orders' => ['label' => 'Orders', 'description' => 'Order processing and status updates.'],
            'messages' => ['label' => 'Messages', 'description' => 'Buyer inbox and seller order conversations.'],
            'reviews' => ['label' => 'Reviews', 'description' => 'Customer review replies and moderation.'],
            'shop_settings' => ['label' => 'Shop Settings', 'description' => 'Seller storefront profile settings.'],
            'hr' => ['label' => 'HR', 'description' => 'Employees, payroll, and HR records.'],
            'accounting' => ['label' => 'Accounting', 'description' => 'Finance approvals and payroll visibility.'],
            'procurement' => ['label' => 'Procurement', 'description' => 'Inventory and purchasing workflows.'],
            'stock_requests' => ['label' => 'Stock Requests', 'description' => 'Restock request tracking.'],
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

    private function supportsStaffProvisioningSchema(): bool
    {
        return Schema::hasColumn('users', 'seller_owner_id')
            && Schema::hasColumn('users', 'staff_role_preset_key')
            && Schema::hasColumn('users', 'staff_module_permissions')
            && Schema::hasColumn('users', 'must_change_password')
            && Schema::hasColumn('users', 'created_by_user_id')
            && Schema::hasColumn('users', 'employee_id');
    }

    private function supportsStaffAccessAuditSchema(): bool
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
    private function userLevelOptions(): array
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
                'description' => 'Can manage employee logins and staff permissions inside HR when HR access is enabled.',
            ],
        ];
    }

    private function buildEmployeeUpdateSuccessMessage(
        bool $createdLogin,
        bool $workspaceSuspended,
        bool $workspaceRestored,
        bool $emailChanged,
        bool $passwordReset
    ): string {
        if ($createdLogin) {
            return 'Employee updated and seller login created. A verification email was sent.';
        }

        if ($workspaceSuspended) {
            return $this->appendLoginUpdateFollowUps(
                'Employee updated and seller workspace access suspended. The linked login was kept for future reactivation.',
                $emailChanged,
                $passwordReset
            );
        }

        if ($workspaceRestored) {
            return $this->appendLoginUpdateFollowUps(
                'Employee updated and seller workspace access restored.',
                $emailChanged,
                $passwordReset
            );
        }

        $baseMessage = ($emailChanged || $passwordReset)
            ? 'Employee and seller login updated successfully.'
            : 'Employee details updated successfully.';

        return $this->appendLoginUpdateFollowUps($baseMessage, $emailChanged, $passwordReset);
    }

    private function appendLoginUpdateFollowUps(string $message, bool $emailChanged, bool $passwordReset): string
    {
        $followUps = [];

        if ($emailChanged) {
            $followUps[] = 'A verification email was sent to the updated address.';
        }

        if ($passwordReset) {
            $followUps[] = 'The employee must change the new password on next sign-in.';
        }

        if (empty($followUps)) {
            return $message;
        }

        return $message . ' ' . implode(' ', $followUps);
    }

    private function canEditHrRecords(User $actor): bool
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

        return $actor->getStaffAccessPermissionLevel() !== User::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    private function permissionLevelLabel(?string $level): string
    {
        return match (User::normalizeStaffAccessPermissionLevel($level)) {
            User::STAFF_ACCESS_PERMISSION_UPDATE => 'Update Access',
            User::STAFF_ACCESS_PERMISSION_FULL => 'Full Access',
            default => 'Read Only',
        };
    }

    private function resolveRequestedStaffAccessPermissionLevel(Request $request): string
    {
        if ($request->boolean('manage_staff_accounts')) {
            return User::STAFF_ACCESS_PERMISSION_FULL;
        }

        return User::normalizeStaffUserLevel($request->input('staff_user_level')) === User::STAFF_MANAGER_USER_LEVEL
            ? User::STAFF_ACCESS_PERMISSION_FULL
            : User::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildStaffAccessSnapshot(User $staffUser): array
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
    private function recordStaffAccessAudit(User $seller, User $actor, string $event, Employee $employee, ?User $staffUser, array $details = []): void
    {
        if (!$this->supportsStaffAccessAuditSchema()) {
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

    private function notifyAccountingOfPayrollRun(Payroll $payroll, User $seller, string $month): void
    {
        $requesterName = $this->sellerActor()->name ?: 'A staff member';
        $message = "{$requesterName} submitted the payroll request for {$month} for accounting approval.";

        $this->accountingRecipientsForSeller($seller)->each(function (User $recipient) use ($payroll, $message) {
            $recipient->notify(new AccountingApprovalRequestedNotification(
                'New Payroll Request',
                $message,
                route('accounting.index'),
                'payroll',
                $payroll->id,
            ));
        });
    }

    private function serializePayrollRun(Payroll $payroll, User $seller): array
    {
        $workingDays = max((int) ($seller->payroll_working_days ?? 22), 1);

        $lineItems = $payroll->items->map(function (PayrollItem $item) use ($workingDays) {
            $dailyRate = $workingDays > 0 ? ((float) $item->base_salary / $workingDays) : 0;
            $hourlyRate = $dailyRate / 8;
            $absenceDeduction = round((float) ($item->absences_days ?? 0) * $dailyRate, 2);
            $undertimeDeduction = round((float) ($item->undertime_hours ?? 0) * $hourlyRate, 2);

            return [
                'id' => $item->id,
                'employee_name' => $item->employee?->name ?? "Employee #{$item->employee_id}",
                'employee_role' => $item->employee?->role,
                'base_salary' => (float) $item->base_salary,
                'days_worked' => (float) $item->days_worked,
                'absences_days' => (float) ($item->absences_days ?? 0),
                'absence_deduction' => $absenceDeduction,
                'undertime_hours' => (float) ($item->undertime_hours ?? 0),
                'undertime_deduction' => $undertimeDeduction,
                'overtime_hours' => (float) ($item->overtime_hours ?? 0),
                'overtime_pay' => (float) $item->overtime_pay,
                'net_pay' => (float) $item->net_pay,
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
                'overtime' => (float) $lineItems->sum('overtime_pay'),
                'net_pay' => (float) $lineItems->sum('net_pay'),
            ],
            'line_items' => $lineItems->all(),
        ];
    }
}
