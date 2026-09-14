<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\Log;
use Throwable;

class UpdateEmployeeAction
{
    public function __construct(
        protected SellerEntitlementService $entitlementService,
        protected ProvisionStaffAccount $provisioner
    ) {}

    /**
     * Update employee record and synchronize linked login/module settings.
     *
     * @param array<string, mixed> $validated
     * @return array{success: bool, message: string, employee: Employee, linkedLogin: User|null, emailFailed: bool}
     */
    public function execute(
        User $seller,
        User $actor,
        Employee $employee,
        array $validated,
        bool $shouldManageLoginSettings,
        bool $wantsLoginAccount,
        ?User $linkedLogin = null,
        ?int $employeeId = null
    ): array {
        $supportedModules = $this->entitlementService->getSupportedStaffModules();
        $auditBefore = $linkedLogin ? HRWorkflowHelper::buildStaffAccessSnapshot($linkedLogin) : null;

        $result = $this->provisioner->update(
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

        $emailFailed = false;
        if ($result['sendVerification'] && $linkedLogin?->exists) {
            try {
                $linkedLogin->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Updated staff verification code email failed to send.', [
                    'staff_user_id' => $linkedLogin->id,
                    'email' => $linkedLogin->email,
                    'message' => $exception->getMessage(),
                ]);
                $emailFailed = true;
            }
        }

        if ($emailFailed) {
            return [
                'success' => true,
                'message' => 'Employee details were updated, but the verification code could not be sent right now.',
                'employee' => $employee,
                'linkedLogin' => $linkedLogin,
                'emailFailed' => true,
            ];
        }

        $message = HRWorkflowHelper::buildEmployeeUpdateSuccessMessage(
            $result['createdLogin'],
            $result['workspaceSuspended'],
            $result['workspaceRestored'],
            $result['emailChanged'],
            $result['passwordReset']
        );

        if (!empty($result['pendingRateApproval'])) {
            $message .= ' The salary adjustment was submitted for owner review.';
        }

        return [
            'success' => true,
            'message' => $message,
            'employee' => $employee,
            'linkedLogin' => $linkedLogin,
            'emailFailed' => false,
        ];
    }
}
