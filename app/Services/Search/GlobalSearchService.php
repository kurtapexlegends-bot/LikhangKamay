<?php

declare(strict_types=1);

namespace App\Services\Search;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class GlobalSearchService
{
    public function __construct(
        private readonly AdminSearchService $adminSearchService,
        private readonly SellerSearchService $sellerSearchService
    ) {}

    /**
     * Search cross-domain resources scoped strictly to the authenticated user's role and entitlements.
     */
    public function search(User $user, string $query, ?string $scope = null): array
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

        if ($scope === 'admin') {
            if (!$user->isAdmin()) {
                return [];
            }
            return $this->adminSearchService->search($query, $like);
        }

        if ($scope === 'seller') {
            if (!$user->isArtisan() && !$user->isStaff()) {
                return [];
            }
            return $this->sellerSearchService->search($user, $query, $like);
        }

        if ($user->isAdmin()) {
            return $this->adminSearchService->search($query, $like);
        }

        if ($user->isArtisan() || $user->isStaff()) {
            return $this->sellerSearchService->search($user, $query, $like);
        }

        return [];
    }
}
