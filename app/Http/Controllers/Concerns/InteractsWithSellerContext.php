<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;

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
}
