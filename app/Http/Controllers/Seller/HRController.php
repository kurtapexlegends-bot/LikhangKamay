<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\User;
use App\Services\StaffAttendanceService;
use App\Services\SellerEntitlementService;
use App\Services\OwnerApprovalService;
use App\Services\HR\PayrollCalculatorService;
use App\Services\HR\AttendanceAggregatorService;
use App\Actions\Seller\HR\CreateEmployeeAction;
use App\Actions\Seller\HR\UpdateEmployeeAction;
use App\Actions\Seller\HR\TerminateEmployeeAction;
use App\Actions\Seller\HR\ApproveAttendanceSession;
use App\Actions\Seller\HR\RejectAttendanceSession;
use App\Actions\Seller\HR\SubmitPayrollRun;
use App\Http\Requests\Seller\StoreEmployeeRequest;
use App\Http\Requests\Seller\UpdateEmployeeRequest;
use App\Http\Requests\Seller\HR\RejectAttendanceSessionRequest;
use App\Support\HRWorkflowHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Gate;

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

        abort_unless($seller->canManageStaff() || $seller->canAccessSellerModule('hr'), 403, 'Staff management is not included in your current subscription plan.');

        try {
            $activePeriod = HRWorkflowHelper::resolveActivePeriod($request);
            $employees = rescue(fn() => HRWorkflowHelper::getEmployeesWithAttendance($seller, $attendanceService, $activePeriod), collect());

            $payrolls = rescue(fn() => Payroll::with('requester:id,name')
                ->where('user_id', $seller->id)
                ->orderBy('created_at', 'desc')
                ->paginate(10), new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10));

            $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
            $canEditHrRecords = HRWorkflowHelper::canEditHrRecords($actor);
            $recentAccessAudits = rescue(fn() => HRWorkflowHelper::getRecentAccessAudits($seller), []);

            $locations = rescue(fn() => \App\Models\SellerLocation::where('user_id', $seller->id)->get(), collect());

            return Inertia::render('Seller/HR/HR', [
                'staff' => $employees,
                'payrolls' => $payrolls,
                'locations' => $locations,
                'staffAccessAudits' => $recentAccessAudits,
                'sellerSettings' => HRWorkflowHelper::buildSellerSettings($seller, $activePeriod),
                'staffProvisioning' => array_merge(
                    HRWorkflowHelper::buildStaffProvisioningData(
                        $actor,
                        $entitlementService,
                        $supportsProvisioning,
                        $canEditHrRecords
                    ),
                    [
                        'staffCount' => $seller->staffMembers()->count(),
                        'staffLimit' => $seller->getActiveStaffLimit(),
                        'canAddMoreStaff' => $seller->canAddMoreStaff(),
                    ]
                ),
            ]);
        } catch (\Throwable $e) {
            Log::error('HRController index error: ' . $e->getMessage(), [
                'exception' => $e
            ]);

            return Inertia::render('Seller/HR/HR', [
                'staff' => collect(),
                'payrolls' => new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10),
                'locations' => collect(),
                'staffAccessAudits' => [],
                'sellerSettings' => [
                    'overtime_rate' => 50.00,
                    'overtime_multiplier' => 1.25,
                    'payroll_factor_method' => 'custom',
                    'rest_day_ot_multiplier' => 1.69,
                    'holiday_ot_multiplier' => 2.60,
                    'payroll_working_days' => 22,
                    'standard_workday_hours' => 8.00,
                    'shift_start_time' => '08:00',
                    'shift_end_time' => '17:00',
                    'grace_period_minutes' => 15,
                    'break_window_start' => '11:30',
                    'break_window_end' => '13:30',
                    'break_allowance_minutes' => 60,
                    'attendance_month_label' => now()->format('F Y'),
                    'attendance_month_value' => now()->format('Y-m'),
                    'created_at' => now()->toIso8601String(),
                ],
                'staffProvisioning' => [
                    'supportsProvisioning' => false,
                    'canManageStaff' => false,
                    'rolePresets' => [],
                    'modules' => [],
                    'permissionLevels' => [],
                    'staffCount' => 0,
                    'staffLimit' => 0,
                    'canAddMoreStaff' => false,
                ],
            ]);
        }
    }

    public function store(
        StoreEmployeeRequest $request,
        CreateEmployeeAction $createEmployeeAction
    ) {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        $result = $createEmployeeAction->execute(
            $seller,
            $actor,
            $request->validated(),
            $request->input('employee_id')
        );

        if ($result['emailFailed']) {
            return redirect()->back()->with('error', $result['message']);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    public function destroyPayroll(Request $request, string $id)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access cannot delete payroll runs.');

        $payroll = Payroll::where('user_id', $seller->id)->findOrFail($id);

        if (in_array($payroll->status, ['Submitted', 'Approved', 'Paid'], true)) {
            return back()->with('error', 'Submitted or approved payroll runs cannot be deleted.');
        }

        $payroll->delete();

        return back()->with('success', 'Draft payroll run deleted.');
    }

    public function attendanceLogs(
        Request $request,
        Employee $employee,
        AttendanceAggregatorService $aggregator
    ) {
        $seller = $this->sellerOwner();

        abort_unless($employee->user_id === $seller->id, 403, 'Unauthorized employee access.');

        $startDate = $request->query('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', now()->endOfMonth()->toDateString());

        $summary = $aggregator->aggregateForPeriod($employee, $startDate, $endDate, $seller);

        return response()->json([
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'period_start' => $startDate,
            'period_end' => $endDate,
            'summary' => $summary,
        ]);
    }

    public function destroy(int $id, TerminateEmployeeAction $terminateEmployeeAction)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        $result = $terminateEmployeeAction->execute($seller, $actor, $id);

        return redirect()->back()->with('success', $result['message']);
    }

    public function toggleSuspension(int $id, StaffAttendanceService $attendanceService)
    {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();

        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access cannot change employee status.');
        abort_unless($actor->canManageStaffAccounts(), 403, 'Only the shop owner or a user with staff management access can suspend employees.');

        $supportsEmployeeLoginLinks = rescue(fn() => Schema::hasColumn('users', 'employee_id'), false);
        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->id === $actor->id) {
            abort(403, 'You cannot suspend your own staff account.');
        }

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->isSellerOwner()) {
            abort(403, 'Only the Shop Owner can manage owner accounts.');
        }

        $isCurrentlySuspended = strcasecmp((string) $employee->status, 'Suspended') === 0
            || ($linkedLogin && !$linkedLogin->isWorkspaceAccessEnabled());

        $newStatus = $isCurrentlySuspended ? 'Active' : 'Suspended';
        $workspaceAccessEnabled = $isCurrentlySuspended;

        DB::transaction(function () use ($employee, $linkedLogin, $newStatus, $workspaceAccessEnabled, $attendanceService) {
            $employee->update(['status' => $newStatus]);

            if ($linkedLogin) {
                $permissions = is_array($linkedLogin->staff_module_permissions) ? $linkedLogin->staff_module_permissions : [];
                $permissions[User::STAFF_WORKSPACE_ACCESS_FLAG] = $workspaceAccessEnabled;

                $linkedLogin->update([
                    'staff_module_permissions' => $permissions,
                ]);

                if (!$workspaceAccessEnabled) {
                    $attendanceService->closeOpenSession($linkedLogin, StaffAttendanceService::MODE_PAUSED);
                }
            }
        });

        $auditAction = $isCurrentlySuspended ? 'employee_reactivated' : 'employee_suspended';
        HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, $auditAction, $employee, $linkedLogin, [
            'changes' => [
                $isCurrentlySuspended ? 'Reactivated employee and restored workspace access' : 'Suspended employee and paused workspace access'
            ],
            'after' => $linkedLogin ? HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin->fresh()) : null,
        ]);

        $message = $isCurrentlySuspended
            ? "{$employee->name} has been reactivated successfully."
            : "{$employee->name} has been suspended. Workspace login and attendance are paused.";

        return redirect()->back()->with('success', $message);
    }

    public function update(
        UpdateEmployeeRequest $request,
        int $id,
        UpdateEmployeeAction $updateEmployeeAction
    ) {
        $actor = $this->sellerActor();
        $seller = $this->sellerOwner();
        $employee = $request->getEmployee();
        $linkedLogin = $request->getLinkedLogin();

        $result = $updateEmployeeAction->execute(
            $seller,
            $actor,
            $employee,
            $request->validated(),
            $request->shouldManageLoginSettings(),
            $request->wantsLoginAccount(),
            $linkedLogin,
            $request->input('employee_id')
        );

        if ($result['emailFailed']) {
            return redirect()->back()->with('error', $result['message']);
        }

        return redirect()->back()->with('success', $result['message']);
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
            'shift_start_time' => ['nullable', 'string', 'regex:/^(?:[01]\d|2[0-3]):[0-5]\d$/'],
            'shift_end_time' => ['nullable', 'string', 'regex:/^(?:[01]\d|2[0-3]):[0-5]\d$/'],
            'grace_period_minutes' => 'nullable|integer|min:0|max:120',
            'earliest_clock_in_minutes' => 'nullable|integer|min:0|max:120',
            'enforce_strict_shift_window' => 'nullable|boolean',
            'break_window_start' => ['nullable', 'string', 'regex:/^(?:[01]\d|2[0-3]):[0-5]\d$/'],
            'break_window_end' => ['nullable', 'string', 'regex:/^(?:[01]\d|2[0-3]):[0-5]\d$/'],
            'break_allowance_minutes' => 'nullable|integer|min:0|max:180',
        ]);

        User::where('id', $this->sellerOwnerId())->update([
            'overtime_rate' => $request->overtime_rate ?? 50.00,
            'overtime_multiplier' => $request->overtime_multiplier ?? 1.25,
            'payroll_factor_method' => $request->payroll_factor_method ?? 'custom',
            'rest_day_ot_multiplier' => $request->rest_day_ot_multiplier ?? 1.69,
            'holiday_ot_multiplier' => $request->holiday_ot_multiplier ?? 2.60,
            'payroll_working_days' => $request->payroll_working_days,
            'standard_workday_hours' => $request->standard_workday_hours ?? 8.00,
            'shift_start_time' => $request->shift_start_time ?? '08:00',
            'shift_end_time' => $request->shift_end_time ?? '17:00',
            'grace_period_minutes' => $request->grace_period_minutes ?? 15,
            'earliest_clock_in_minutes' => $request->earliest_clock_in_minutes ?? 30,
            'enforce_strict_shift_window' => $request->boolean('enforce_strict_shift_window', true),
            'break_window_start' => $request->break_window_start ?? '11:30',
            'break_window_end' => $request->break_window_end ?? '13:30',
            'break_allowance_minutes' => $request->break_allowance_minutes ?? 60,
        ]);

        return redirect()->back()->with('success', 'People & Payroll settings updated successfully.');
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

            $actor = $this->sellerActor();
            $seller = $this->sellerOwner();
            if (($validated['action'] ?? 'submit') !== 'draft' && ($actor->isStaff() || $actor->id !== $seller->id)) {
                $approvalService = app(OwnerApprovalService::class);
                $payload = $approvalService->buildPayrollPayload($payroll, $seller);
                $approvalService->submitRequest(
                    $seller,
                    $actor,
                    OwnerApproval::DOMAIN_HR_PAYROLL,
                    "Payroll Run: {$payroll->month}",
                    "Payroll run for {$payroll->month} ({$payroll->employee_count} employees, ₱" . number_format((float) $payroll->total_amount, 2) . ") submitted for owner review.",
                    $payroll,
                    $payload
                );
            }

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

    public function submitPayrollRun(Payroll $payroll, SubmitPayrollRun $action)
    {
        Gate::authorize('manage', $payroll);

        $result = $action->execute($payroll, $this->sellerOwner(), $this->sellerActor());

        if (!$result['success']) {
            return back()->with('error', $result['message']);
        }

        return redirect()
            ->route('hr.payroll.show', $payroll)
            ->with('success', $result['message']);
    }

    public function showTimeCardAudit(
        Request $request,
        Employee $employee,
        AttendanceAggregatorService $aggregator
    ): Response {
        $seller = $this->sellerOwner();
        $actor = $this->sellerActor();

        abort_unless($employee->user_id === $seller->id, 403, 'Unauthorized employee attendance access.');

        $rawMonth = (string) $request->input('month', now()->format('Y-m'));
        try {
            $parsedDate = \Carbon\Carbon::parse($rawMonth);
            $month = $parsedDate->format('Y-m');
        } catch (\Throwable) {
            $parsedDate = now();
            $month = $parsedDate->format('Y-m');
        }
        $start = $parsedDate->copy()->startOfMonth();
        $end = $parsedDate->copy()->endOfMonth();

        $summary = $aggregator->aggregateForPeriod($employee, $start, $end, $seller);
        $canEdit = HRWorkflowHelper::canEditHrRecords($actor);

        return Inertia::render('Seller/HR/TimeCardAudit', [
            'employee' => $employee->loadMissing(['assignedLocation', 'loginAccount']),
            'summary' => $summary,
            'selectedMonth' => $month,
            'canEdit' => $canEdit,
        ]);
    }

    public function approveAttendanceSession(
        \App\Models\StaffAttendanceSession $session,
        ApproveAttendanceSession $action
    ) {
        $session = $action->execute($session, $this->sellerActor());

        return response()->json([
            'message' => 'Attendance session approved successfully.',
            'session' => $session,
        ]);
    }

    public function rejectAttendanceSession(
        RejectAttendanceSessionRequest $request,
        \App\Models\StaffAttendanceSession $session,
        RejectAttendanceSession $action
    ) {
        $session = $action->execute($session, $this->sellerActor(), $request->validated('reason'));

        return response()->json([
            'message' => 'Attendance session rejected.',
            'session' => $session,
        ]);
    }
}
