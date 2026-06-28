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
use Illuminate\Support\Facades\Gate;
use Throwable;

class HRController extends Controller
{
    use InteractsWithSellerContext;

    public function index(
        Request $request,
        SellerEntitlementService $entitlementService,
        StaffAttendanceService $attendanceService
    ): Response {
        $seller = $this->sellerOwner();
        $actor = $this->sellerActor();

        $activePeriod = HRWorkflowHelper::resolveActivePeriod($request);
        $employees = HRWorkflowHelper::getEmployeesWithAttendance($seller, $attendanceService, $activePeriod);

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
            'sellerSettings' => HRWorkflowHelper::buildSellerSettings($seller, $activePeriod),
            'staffProvisioning' => HRWorkflowHelper::buildStaffProvisioningData(
                $actor,
                $entitlementService,
                $supportsProvisioning,
                $canEditHrRecords
            ),
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

        HRWorkflowHelper::sanitizeAndPrepareProvisionRequest($request);

        if ($request->boolean('create_login_account')) {
            if (!HRWorkflowHelper::supportsStaffProvisioningSchema()) {
                return back()
                    ->withErrors([
                        'create_login_account' => 'Staff login provisioning needs the latest database migration before it can be used.',
                    ])
                    ->withInput();
            }

            abort_unless($actor->canCreateStaffAccounts(), 403, 'Only the shop owner or a user with editable People & Payroll access can create staff login accounts.');
        }

        $rules = HRWorkflowHelper::getProvisionValidationRules($seller, $entitlementService, null, null, $request->boolean('create_login_account'));

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

        HRWorkflowHelper::sanitizeAndPrepareProvisionRequest($request);

        $rules = HRWorkflowHelper::getProvisionValidationRules($seller, $entitlementService, $employee, $linkedLogin, $shouldManageLoginSettings);

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

        HRWorkflowHelper::handleUpdateAuditLog($seller, $actor, $employee, $linkedLogin, $auditBefore, $result);

        if ($result['sendVerification'] && $linkedLogin?->exists) {
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
            $result['createdLogin'],
            $result['workspaceSuspended'],
            $result['workspaceRestored'],
            $result['emailChanged'],
            $result['passwordReset']
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
            'standard_workday_hours' => 'required|numeric|min:4|max:12',
        ]);

        User::where('id', $this->sellerOwnerId())->update([
            'overtime_rate' => $request->overtime_rate,
            'overtime_multiplier' => $request->overtime_multiplier ?? 1.25,
            'payroll_factor_method' => $request->payroll_factor_method ?? 'custom',
            'rest_day_ot_multiplier' => $request->rest_day_ot_multiplier ?? 1.69,
            'holiday_ot_multiplier' => $request->holiday_ot_multiplier ?? 2.60,
            'payroll_working_days' => $request->payroll_working_days,
            'standard_workday_hours' => $request->standard_workday_hours ?? 8.00,
        ]);

        return redirect()->back()->with('success', 'Payroll settings updated successfully.');
    }

    public function generatePayroll(Request $request, PayrollCalculatorService $payrollService)
    {
        $key = 'generate-payroll:' . \Illuminate\Support\Facades\Auth::id();
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = \Illuminate\Support\Facades\RateLimiter::availableIn($key);
            return redirect()->back()->with('error', "Too many payroll generation requests. Please try again in {$seconds} seconds.");
        }
        \Illuminate\Support\Facades\RateLimiter::hit($key, 60);

        Gate::authorize('create', Payroll::class);

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

        $selectedItems = HRWorkflowHelper::parseSelectedPayrollItems($validated);

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
        Gate::authorize('view', $payroll);
        $seller = $this->sellerOwner();

        return Inertia::render('Seller/HR/PayrollRunShow', [
            'payroll' => HRWorkflowHelper::serializePayrollRun($payroll->loadMissing([
                'items.employee' => fn($query) => $query->withTrashed(),
                'requester'
            ]), $seller),
        ]);
    }

    public function submitPayrollRun(Payroll $payroll)
    {
        Gate::authorize('manage', $payroll);

        $seller = $this->sellerOwner();

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
        $payroll = Payroll::findOrFail($id);
        Gate::authorize('manage', $payroll);

        if (!in_array($payroll->status, ['Draft', 'Pending', 'Rejected'], true)) {
            return redirect()->back()->with('error', 'Only draft, pending, or rejected payroll runs can be deleted.');
        }

        $payroll->delete();

        return redirect()->route('hr.index')->with('success', 'Payroll request deleted.');
    }
}
