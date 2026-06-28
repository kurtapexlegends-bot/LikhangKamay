<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Payroll;

class PayrollPolicy
{
    /**
     * Determine if the payroll can be viewed by the user.
     */
    public function view(User $user, Payroll $payroll): bool
    {
        return $user->getEffectiveSellerId() === $payroll->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('payroll.view')
                || $user->hasStaffCapability('payroll.manage')
                || $user->canEditSellerModule('accounting')
                || $user->canEditSellerModule('hr'));
    }

    /**
     * Determine if the payroll can be managed/updated/deleted by the user.
     */
    public function manage(User $user, Payroll $payroll): bool
    {
        return $user->getEffectiveSellerId() === $payroll->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('payroll.manage')
                || $user->canEditSellerModule('hr'));
    }

    /**
     * Determine if the payroll can be approved/released by the user.
     */
    public function approve(User $user, Payroll $payroll): bool
    {
        return $user->getEffectiveSellerId() === $payroll->user_id
            && ($user->isSellerOwner()
                || $user->canEditSellerModule('accounting'));
    }

    /**
     * Determine if the payroll can be rejected by the user.
     */
    public function reject(User $user, Payroll $payroll): bool
    {
        return $this->approve($user, $payroll);
    }

    /**
     * Determine if the user can create/generate payroll.
     */
    public function create(User $user): bool
    {
        return $user->isSellerOwner()
            || $user->hasStaffCapability('payroll.manage')
            || $user->canEditSellerModule('hr');
    }
}
