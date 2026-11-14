<?php

namespace App\Actions\Seller\HR;

use App\Models\Employee;
use App\Models\User;
use App\Services\HR\EmployeeDocumentService;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\Log;
use Throwable;

class CreateEmployeeAction
{
    public function __construct(
        protected SellerEntitlementService $entitlementService,
        protected ProvisionStaffAccount $provisioner,
        protected EmployeeDocumentService $documentService
    ) {}

    /**
     * Create an employee and optionally provision linked staff login credentials.
     *
     * @param array<string, mixed> $validated
     * @return array{success: bool, message: string, employee: Employee|null, staffAccount: User|null, emailFailed: bool, documentsFailed: bool}
     */
    public function execute(User $seller, User $actor, array $validated, ?string $employeeId = null): array
    {
        $supportedModules = $this->entitlementService->getSupportedStaffModules();

        $result = $this->provisioner->create($validated, $supportedModules, $seller, $actor, $employeeId);
        $employee = $result['employee'];
        $staffAccount = $result['staffAccount'];
        $documentsFailed = false;

        if ($employee instanceof Employee && !empty($validated['staged_documents']) && is_array($validated['staged_documents'])) {
            try {
                $this->documentService->storeStagedDocuments($seller, $actor, $employee, $validated['staged_documents']);
            } catch (Throwable $exception) {
                $documentsFailed = true;
                Log::error('Failed to save initial employee documents.', [
                    'employee_id' => $employee->id,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        if ($staffAccount && $employee instanceof Employee) {
            HRWorkflowHelper::recordStaffAccessAudit($seller, $actor, 'login_created', $employee, $staffAccount, [
                'changes' => [
                    'Created seller portal login',
                    'Assigned module-specific access levels',
                ],
                'after' => HRWorkflowHelper::buildStaffAccessSnapshot($staffAccount),
            ]);

            $emailFailed = false;
            try {
                $staffAccount->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                $emailFailed = true;
                Log::error('Staff verification code email failed to send.', [
                    'staff_user_id' => $staffAccount->id,
                    'email' => $staffAccount->email,
                    'message' => $exception->getMessage(),
                ]);
            }

            if ($emailFailed || $documentsFailed) {
                $message = match (true) {
                    $emailFailed && $documentsFailed => 'Employee and staff login were created, but the verification code and initial documents could not be saved.',
                    $emailFailed => 'Employee and staff login were created, but the verification code could not be sent right now.',
                    default => 'Employee and staff login were created, but initial documents failed to save. Please upload them again in Employee Records.',
                };

                return [
                    'success' => !$documentsFailed && !$emailFailed,
                    'message' => $message,
                    'employee' => $employee,
                    'staffAccount' => $staffAccount,
                    'emailFailed' => $emailFailed,
                    'documentsFailed' => $documentsFailed,
                ];
            }

            return [
                'success' => true,
                'message' => 'Employee and staff login created. A verification code was sent.',
                'employee' => $employee,
                'staffAccount' => $staffAccount,
                'emailFailed' => false,
                'documentsFailed' => false,
            ];
        }

        if ($documentsFailed) {
            return [
                'success' => false,
                'message' => 'Employee added, but initial documents failed to save. Please upload them again in Employee Records.',
                'employee' => $employee,
                'staffAccount' => null,
                'emailFailed' => false,
                'documentsFailed' => true,
            ];
        }

        return [
            'success' => true,
            'message' => 'Employee added successfully.',
            'employee' => $employee,
            'staffAccount' => null,
            'emailFailed' => false,
            'documentsFailed' => false,
        ];
    }
}
