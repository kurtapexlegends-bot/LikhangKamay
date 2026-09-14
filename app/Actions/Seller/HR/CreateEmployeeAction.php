<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\Log;
use Throwable;

class CreateEmployeeAction
{
    public function __construct(
        protected SellerEntitlementService $entitlementService,
        protected ProvisionStaffAccount $provisioner
    ) {}

    /**
     * Create an employee and optionally provision linked staff login credentials.
     *
     * @param array<string, mixed> $validated
     * @return array{success: bool, message: string, employee: Employee|null, staffAccount: User|null, emailFailed: bool}
     */
    public function execute(User $seller, User $actor, array $validated, ?int $employeeId = null): array
    {
        $supportedModules = $this->entitlementService->getSupportedStaffModules();

        $result = $this->provisioner->create($validated, $supportedModules, $seller, $actor, $employeeId);
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

                return [
                    'success' => true,
                    'message' => 'Employee and staff login were created, but the verification code could not be sent right now.',
                    'employee' => $employee,
                    'staffAccount' => $staffAccount,
                    'emailFailed' => true,
                ];
            }

            return [
                'success' => true,
                'message' => 'Employee and staff login created. A verification code was sent.',
                'employee' => $employee,
                'staffAccount' => $staffAccount,
                'emailFailed' => false,
            ];
        }

        return [
            'success' => true,
            'message' => 'Employee added successfully.',
            'employee' => $employee,
            'staffAccount' => null,
            'emailFailed' => false,
        ];
    }
}
