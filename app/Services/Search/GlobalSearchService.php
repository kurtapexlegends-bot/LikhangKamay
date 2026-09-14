<?php

declare(strict_types=1);

namespace App\Services\Search;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
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
        $normalizedQuery = trim($query);
        if ($normalizedQuery === '') {
            return [];
        }

        $cacheKey = sprintf('global_search:%d:%s:%s', $user->id, $scope ?? 'all', md5(mb_strtolower($normalizedQuery)));

        return Cache::remember($cacheKey, 60, function () use ($user, $normalizedQuery, $scope) {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

            if ($scope === 'admin') {
                if (!$user->isAdmin()) {
                    return [];
                }
                return $this->adminSearchService->search($normalizedQuery, $like);
            }

            if ($scope === 'seller') {
                if (!$user->isArtisan() && !$user->isStaff()) {
                    return [];
                }
                return $this->sellerSearchService->search($user, $normalizedQuery, $like);
            }

            if ($user->isAdmin()) {
                return $this->adminSearchService->search($normalizedQuery, $like);
            }

            if ($user->isArtisan() || $user->isStaff()) {
                return $this->sellerSearchService->search($user, $normalizedQuery, $like);
            }

            return [];
        });
    }
}
