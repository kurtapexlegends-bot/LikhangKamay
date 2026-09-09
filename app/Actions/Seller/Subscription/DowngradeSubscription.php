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
        $shouldSuspendStaffForPlan = in_array($previousTier, ['premium', 'super_premium'], true) && $newTier === 'free';

        // Determine new limit directly from tier key to avoid expired state interference
        $newLimit = match ($newTier) {
            'super_premium' => (int) \App\Facades\Settings::get('tier_super_premium_limit', 50),
            'premium' => (int) \App\Facades\Settings::get('tier_premium_limit', 10),
            default => (int) \App\Facades\Settings::get('tier_free_limit', 3),
        };

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

            $userRecord->update([
                'premium_tier' => $newTier,
                'subscription_expires_at' => null,
                'subscription_cancelled_at' => null,
                'pending_downgrade_tier' => 'free',
            ]);

            if ($shouldSuspendStaffForPlan) {
                $this->suspendStaffForStandardDowngrade($userRecord);
            }

            \Illuminate\Support\Facades\Cache::forget('shop_catalog_default_page_1');
            \Illuminate\Support\Facades\Cache::forget("seller_{$userRecord->id}_products");
            \Illuminate\Support\Facades\Cache::forget("seller_{$userRecord->id}_best_sellers");
            \Illuminate\Support\Facades\Cache::forget("seller_{$userRecord->id}_stats");
            \Illuminate\Support\Facades\Cache::forget('home_top_sellers');
            \Illuminate\Support\Facades\Cache::forget('home_featured_products_pool');
            \Illuminate\Support\Facades\Cache::forget('home_sponsored_products');

            \App\Models\SellerActivityLog::recordEvent([
                'seller_owner_id' => $userRecord->id,
                'actor_user_id' => $userRecord->id,
                'actor_type' => 'owner',
                'category' => 'operations',
                'module' => 'shop_settings',
                'event_type' => 'subscription_downgraded',
                'severity' => 'info',
                'status' => 'active',
                'title' => 'Subscription Plan Downgraded',
                'summary' => "Plan changed from {$previousTier} to {$newTier}.",
                'target_url' => route('seller.subscription'),
                'target_label' => 'View Subscription',
            ]);
        });

        // Safe redirect
        $user->refresh();
        $redirectTo = $this->getSafePostDowngradeRedirect($user, $previousUrl);
        if ($previousTier === 'super_premium' && $newTier === 'free') {
            $successMessage = 'Plan downgraded successfully. Excess products set to Draft. Elite-only features were suspended, and linked employee workspace accounts were suspended until you upgrade again.';
        } elseif ($shouldSuspendStaffForPlan && $user->staffMembers()->exists()) {
            $successMessage = 'Plan downgraded successfully. Excess products set to Draft, and linked employee workspace accounts were suspended until you upgrade again.';
        } else {
            $successMessage = 'Plan downgraded successfully. Excess products set to Draft.';
        }

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
