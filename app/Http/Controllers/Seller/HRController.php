<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\StaffAccessAudit;
use App\Models\User;
use App\Services\StaffAttendanceService;
use App\Services\SellerEntitlementService;
use App\Services\HR\PayrollCalculatorService;
use App\Actions\Seller\HR\ProvisionStaffAccount;
use App\Support\HRWorkflowHelper;
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

    public function index(
        Request $request,
        SellerEntitlementService $entitlementService,
        StaffAttendanceService $attendanceService
    ): \Inertia\Response {
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        /** @var \App\Models\User $actor */
        $actor = $this->sellerActor();
        
        $monthQuery = $request->query('month');
        $parsedMonth = null;
        if ($monthQuery) {
            try {
                $parsedMonth = \Carbon\Carbon::parse($monthQuery);
            } catch (\Exception $e) {
                // ignore and fall back to null
            }
        }

        $activePeriod = $parsedMonth ?: now(config('app.timezone'));

        $employeeRecords = HRWorkflowHelper::getEmployeeRecordsWithLogin($seller);
        $attendanceSummaries = $attendanceService->buildEmployeeMonthlySummaries($employeeRecords, $seller, $parsedMonth);
        $employees = $attendanceService->transformEmployeeRecords($employeeRecords, $attendanceSummaries);

        $payrolls = Payroll::with('requester:id,name')
            ->where('user_id', $seller->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
        $canEditHrRecords = HRWorkflowHelper::canEditHrRecords($actor);
        $recentAccessAudits = HRWorkflowHelper::getRecentAccessAudits($seller);

        return Inertia::render('Seller/HR/HR', [
            'staff' => $employees,
            'payrolls' => $payrolls,
            'staffAccessAudits' => $recentAccessAudits,
            'sellerSettings' => [
                'overtime_rate' => $seller->overtime_rate ?? 50.00,
                'overtime_multiplier' => $seller->overtime_multiplier ?? 1.25,
                'payroll_factor_method' => $seller->payroll_factor_method ?? 'custom',
                'rest_day_ot_multiplier' => $seller->rest_day_ot_multiplier ?? 1.69,
                'holiday_ot_multiplier' => $seller->holiday_ot_multiplier ?? 2.60,
                'payroll_working_days' => $seller->payroll_working_days ?? 22,
                'attendance_month_label' => $activePeriod->format('F Y'),
                'attendance_month_value' => $activePeriod->format('Y-m'),
                'created_at' => $seller->created_at ? $seller->created_at->toIso8601String() : now(config('app.timezone'))->toIso8601String(),
            ],
            'staffProvisioning' => [
                'canEditHrRecords' => $canEditHrRecords,
                'canManageStaffAccounts' => $actor->canUpdateStaffAccounts() && $supportsProvisioning,
                'canCreateStaffAccounts' => $actor->canCreateStaffAccounts() && $supportsProvisioning,
                'canDeleteStaffAccounts' => $actor->canDeleteStaffAccounts() && $supportsProvisioning,
                'rolePresets' => HRWorkflowHelper::rolePresetOptions($entitlementService),
                'userLevels' => HRWorkflowHelper::userLevelOptions(),
                'availableModules' => HRWorkflowHelper::moduleOptions($entitlementService),
                'requiresStaffSchemaUpdate' => !$supportsProvisioning,
            ],
        ]);
    }

    public function store(
        Request $request,
        SellerEntitlementService $entitlementService,
        ProvisionStaffAccount $provisioner
    ) {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

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
                'staff_access_permission_level' => HRWorkflowHelper::resolveRequestedStaffAccessPermissionLevel($request),
            ]);
        }

        $sellerId = $this->sellerOwnerId();

        $rules = [
            'employee_id' => [
                'nullable',
                'string',
                'max:12',
                'regex:/^[A-Za-z0-9-]+$/',
                Rule::unique('employees', 'employee_id')->where('user_id', $sellerId)
            ],
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'salary' => ['required', 'numeric', 'min:0'],
            'create_login_account' => ['nullable', 'boolean'],
        ];

        if ($request->boolean('create_login_account')) {
            if (!HRWorkflowHelper::supportsStaffProvisioningSchema()) {
                return back()
                    ->withErrors([
                        'create_login_account' => 'Staff login provisioning needs the latest database migration before it can be used.',
                    ])
                    ->withInput();
            }

            abort_unless($actor->canCreateStaffAccounts(), 403, 'Only the shop owner or a user with editable People & Payroll access can create staff login accounts.');

            $rules = array_merge($rules, [
                'email' => ['required', 'string', 'email', 'max:255', 'regex:/^[A-Z0-9._%+-]+@gmail\.com$/i', 'unique:users,email'],
                'default_password' => ['required', 'string', Password::defaults()],
                'staff_role_preset_key' => ['required', 'string', Rule::in(array_keys($entitlementService->getRolePresetDefaults()))],
                'staff_access_permission_level' => ['nullable', 'string', Rule::in(User::staffAccessPermissionLevels())],
                'staff_user_level' => ['nullable', 'string', Rule::in(User::staffUserLevelValidationValues())],
                'module_overrides' => ['nullable', 'array'],
                'module_overrides.*' => ['nullable'],
            ]);
        }

        $validated = $request->validate($rules, [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ]);

        $supportedModules = $entitlementService->getSupportedStaffModules();
        $employeeId = $request->input('employee_id');

        $result = $provisioner->create($validated, $supportedModules, $seller, $actor, $employeeId);
        $employee = $result['employee'];
        $staffAccount = $result['staffAccount'];

        if ($staffAccount && $employee instanceof Employee) {
            HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, 'login_created', $employee, $staffAccount, [
                'changes' => [
                    'Created seller portal login',
                    'Assigned module-specific access levels',
                ],
                'after' => HRWorkflowHelper::buildStaffAccessSnapshot($staffAccount),
            ]);

            try {
                $staffAccount->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Staff verification code email failed to send.', [
                    'staff_user_id' => $staffAccount->id,
                    'email' => $staffAccount->email,
                    'message' => $exception->getMessage(),
                ]);

                return redirect()->back()->with('error', 'Employee and staff login were created, but the verification code could not be sent right now.');
            }

            return redirect()->back()->with('success', 'Employee and staff login created. A verification code was sent.');
        }

        return redirect()->back()->with('success', 'Employee added successfully.');
    }

    public function destroy(int $id)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $linkedLoginSnapshot = $linkedLogin ? HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin) : null;

        if ($linkedLogin && !$actor->canDeleteStaffAccounts()) {
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can remove staff login accounts.');
        }

        DB::transaction(function () use ($employee, $linkedLogin) {
            if ($linkedLogin) {
                $linkedLogin->delete();
            }

            $employee->delete();
        });

        if ($linkedLoginSnapshot !== null) {
            HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, 'login_removed', $employee, null, [
                'changes' => ['Removed seller portal login'],
                'before' => $linkedLoginSnapshot,
            ]);
        }

        return redirect()->back();
    }

    public function update(
        Request $request,
        int $id,
        SellerEntitlementService $entitlementService,
        ProvisionStaffAccount $provisioner
    ) {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');
        $supportsEmployeeLoginLinks = Schema::hasColumn('users', 'employee_id');
        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
        $canManageLoginSettings = $actor->canUpdateStaffAccounts() && $supportsProvisioning;
        $canCreateLoginSettings = $actor->canCreateStaffAccounts() && $supportsProvisioning;
        $wantsLoginAccount = $linkedLogin
            ? ($canManageLoginSettings ? $request->boolean('create_login_account', $linkedLogin->isWorkspaceAccessEnabled()) : $linkedLogin->isWorkspaceAccessEnabled())
            : $request->boolean('create_login_account');

        if ($linkedLogin && $request->has('create_login_account') && !$canManageLoginSettings) {
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can update seller login access.');
        }
        if (!$linkedLogin && $wantsLoginAccount && !$canCreateLoginSettings) {
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can create staff login accounts.');
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
                'staff_access_permission_level' => HRWorkflowHelper::resolveRequestedStaffAccessPermissionLevel($request),
            ]);
        }

        $sellerId = $this->sellerOwnerId();

        $rules = [
            'employee_id' => [
                'nullable',
                'string',
                'max:12',
                'regex:/^[A-Za-z0-9-]+$/',
                Rule::unique('employees', 'employee_id')->where('user_id', $sellerId)->ignore($employee->id)
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
                    Rule::unique('users', 'email')->ignore($linkedLogin?->id),
                ],
                'default_password' => [$linkedLogin ? 'nullable' : 'required', 'string', Password::defaults()],
                'staff_role_preset_key' => ['required', 'string', Rule::in(array_keys($entitlementService->getRolePresetDefaults()))],
                'staff_access_permission_level' => ['nullable', 'string', Rule::in(User::staffAccessPermissionLevels())],
                'staff_user_level' => ['nullable', 'string', Rule::in(User::staffUserLevelValidationValues())],
                'module_overrides' => ['nullable', 'array'],
                'module_overrides.*' => ['nullable'],
            ]);
        }

        $validated = $request->validate($rules, [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ]);

        $supportedModules = $entitlementService->getSupportedStaffModules();
        $employeeId = $request->input('employee_id');

        $auditBefore = $linkedLogin ? HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin) : null;

        $result = $provisioner->update(
            $employee,
            $validated,
            $supportedModules,
            $seller,
            $actor,
            $linkedLogin,
            $shouldManageLoginSettings,
            $wantsLoginAccount,
            $employeeId
        );

        $employee = $result['employee'];
        $linkedLogin = $result['linkedLogin'];
        $sendVerification = $result['sendVerification'];
        $createdLogin = $result['createdLogin'];
        $emailChanged = $result['emailChanged'];
        $passwordReset = $result['passwordReset'];
        $workspaceSuspended = $result['workspaceSuspended'];
        $workspaceRestored = $result['workspaceRestored'];
        $auditAfter = $result['auditAfter'];

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
                $auditChanges[] = 'Changed People & Payroll access to ' . HRWorkflowHelper::permissionLevelLabel($auditAfter['permission_level'] ?? null);
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

            HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, $event, $employee, $linkedLogin, [
                'changes' => array_values(array_unique($auditChanges)),
                'before' => $auditBefore,
                'after' => $auditAfter,
            ]);
        }

        if ($sendVerification && $linkedLogin?->exists) {
            try {
                $linkedLogin->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Updated staff verification code email failed to send.', [
                    'staff_user_id' => $linkedLogin->id,
                    'email' => $linkedLogin->email,
                    'message' => $exception->getMessage(),
                ]);

                return redirect()->back()->with('error', 'Employee details were updated, but the verification code could not be sent right now.');
            }
        }

        return redirect()->back()->with('success', HRWorkflowHelper::buildEmployeeUpdateSuccessMessage(
            $createdLogin,
            $workspaceSuspended,
            $workspaceRestored,
            $emailChanged,
            $passwordReset
        ));
    }

    public function updateSettings(Request $request)
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($this->sellerActor()), 403, 'Read-only people access can only view records.');

        $request->validate([
            'overtime_rate' => 'nullable|numeric|min:0',
            'overtime_multiplier' => 'nullable|numeric|min:0.01|max:10',
            'payroll_factor_method' => ['nullable', 'string', Rule::in(['custom', '261', '313'])],
            'rest_day_ot_multiplier' => 'nullable|numeric|min:0.01|max:10',
            'holiday_ot_multiplier' => 'nullable|numeric|min:0.01|max:10',
            'payroll_working_days' => 'required|integer|min:1|max:31',
        ]);

        User::where('id', $this->sellerOwnerId())->update([
            'overtime_rate' => $request->overtime_rate,
            'overtime_multiplier' => $request->overtime_multiplier ?? 1.25,
            'payroll_factor_method' => $request->payroll_factor_method ?? 'custom',
            'rest_day_ot_multiplier' => $request->rest_day_ot_multiplier ?? 1.69,
            'holiday_ot_multiplier' => $request->holiday_ot_multiplier ?? 2.60,
            'payroll_working_days' => $request->payroll_working_days,
        ]);

        return redirect()->back()->with('success', 'Payroll settings updated successfully.');
    }

    public function generatePayroll(Request $request, PayrollCalculatorService $payrollService)
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($this->sellerActor()), 403, 'Read-only people access can only view records.');

        $validated = $request->validate([
            'action' => ['nullable', 'string', Rule::in(['draft', 'submit', 'dry_run'])],
            'month' => 'required|string',
            'pay_date' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'selected_employee_ids' => 'nullable|array',
            'selected_employee_ids.*' => 'required|integer|exists:employees,id',
            'items' => 'required|array',
            'items.*.employee_id' => 'required|exists:employees,id',
            'items.*.absences_days' => 'nullable|numeric|min:0',
            'items.*.paid_leave_days' => 'nullable|numeric|min:0',
            'items.*.undertime_hours' => 'nullable|numeric|min:0',
            'items.*.overtime_hours' => 'nullable|numeric|min:0',
            'items.*.rest_day_ot_hours' => 'nullable|numeric|min:0',
            'items.*.holiday_ot_hours' => 'nullable|numeric|min:0',
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
                    'paid_leave_days' => (float) ($item['paid_leave_days'] ?? 0),
                    'undertime_hours' => (float) ($item['undertime_hours'] ?? 0),
                    'overtime_hours' => (float) ($item['overtime_hours'] ?? 0),
                    'rest_day_ot_hours' => (float) ($item['rest_day_ot_hours'] ?? 0),
                    'holiday_ot_hours' => (float) ($item['holiday_ot_hours'] ?? 0),
                ];
            })
            ->values()
            ->all();

        if (empty($selectedItems)) {
            return redirect()->back()->withErrors([
                'items' => 'Select at least one employee to generate payroll.',
            ]);
        }

        if (($validated['action'] ?? 'submit') === 'dry_run') {
            $dryRunData = $payrollService->dryRun($selectedItems, $this->sellerOwner(), $validated['month']);
            return response()->json($dryRunData);
        }

        try {
            $payroll = $payrollService->generate($selectedItems, $this->sellerOwner(), $this->sellerActor(), $validated);

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

        return Inertia::render('Seller/HR/PayrollRunShow', [
            'payroll' => HRWorkflowHelper::serializePayrollRun($payroll->loadMissing(['items.employee', 'requester']), $seller),
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

        HRWorkflowHelper::notifyAccountingOfPayrollRun($payroll->fresh(['requester']), $seller, $payroll->month, $this->sellerActor());

        return redirect()
            ->route('hr.payroll.show', $payroll)
            ->with('success', 'Payroll request sent to Accounting.');
    }

    public function destroyPayroll(int $id)
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($this->sellerActor()), 403, 'Read-only people access can only view records.');

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
}
