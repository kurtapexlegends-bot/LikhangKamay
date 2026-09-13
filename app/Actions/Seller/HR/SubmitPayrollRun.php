<?php

declare(strict_types=1);

namespace App\Actions\Seller\HR;

use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\User;
use App\Services\OwnerApprovalService;
use App\Support\HRWorkflowHelper;

class SubmitPayrollRun
{
    public function __construct(
        private readonly OwnerApprovalService $approvalService
    ) {}

    /**
     * Submit a draft payroll run to Accounting and initiate owner approval if required.
     *
     * @return array{success: bool, message: string}
     */
    public function execute(Payroll $payroll, User $seller, User $actor): array
    {
        if ($payroll->status !== 'Draft') {
            return [
                'success' => false,
                'message' => 'Only draft payroll runs can be submitted.',
            ];
        }

        $payroll->update(Payroll::filterSchemaCompatibleAttributes([
            'status' => 'Pending',
            'submitted_at' => now(config('app.timezone')),
        ]));

        HRWorkflowHelper::notifyAccountingOfPayrollRun($payroll->fresh(['requester']), $seller, $payroll->month, $actor);

        if ($actor->isStaff() || $actor->id !== $seller->id) {
            $alreadyExists = OwnerApproval::query()
                ->where('seller_id', $seller->id)
                ->where('domain', OwnerApproval::DOMAIN_HR_PAYROLL)
                ->where('approvable_type', Payroll::class)
                ->where('approvable_id', $payroll->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->exists();

            if (!$alreadyExists) {
                $payload = $this->approvalService->buildPayrollPayload($payroll, $seller);
                $this->approvalService->submitRequest(
                    $seller,
                    $actor,
                    OwnerApproval::DOMAIN_HR_PAYROLL,
                    "Payroll Run: {$payroll->month}",
                    "Payroll run for {$payroll->month} ({$payroll->employee_count} employees, ₱" . number_format((float) $payroll->total_amount, 2) . ") submitted for owner review.",
                    $payroll,
                    $payload
                );
            }
        }

        return [
            'success' => true,
            'message' => 'Payroll request sent to Accounting.',
        ];
    }
}
