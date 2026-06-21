<?php

namespace App\Models\Traits;

use App\Services\SellerEntitlementService;
use App\Models\UserAddress;
use App\Support\StructuredAddress;
use Illuminate\Support\Str;
use App\Models\User;

/**
 * @property array|null $modules_enabled
 * @property-read string|null $formatted_primary_address
 * 
 * @mixin \App\Models\User
 * @mixin \App\Models\Traits\ManagesStaffAccountFlags
 */
trait HasArtisanSubscriptions
{
    public function isPendingApproval(): bool
    {
        return $this->isArtisan() && $this->artisan_status === 'pending' && $this->setup_completed_at !== null;
    }

    public function isApproved(): bool
    {
        return $this->artisan_status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->artisan_status === 'rejected';
    }

    public function hasAcceptedComplianceTerms(string $type = 'seller_terms'): bool
    {
        return $this->complianceAgreements()->where('document_type', $type)->exists();
    }

    public function canAccessDashboard(): bool
    {
        if ($this->isStaff()) {
            return $this->canAccessSellerModule('overview');
        }

        return $this->isArtisan() && $this->isApproved() && $this->setup_completed_at !== null;
    }

    public function canAccessSellerOwnerRoutes(): bool
    {
        return $this->isArtisan()
            && $this->setup_completed_at !== null
            && !$this->isPendingApproval()
            && !$this->isRejected();
    }

    // ========== PREMIUM TIER HELPERS ==========

    public function getActiveProductLimit(): int
    {
        return match($this->premium_tier) {
            'super_premium' => (int) \App\Facades\Settings::get('tier_super_premium_limit', 50),
            'premium' => (int) \App\Facades\Settings::get('tier_premium_limit', 10),
            default => (int) \App\Facades\Settings::get('tier_free_limit', 3),
        };
    }

    public function canAddMoreProducts(): bool
    {
        $activeCount = $this->products()->where('status', 'Active')->count();
        return $activeCount < $this->getActiveProductLimit();
    }

    public function isPremiumTier(): bool
    {
        return in_array($this->premium_tier, ['premium', 'super_premium'], true);
    }

    public function isEliteTier(): bool
    {
        return $this->premium_tier === 'super_premium';
    }

    public function getSellerTierLabel(): string
    {
        return match($this->premium_tier) {
            'super_premium' => 'Elite',
            'premium' => 'Premium',
            default => 'Standard',
        };
    }

    /**
     * Standard modules available to every seller tier.
     *
     * @return array<int, string>
     */
    public function getStandardSellerModules(): array
    {
        return [
            'overview',
            'products',
            'analytics',
            '3d',
            'orders',
            'messages',
            'reviews',
            'shop_settings',
        ];
    }

    /**
     * Toggleable modules that can be managed from module settings.
     *
     * @return array<int, string>
     */
    public function getToggleableSellerModules(): array
    {
        return ['hr', 'accounting', 'procurement'];
    }

    /**
     * All known seller modules in the current system.
     *
     * @return array<int, string>
     */
    public function getAllSellerModules(): array
    {
        return [
            ...$this->getStandardSellerModules(),
            'sponsorships',
            'hr',
            'accounting',
            'procurement',
            'stock_requests',
        ];
    }

    /**
     * @return array<string, bool>
     */
    public function getNormalizedModuleToggles(): array
    {
        $saved = is_array($this->modules_enabled) ? $this->modules_enabled : [];

        return [
            'hr' => (bool) ($saved['hr'] ?? false),
            'accounting' => (bool) ($saved['accounting'] ?? false),
            // Procurement remains always enabled due inventory dependencies.
            'procurement' => true,
        ];
    }

    /**
     * @return array<int, string>
     */
    public function getEnabledToggleableSellerModules(): array
    {
        if (!$this->isPremiumTier()) {
            return [];
        }

        if ($this->isEliteTier()) {
            return $this->getToggleableSellerModules();
        }

        return collect($this->getNormalizedModuleToggles())
            ->filter()
            ->keys()
            ->values()
            ->all();
    }

    public function canAccessSellerModule(string $module): bool
    {
        return app(SellerEntitlementService::class)->canAccessModule($this, $module);
    }

    public function canEditSellerModule(string $module): bool
    {
        if ($this->isSellerOwner()) {
            return true;
        }

        if (!$this->isWorkspaceAccessEnabled()) {
            return false;
        }

        return in_array($module, app(SellerEntitlementService::class)->getGrantedStaffModules($this), true)
            && $this->getStaffModuleAccessLevel($module) === User::STAFF_ACCESS_PERMISSION_CAN_EDIT;
    }

    public function canAccessSellerWorkspace(): bool
    {
        return app(SellerEntitlementService::class)->canAccessWorkspace($this);
    }

    public function canManageSellerModuleSettings(): bool
    {
        return app(SellerEntitlementService::class)->canManageModuleSettings($this);
    }

    public function canManageSellerSubscription(): bool
    {
        return app(SellerEntitlementService::class)->canManageSubscription($this);
    }

    public function canViewSellerPayrollData(): bool
    {
        return app(SellerEntitlementService::class)->canViewPayrollData($this);
    }

    public function canManageStaffAccounts(): bool
    {
        return $this->canUpdateStaffAccounts();
    }

    public function canUpdateStaffAccounts(): bool
    {
        if ($this->isSellerOwner()) {
            return true;
        }

        if (!$this->isWorkspaceAccessEnabled()) {
            return false;
        }

        return in_array('hr', app(SellerEntitlementService::class)->getGrantedStaffModules($this), true)
            && $this->getStaffModuleAccessLevel('hr') === User::STAFF_ACCESS_PERMISSION_CAN_EDIT;
    }

    public function canCreateStaffAccounts(): bool
    {
        return $this->canUpdateStaffAccounts();
    }

    public function canDeleteStaffAccounts(): bool
    {
        return $this->canCreateStaffAccounts();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getSellerEntitlements(): ?array
    {
        return app(SellerEntitlementService::class)->getEntitlementsFor($this);
    }

    public function getFirstAccessibleSellerRouteName(): ?string
    {
        return app(SellerEntitlementService::class)->getFirstAccessibleRouteName($this);
    }

    public function getDefaultAddress(): ?UserAddress
    {
        if ($this->relationLoaded('addresses')) {
            $addresses = $this->getRelation('addresses');

            return $addresses->firstWhere('is_default', true)
                ?? $addresses->sortByDesc('id')->first();
        }

        return $this->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->first();
    }

    public function getPreferredCourierPickupAddress(): ?string
    {
        /** @var UserAddress|null $defaultAddress */
        $defaultAddress = $this->getDefaultAddress();
        $address = trim((string) ($defaultAddress?->full_address ?? ''));

        if ($address === '' && $defaultAddress) {
            $address = StructuredAddress::formatPhilippineAddress([
                'street_address' => $defaultAddress->street_address,
                'barangay' => $defaultAddress->barangay,
                'city' => $defaultAddress->city,
                'region' => $defaultAddress->region,
                'postal_code' => $defaultAddress->postal_code,
            ]);
        }

        if ($address !== '') {
            return $address;
        }

        $primaryParts = StructuredAddress::formatPhilippineAddress([
            'street_address' => $this->street_address,
            'barangay' => $this->barangay,
            'city' => $this->city,
            'region' => $this->region,
            'postal_code' => $this->zip_code,
        ]);

        return $primaryParts !== '' ? $primaryParts : null;
    }

    /**
     * @return array<int, string>
     */
    public function getCourierPickupAddressCandidates(): array
    {
        /** @var UserAddress|null $defaultAddress */
        $defaultAddress = $this->getDefaultAddress();
        $candidates = [];
        /** @var array<string, bool> $seen */
        $seen = [];

        $pushCandidate = function (array $parts) use (&$candidates, &$seen): void {
            $normalizedParts = [];

            foreach ($parts as $part) {
                $value = trim((string) $part);
                if ($value === '') {
                    continue;
                }

                $normalizedParts[] = $value;
            }

            if (empty($normalizedParts)) {
                return;
            }

            $address = implode(', ', $normalizedParts);
            $fingerprint = Str::lower(Str::ascii($address));

            if (isset($seen[$fingerprint])) {
                return;
            }

            $seen[$fingerprint] = true;
            $candidates[] = $address;
        };

        if ($defaultAddress) {
            $pushCandidate([
                StructuredAddress::formatPhilippineAddress([
                    'street_address' => $defaultAddress->street_address,
                    'barangay' => $defaultAddress->barangay,
                    'city' => $defaultAddress->city,
                    'region' => $defaultAddress->region,
                    'postal_code' => $defaultAddress->postal_code,
                ]),
            ]);
            $pushCandidate([$defaultAddress->full_address]);
        }

        $pushCandidate([
            StructuredAddress::formatPhilippineAddress([
                'street_address' => $this->street_address,
                'barangay' => $this->barangay,
                'city' => $this->city,
                'region' => $this->region,
                'postal_code' => $this->zip_code,
            ]),
        ]);

        $pushCandidate([$this->formatted_primary_address]);

        return $candidates;
    }

    public function getFormattedPrimaryAddressAttribute(): ?string
    {
        $address = StructuredAddress::formatPhilippineAddress([
            'street_address' => $this->street_address,
            'barangay' => $this->barangay,
            'city' => $this->city,
            'region' => $this->region,
            'postal_code' => $this->zip_code,
        ]);

        return $address !== '' ? $address : null;
    }

    public function getPreferredCourierContactPhone(): ?string
    {
        $primaryPhone = trim((string) $this->phone_number);

        if ($primaryPhone !== '') {
            return $primaryPhone;
        }

        $defaultAddressPhone = trim((string) ($this->getDefaultAddress()?->phone_number ?? ''));

        return $defaultAddressPhone !== '' ? $defaultAddressPhone : null;
    }

    /**
     * Entitlements used by seller sidebar and server-side module access checks.
     *
     * @return array<string, mixed>|null
     */
    public function getSellerSidebarEntitlements(): ?array
    {
        return $this->getSellerEntitlements();
    }
}
