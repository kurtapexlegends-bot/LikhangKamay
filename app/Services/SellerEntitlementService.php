<?php

namespace App\Services;

use App\Models\User;

class SellerEntitlementService
{
    /**
     * Workspace modules that should always stay available once the actor can enter
     * the seller workspace.
     *
     * @return array<int, string>
     */
    protected function alwaysVisibleWorkspaceModulesFor(User $user): array
    {
        if ($user->isSellerOwner() || $user->isStaff()) {
            return ['team_messages'];
        }

        return [];
    }

    /**
     * Modules that are safe to expose to staff.
     *
     * @return array<int, string>
     */
    public function getSupportedStaffModules(): array
    {
        return [
            'overview',
            'wallet',
            'products',
            'analytics',
            '3d',
            'orders',
            'reviews',
            'shop_settings',
            'hr',
            'accounting',
            'procurement',
            'stock_requests',
        ];
    }

    /**
     * Role preset defaults for seller-owned staff accounts.
     *
     * @return array<string, array<int, string>>
     */
    public function getRolePresetDefaults(): array
    {
        return [
            'hr' => ['hr'],
            'accounting' => ['accounting', 'wallet'],
            'procurement' => ['procurement', 'stock_requests'],
            'customer_support' => ['orders', 'reviews'],
            'custom' => [],
        ];
    }

    /**
     * Resolve the canonical seller entitlements for the authenticated actor.
     *
     * @return array<string, mixed>|null
     */
    public function getEntitlementsFor(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        $seller = $user->getEffectiveSeller();

        if (!$seller || !$seller->canAccessSellerOwnerRoutes()) {
            return null;
        }

        $ownerEntitlements = $this->buildOwnerEntitlements($seller);
        $visibleModules = $ownerEntitlements['visibleModules'];

        if ($user->isStaff()) {
            if (!$user->isWorkspaceAccessEnabled()) {
                return null;
            }

            $grantedModules = $this->getGrantedStaffModules($user);
            $visibleModules = array_values(array_filter(
                $ownerEntitlements['visibleModules'],
                fn (string $module) => in_array($module, $grantedModules, true)
            ));
        }

        $visibleModules = array_values(array_unique([
            ...$visibleModules,
            ...$this->alwaysVisibleWorkspaceModulesFor($user),
        ]));

        $canManageModuleSettings = $user->isSellerOwner() && $ownerEntitlements['showGear'];
        $canManageSubscription = $user->isSellerOwner();
        $defaultRouteName = $user->isStaff()
            ? 'staff.dashboard'
            : $this->getFirstAccessibleRouteNameFromModules($visibleModules);

        return [
            'sellerOwnerId' => $seller->id,
            'sellerOwnerName' => $seller->shop_name ?: $seller->name,
            'tierKey' => $this->normalizeTierKey($seller->premium_tier),
            'tierLabel' => $seller->getSellerTierLabel(),
            'visibleModules' => $visibleModules,
            'toggleableModules' => $canManageModuleSettings ? $ownerEntitlements['toggleableModules'] : [],
            'enabledToggleableModules' => $canManageModuleSettings ? $ownerEntitlements['enabledToggleableModules'] : [],
            'showGear' => $canManageModuleSettings,
            'allModulesUnlocked' => $user->isSellerOwner() ? $ownerEntitlements['allModulesUnlocked'] : false,
            'canAccessWorkspace' => !empty($visibleModules),
            'canAccessOverview' => in_array('overview', $visibleModules, true),
            'canManageSubscription' => $canManageSubscription,
            'canManageModuleSettings' => $canManageModuleSettings,
            'canManageStaffAccounts' => $user->canManageStaffAccounts(),
            'canViewPayrollData' => $this->containsAny($visibleModules, ['hr', 'accounting']),
            'showPlanPanel' => $user->isSellerOwner(),
            'rolePresetKey' => $user->isStaff() ? ($user->staff_role_preset_key ?: 'custom') : null,
            'staffUserLevel' => $user->isStaff() ? $user->getStaffUserLevel() : null,
            'actorType' => $user->isStaff() ? 'staff' : 'owner',
            'defaultRouteName' => $defaultRouteName,
        ];
    }

    public function canAccessWorkspace(User $user): bool
    {
        return (bool) ($this->getEntitlementsFor($user)['canAccessWorkspace'] ?? false);
    }

    public function canAccessModule(User $user, string $module): bool
    {
        $entitlements = $this->getEntitlementsFor($user);

        return $entitlements
            ? in_array($module, $entitlements['visibleModules'], true)
            : false;
    }

    public function canManageModuleSettings(User $user): bool
    {
        return (bool) ($this->getEntitlementsFor($user)['canManageModuleSettings'] ?? false);
    }

    public function canManageSubscription(User $user): bool
    {
        return (bool) ($this->getEntitlementsFor($user)['canManageSubscription'] ?? false);
    }

    public function canViewPayrollData(User $user): bool
    {
        return (bool) ($this->getEntitlementsFor($user)['canViewPayrollData'] ?? false);
    }

    public function getFirstAccessibleRouteName(User $user): ?string
    {
        return $this->getEntitlementsFor($user)['defaultRouteName'] ?? null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getSubscriptionPayload(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        $entitlements = $this->getEntitlementsFor($user);
        $seller = $user->getEffectiveSeller();

        if (!$entitlements || !$seller) {
            return null;
        }

        return [
            'activeCount' => $seller->products()->where('status', 'Active')->count(),
            'limit' => $seller->getActiveProductLimit(),
            'tierKey' => $entitlements['tierKey'],
            'tierLabel' => $entitlements['tierLabel'],
            'canManageSubscription' => $entitlements['canManageSubscription'],
            'showPlanPanel' => $entitlements['showPlanPanel'] ?? false,
            'canExportAnalytics' => $seller->isPremiumTier(),
            'canCustomizeModules' => $entitlements['canManageModuleSettings'],
            'canRequestSponsorships' => $seller->isEliteTier(),
        ];
    }

    /**
     * @return array<int, string>
     */
    public function getGrantedStaffModules(User $staff): array
    {
        $granted = collect($this->getSupportedStaffModules())
            ->mapWithKeys(fn (string $module) => [$module => false]);

        $presetKey = $staff->staff_role_preset_key ?: 'custom';
        $presetModules = $this->getRolePresetDefaults()[$presetKey] ?? [];

        foreach ($presetModules as $module) {
            if ($granted->has($module)) {
                $granted[$module] = true;
            }
        }

        foreach ($this->normalizeStaffPermissions($staff->staff_module_permissions) as $module => $allowed) {
            if ($granted->has($module)) {
                $granted[$module] = $allowed;
            }
        }

        return $granted
            ->filter()
            ->keys()
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     visibleModules: array<int, string>,
     *     toggleableModules: array<int, string>,
     *     enabledToggleableModules: array<int, string>,
     *     showGear: bool,
     *     allModulesUnlocked: bool
     * }
     */
    protected function buildOwnerEntitlements(User $seller): array
    {
        $standardModules = $seller->getStandardSellerModules();
        $toggleableModules = $seller->isPremiumTier() ? $seller->getToggleableSellerModules() : [];
        $enabledToggleableModules = $seller->getEnabledToggleableSellerModules();

        if ($seller->isEliteTier()) {
            $visibleModules = $seller->getAllSellerModules();
        } elseif ($seller->isPremiumTier()) {
            $visibleModules = [
                ...$standardModules,
                ...$enabledToggleableModules,
            ];

            if (in_array('procurement', $enabledToggleableModules, true)) {
                $visibleModules[] = 'stock_requests';
            }
        } else {
            $visibleModules = $standardModules;
        }

        return [
            'visibleModules' => array_values(array_unique($visibleModules)),
            'toggleableModules' => $toggleableModules,
            'enabledToggleableModules' => $enabledToggleableModules,
            'showGear' => $seller->isPremiumTier(),
            'allModulesUnlocked' => $seller->isEliteTier(),
        ];
    }

    /**
     * @param  mixed  $storedPermissions
     * @return array<string, bool>
     */
    protected function normalizeStaffPermissions($storedPermissions): array
    {
        if (!is_array($storedPermissions)) {
            return [];
        }

        if (array_is_list($storedPermissions)) {
            return collect($storedPermissions)
                ->filter(fn ($module) => is_string($module))
                ->mapWithKeys(fn (string $module) => [$module => true])
                ->all();
        }

        return collect($storedPermissions)
            ->filter(fn ($value, $module) => is_string($module))
            ->mapWithKeys(fn ($value, $module) => [$module => (bool) $value])
            ->all();
    }

    protected function normalizeTierKey(?string $tier): string
    {
        return match ($tier) {
            'premium' => 'premium',
            'super_premium' => 'super_premium',
            default => 'free',
        };
    }

    /**
     * @param  array<int, string>  $visibleModules
     */
    protected function getFirstAccessibleRouteNameFromModules(array $visibleModules): ?string
    {
        $routeMap = $this->moduleRouteMap();

        foreach ($this->preferredModuleOrder() as $module) {
            if (in_array($module, $visibleModules, true) && isset($routeMap[$module])) {
                return $routeMap[$module];
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    protected function preferredModuleOrder(): array
    {
        return [
            'overview',
            'wallet',
            'orders',
            'products',
            'analytics',
            'reviews',
            'shop_settings',
            'hr',
            'accounting',
            'procurement',
            'stock_requests',
            '3d',
            'sponsorships',
            'messages',
            'team_messages',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function moduleRouteMap(): array
    {
        return [
            'overview' => 'dashboard',
            'wallet' => 'seller.wallet.index',
            'orders' => 'orders.index',
            'products' => 'products.index',
            'analytics' => 'analytics.index',
            'reviews' => 'reviews.index',
            'shop_settings' => 'shop.settings',
            'hr' => 'hr.index',
            'accounting' => 'accounting.index',
            'procurement' => 'procurement.index',
            'stock_requests' => 'stock-requests.index',
            '3d' => '3d.index',
            'sponsorships' => 'seller.sponsorships',
            'messages' => 'chat.index',
            'team_messages' => 'team-messages.index',
        ];
    }

    /**
     * @param  array<int, string>  $haystack
     * @param  array<int, string>  $needles
     */
    protected function containsAny(array $haystack, array $needles): bool
    {
        return !empty(array_intersect($haystack, $needles));
    }
}
