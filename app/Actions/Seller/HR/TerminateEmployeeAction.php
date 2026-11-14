<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Services\HR\EmployeeDocumentService;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TerminateEmployeeAction
{
    public function __construct(
        protected EmployeeDocumentService $documentService
    ) {}

    /**
     * Terminate/delete an employee and remove their linked staff login.
     *
     * @return array{success: bool, message: string}
     */
    public function execute(User $seller, User $actor, int $employeeId): array
    {
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

        $supportsEmployeeLoginLinks = rescue(fn() => Schema::hasColumn('users', 'employee_id'), false);
        $employeeQuery = Employee::query()
            ->where('user_id', $seller->id)
            ->where('id', $employeeId);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $employee = $employeeQuery->firstOrFail();
        $linkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $linkedLoginSnapshot = $linkedLogin ? HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin) : null;

        if ($linkedLogin && !$actor->canDeleteStaffAccounts()) {
            abort(403, 'Only the shop owner or a user with editable Employees & Payroll access can remove staff login accounts.');
        }

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->id === $actor->id) {
            abort(403, 'You cannot delete your own staff account.');
        }

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->isSellerOwner()) {
            abort(403, 'Only the Shop Owner can manage owner accounts.');
        }

        $documentPaths = [];

        DB::transaction(function () use ($employee, $linkedLogin, &$documentPaths) {
            $documentPaths = $this->documentService->deleteAllRecordsForEmployee($employee);

            if ($linkedLogin) {
                $linkedLogin->update([
                    'suspended_at' => now(),
                    'suspension_reason' => 'Staff access revoked by shop owner',
                ]);
                $linkedLogin->delete();
            }

            $employee->delete();
        });

        if (!empty($documentPaths)) {
            $this->documentService->deleteStoredFiles($documentPaths);
        }

        if ($linkedLoginSnapshot !== null) {
            HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, 'login_removed', $employee, null, [
                'changes' => ['Revoked and archived seller portal login'],
                'before' => $linkedLoginSnapshot,
            ]);
        }

        return [
            'success' => true,
            'message' => 'Staff member access removed.',
        ];
    }
}
