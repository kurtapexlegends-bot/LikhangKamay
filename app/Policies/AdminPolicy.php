<?php

namespace App\Policies;

use App\Models\User;

class AdminPolicy
{
    /**
     * Determine if the user is a super admin.
     */
    public function adminAction(User $user): bool
    {
        return $user->isAdmin();
    }
}
