<?php

namespace App\Policies;

use App\Models\User;
use App\Models\StockRequest;

class StockRequestPolicy
{
    /**
     * Determine if the user can view any stock requests.
     */
    public function viewAny(User $user): bool
    {
        return $user->isSellerOwner()
            || $user->hasStaffCapability('inventory.manage')
            || $user->canEditSellerModule('procurement')
            || $user->canEditSellerModule('accounting')
            || $user->getStaffModuleAccessLevel('procurement') !== null
            || $user->getStaffModuleAccessLevel('accounting') !== null;
    }

    /**
     * Determine if the stock request can be viewed by the user.
     */
    public function view(User $user, StockRequest $stockRequest): bool
    {
        return $user->getEffectiveSellerId() === $stockRequest->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('inventory.manage')
                || $user->canEditSellerModule('procurement')
                || $user->canEditSellerModule('accounting')
                || $user->getStaffModuleAccessLevel('procurement') !== null
                || $user->getStaffModuleAccessLevel('accounting') !== null);
    }

    /**
     * Determine if the stock request can be managed/updated/received by the user.
     */
    public function manage(User $user, StockRequest $stockRequest): bool
    {
        return $user->getEffectiveSellerId() === $stockRequest->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('inventory.manage')
                || $user->canEditSellerModule('procurement'));
    }

    /**
     * Determine if the stock request can be approved/released by the user.
     */
    public function approve(User $user, StockRequest $stockRequest): bool
    {
        return $user->getEffectiveSellerId() === $stockRequest->user_id
            && ($user->isSellerOwner()
                || $user->canEditSellerModule('accounting'));
    }

    /**
     * Determine if the stock request can be rejected by the user.
     */
    public function reject(User $user, StockRequest $stockRequest): bool
    {
        return $this->approve($user, $stockRequest);
    }

    /**
     * Determine if the user can create a stock request.
     */
    public function create(User $user): bool
    {
        return $user->isSellerOwner()
            || $user->hasStaffCapability('inventory.manage')
            || $user->canEditSellerModule('procurement');
    }
}
