<?php

namespace App\Actions\Seller\Subscription;

use App\Models\User;
use App\Models\UserTierLog;
use Illuminate\Support\Facades\DB;

class DowngradeSubscription
{
    /**
     * Execute subscription downgrade workflow.
     *
     * @param User $user
     * @param string $newTier
     * @param array|null $keepActiveIds
     * @param string $previousUrl
     * @return array
     * @throws \Exception
     */
    public function execute(User $user, string $newTier, ?array $keepActiveIds, string $previousUrl): array
    {
        $previousTier = $user->premium_tier;
        $shouldSuspendStaffForPlan = $previousTier === 'super_premium' && $newTier === 'free';

        // Determine new limit from User model
        $user->premium_tier = $newTier;
        $newLimit = $user->getActiveProductLimit();
        $user->premium_tier = $previousTier;

        $activeIds = $user->products()
            ->where('status', 'Active')
            ->pluck('id')
            ->toArray();

        $keepIds = count($activeIds) > $newLimit
            ? $this->getTopSellingActiveProductIds($user, $newLimit)
            : ($keepActiveIds ?? $activeIds);

        if (count($keepIds) > $newLimit) {
            throw new \Exception('limit_exceeded:' . $newLimit);
        }

        DB::transaction(function () use ($user, $previousTier, $newTier, $keepIds, $shouldSuspendStaffForPlan) {
            // lock user
            $userRecord = User::lockForUpdate()->findOrFail($user->id);

            // Verify that the requested IDs belong to the user
            $validKeepIds = $userRecord->products()->whereIn('id', $keepIds)->where('status', 'Active')->pluck('id')->toArray();

            // Draft all active products NOT in the keep list
            $userRecord->products()
                ->where('status', 'Active')
                ->whereNotIn('id', $validKeepIds)
                ->update(['status' => 'Draft']);

            UserTierLog::create([
                'user_id' => $userRecord->id,
                'previous_tier' => $previousTier,
                'new_tier' => $newTier,
            ]);

            $userRecord->update(['premium_tier' => $newTier]);

            if ($shouldSuspendStaffForPlan) {
                $this->suspendStaffForStandardDowngrade($userRecord);
            }
        });

        // Safe redirect
        $user->refresh();
        $redirectTo = $this->getSafePostDowngradeRedirect($user, $previousUrl);
        $successMessage = $shouldSuspendStaffForPlan
            ? 'Plan downgraded successfully. Excess products set to Draft. Elite-only features were suspended, and linked employee workspace accounts were suspended until you upgrade again.'
            : 'Plan downgraded successfully. Excess products set to Draft.';

        return [
            'redirectTo' => $redirectTo,
            'successMessage' => $successMessage
        ];
    }

    /**
     * Keep the highest-selling active products when a downgrade exceeds the new plan limit.
     */
    private function getTopSellingActiveProductIds(User $user, int $limit): array
    {
        if ($limit <= 0) {
            return [];
        }

        return $user->products()
            ->where('status', 'Active')
            ->orderByDesc('sold')
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id')
            ->toArray();
    }

    private function suspendStaffForStandardDowngrade(User $seller): void
    {
        $seller->staffMembers()
            ->whereNull('staff_plan_suspended_at')
            ->update([
                'staff_plan_suspended_at' => now(config('app.timezone')),
            ]);
    }

    private function getSafePostDowngradeRedirect(User $user, string $previousUrl): string
    {
        $path = parse_url($previousUrl, PHP_URL_PATH) ?? '';

        $pathModuleMap = [
            '/orders' => 'orders',
            '/analytics' => 'analytics',
            '/products' => 'products',
            '/3d-manager' => '3d',
            '/shop-settings' => 'shop_settings',
            '/sponsorships' => 'sponsorships',
            '/chat' => 'messages',
            '/reviews' => 'reviews',
            '/hr' => 'hr',
            '/accounting' => 'accounting',
            '/procurement/stock-requests' => 'stock_requests',
            '/procurement' => 'procurement',
        ];

        foreach ($pathModuleMap as $pathPrefix => $module) {
            if (str_starts_with($path, $pathPrefix) && !$user->canAccessSellerModule($module)) {
                return route('dashboard');
            }
        }

        return $path ?: route('dashboard');
    }
}
