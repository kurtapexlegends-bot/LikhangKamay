<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Support\Collection;

trait InteractsWithSellerContext
{
    protected function sellerActor(): User
    {
        /** @var \App\Models\User|null $user */
        $user = request()->user();

        abort_unless($user, 403, 'Authentication required.');

        return $user;
    }

    protected function sellerOwner(): User
    {
        $seller = $this->sellerActor()->getEffectiveSeller();

        abort_unless($seller && $seller->isArtisan(), 403, 'Seller workspace access only.');

        return $seller;
    }

    protected function sellerOwnerId(): int
    {
        return $this->sellerOwner()->id;
    }

    protected function authorizeSellerOwnership(mixed $ownerId): void
    {
        abort_unless((int) $ownerId === $this->sellerOwnerId(), 403, 'Unauthorized seller resource access.');
    }

    /**
     * @return \Illuminate\Support\Collection<int, \App\Models\User>
     */
    protected function accountingRecipientsForSeller(?User $seller = null): Collection
    {
        $seller ??= $this->sellerOwner();

        return User::query()
            ->where(function ($query) use ($seller) {
                $query->where('id', $seller->id)
                    ->orWhere('seller_owner_id', $seller->id);
            })
            ->get()
            ->filter(function (User $user) {
                if ($user->id === $this->sellerOwnerId()) {
                    return true;
                }

                return $user->isStaff()
                    && $user->isWorkspaceAccessEnabled()
                    && $user->canAccessSellerModule('accounting');
            })
            ->unique('id')
            ->values();
    }
}
