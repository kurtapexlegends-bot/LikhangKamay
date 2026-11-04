<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Product;

class ProductPolicy
{
    /**
     * Determine if the user can view any products in the management panel.
     */
    public function viewAny(User $user): bool
    {
        return $user->isSellerOwner()
            || $user->hasStaffCapability('inventory.manage')
            || $user->canEditSellerModule('products')
            || $user->getStaffModuleAccessLevel('products') !== null;
    }

    /**
     * Determine if the product can be viewed by the user.
     */
    public function view(User $user, Product $product): bool
    {
        // Allow peer artisans with Supply Hub access to view published active B2B wholesale materials
        if ($product->is_b2b_supply && $product->status === 'Active' && $user->isArtisan()) {
            $seller = $user->getEffectiveSeller() ?? $user;
            if ($seller->canAccessSupplyHub()) {
                return true;
            }
        }

        return $user->getEffectiveSellerId() === $product->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('inventory.manage')
                || $user->canEditSellerModule('products')
                || $user->getStaffModuleAccessLevel('products') !== null);
    }

    /**
     * Determine if the product can be updated/managed by the user.
     */
    public function update(User $user, Product $product): bool
    {
        return $user->getEffectiveSellerId() === $product->user_id
            && ($user->isSellerOwner()
                || $user->hasStaffCapability('inventory.manage')
                || $user->canEditSellerModule('products'));
    }

    /**
     * Determine if the user can create products.
     */
    public function create(User $user): bool
    {
        return $user->isSellerOwner()
            || $user->hasStaffCapability('inventory.manage')
            || $user->canEditSellerModule('products');
    }
}
