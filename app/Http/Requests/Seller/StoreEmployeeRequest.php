<?php

namespace App\Http\Requests\Seller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    use InteractsWithSellerContext;

    public function authorize(): bool
    {
        $actor = $this->sellerActor();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

        if ($this->boolean('create_login_account')) {
            abort_unless($actor->canCreateStaffAccounts(), 403, 'Only the shop owner or a user with editable People & Payroll access can create staff login accounts.');
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
        });
    }

    public function rules(SellerEntitlementService $entitlementService): array
    {
        return HRWorkflowHelper::getProvisionValidationRules(
            $this->sellerOwner(),
            $entitlementService,
            null,
            null,
            $this->boolean('create_login_account')
        );
    }

    public function messages(): array
    {
        return [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ];
    }
}
