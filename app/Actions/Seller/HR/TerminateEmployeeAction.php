<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TerminateEmployeeAction
{
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
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can remove staff login accounts.');
        }

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->id === $actor->id) {
            abort(403, 'You cannot delete your own staff account.');
        }

        if ($actor->isStaff() && $linkedLogin && $linkedLogin->isSellerOwner()) {
            abort(403, 'Only the Shop Owner can manage owner accounts.');
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

        return [
            'success' => true,
            'message' => 'Employee record removed.',
        ];
    }
}
