<?php

namespace App\Http\Requests\Seller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\User;
use App\Services\SellerEntitlementService;
use App\Support\HRWorkflowHelper;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;

class UpdateEmployeeRequest extends FormRequest
{
    use InteractsWithSellerContext;

    protected ?Employee $cachedEmployee = null;
    protected ?User $cachedLinkedLogin = null;
    protected bool $resolvedLinkedLogin = false;

    public function getEmployee(): Employee
    {
        if ($this->cachedEmployee !== null) {
            return $this->cachedEmployee;
        }

        $id = (int) $this->route('id');
        $supportsEmployeeLoginLinks = rescue(fn() => Schema::hasColumn('users', 'employee_id'), false);

        $employeeQuery = Employee::query()
            ->where('user_id', $this->sellerOwnerId())
            ->where('id', $id);

        if ($supportsEmployeeLoginLinks) {
            $employeeQuery->with('loginAccount');
        }

        $this->cachedEmployee = $employeeQuery->firstOrFail();

        return $this->cachedEmployee;
    }

    public function getLinkedLogin(): ?User
    {
        if ($this->resolvedLinkedLogin) {
            return $this->cachedLinkedLogin;
        }

        $employee = $this->getEmployee();
        $supportsEmployeeLoginLinks = rescue(fn() => Schema::hasColumn('users', 'employee_id'), false);
        $this->cachedLinkedLogin = $supportsEmployeeLoginLinks ? $employee->loginAccount : null;
        $this->resolvedLinkedLogin = true;

        return $this->cachedLinkedLogin;
    }

    public function shouldManageLoginSettings(): bool
    {
        $actor = $this->sellerActor();
        $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
        $canManageLoginSettings = $actor->canUpdateStaffAccounts() && $supportsProvisioning;
        $canCreateLoginSettings = $actor->canCreateStaffAccounts() && $supportsProvisioning;

        $linkedLogin = $this->getLinkedLogin();
        $wantsLoginAccount = $linkedLogin
            ? ($canManageLoginSettings ? $this->boolean('create_login_account', $linkedLogin->isWorkspaceAccessEnabled()) : $linkedLogin->isWorkspaceAccessEnabled())
            : $this->boolean('create_login_account');

        return $linkedLogin
            ? $canManageLoginSettings
            : ($wantsLoginAccount && $canCreateLoginSettings);
    }

    public function wantsLoginAccount(): bool
    {
        $actor = $this->sellerActor();
        $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
        $canManageLoginSettings = $actor->canUpdateStaffAccounts() && $supportsProvisioning;
        $linkedLogin = $this->getLinkedLogin();

        return $linkedLogin
            ? ($canManageLoginSettings ? $this->boolean('create_login_account', $linkedLogin->isWorkspaceAccessEnabled()) : $linkedLogin->isWorkspaceAccessEnabled())
            : $this->boolean('create_login_account');
    }

    public function authorize(): bool
    {
        $actor = $this->sellerActor();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

        $linkedLogin = $this->getLinkedLogin();
        $supportsProvisioning = HRWorkflowHelper::supportsStaffProvisioningSchema();
        $canManageLoginSettings = $actor->canUpdateStaffAccounts() && $supportsProvisioning;
        $canCreateLoginSettings = $actor->canCreateStaffAccounts() && $supportsProvisioning;
        $wantsLoginAccount = $this->wantsLoginAccount();

        if ($linkedLogin && $this->has('create_login_account') && !$canManageLoginSettings) {
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can update seller login access.');
        }

        if (!$linkedLogin && $wantsLoginAccount && !$canCreateLoginSettings) {
            abort(403, 'Only the shop owner or a user with editable People & Payroll access can create staff login accounts.');
        }

        // Self-elevation guard: Staff members cannot edit their own permission level or role preset
        if ($actor->isStaff() && $linkedLogin && $linkedLogin->id === $actor->id) {
            if ($this->has('staff_role_preset_key') && $this->input('staff_role_preset_key') !== $linkedLogin->staff_role_preset_key) {
                abort(403, 'You cannot modify your own staff permission level or role preset.');
            }
        }

        // Owner protection guard: Staff members cannot edit or delete the Shop Owner account
        if ($actor->isStaff() && $linkedLogin && $linkedLogin->isSellerOwner()) {
            abort(403, 'Only the Shop Owner can manage owner accounts.');
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
            $linkedLogin = $this->getLinkedLogin();
            $wantsLoginAccount = $this->wantsLoginAccount();

            if (!$linkedLogin && $wantsLoginAccount) {
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
            $this->getEmployee(),
            $this->getLinkedLogin(),
            $this->shouldManageLoginSettings()
        );
    }

    public function messages(): array
    {
        return [
            'email.regex' => 'Staff login accounts must use a Gmail address.',
        ];
    }
}
