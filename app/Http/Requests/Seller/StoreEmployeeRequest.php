<?php

namespace App\Http\Requests\Seller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\EmployeeDocument;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    use InteractsWithSellerContext;

    public function authorize(): bool
    {
        $actor = $this->sellerActor();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

        if ($this->boolean('create_login_account')) {
            abort_unless($actor->canCreateStaffAccounts(), 403, 'Only the shop owner or a user with editable Employees & Payroll access can create staff login accounts.');
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        HRWorkflowHelper::sanitizeAndPrepareProvisionRequest($this);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->boolean('create_login_account')) {
                if (!HRWorkflowHelper::supportsStaffProvisioningSchema()) {
                    $validator->errors()->add(
                        'create_login_account',
                        'Staff login provisioning needs the latest database migration before it can be used.'
                    );
                }

                if (!$this->sellerOwner()->canAddMoreStaff()) {
                    $limit = $this->sellerOwner()->getActiveStaffLimit();
                    $validator->errors()->add(
                        'create_login_account',
                        "Your current plan allows up to {$limit} staff accounts. Upgrade to unlock more staff seats."
                    );
                }
            }

            $stagedFiles = collect($this->file('staged_documents', []))->pluck('file')->filter();
            if ($stagedFiles->isNotEmpty()) {
                $totalBytes = $stagedFiles->sum(fn ($file) => (int) ($file->getSize() ?? 0));
                if ($totalBytes > 4 * 1024 * 1024) {
                    $validator->errors()->add(
                        'staged_documents',
                        'Combined initial document uploads must stay under 4MB. Save the employee first and upload extra documents separately.'
                    );
                }
            }
        });
    }

    public function rules(SellerEntitlementService $entitlementService): array
    {
        $sellerOwnerId = $this->sellerOwnerId();
        $keyPattern = '#^employee_documents/' . preg_quote((string) $sellerOwnerId, '#') . '/[A-Za-z0-9\-]+\.(jpg|jpeg|png|webp|pdf)$#i';

        return array_merge(
            HRWorkflowHelper::getProvisionValidationRules(
                $this->sellerOwner(),
                $entitlementService,
                null,
                null,
                $this->boolean('create_login_account')
            ),
            [
                'staged_documents' => ['nullable', 'array', 'max:10'],
                'staged_documents.*.document_type' => ['required', 'string', Rule::in(array_keys(EmployeeDocument::documentTypes()))],
                'staged_documents.*.title' => ['nullable', 'string', 'max:150'],
                'staged_documents.*.expires_at' => ['nullable', 'date'],
                'staged_documents.*.notes' => ['nullable', 'string', 'max:500'],
                'staged_documents.*.original_filename' => ['nullable', 'string', 'max:255'],
                'staged_documents.*.document_key' => ['nullable', 'required_without:staged_documents.*.file', 'string', 'max:255', "regex:{$keyPattern}"],
                'staged_documents.*.file' => ['nullable', 'required_without:staged_documents.*.document_key', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:4096'],
            ]
        );
    }

    public function messages(): array
    {
        return [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ];
    }
}
