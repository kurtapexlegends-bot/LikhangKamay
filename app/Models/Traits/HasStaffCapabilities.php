<?php

namespace App\Models\Traits;

use App\Services\SellerEntitlementService;

trait HasStaffCapabilities
{
    /**
     * Enterprise Staff Capability Constants
     */
    public const CAP_VIEW_REVENUE = 'finance.view_revenue';
    public const CAP_MANAGE_PAYROLL = 'payroll.manage';
    public const CAP_VIEW_PAYROLL = 'payroll.view';
    public const CAP_MANAGE_INVENTORY = 'inventory.manage';
    public const CAP_DISPATCH_ORDERS = 'orders.dispatch';
    public const CAP_MANAGE_STAFF = 'staff.manage';

    /**
     * Check if the user has a specific granular capability within their shop.
     */
    public function hasStaffCapability(string $capability): bool
    {
        if ($this->isSellerOwner()) {
            return true;
        }

        if (!$this->isStaff() || !$this->isWorkspaceAccessEnabled()) {
            return false;
        }

        $permissions = (array) $this->staff_module_permissions;

        // Shop Manager Level has all capabilities
        if ($this->getStaffUserLevel() === self::STAFF_MANAGER_USER_LEVEL) {
            return true;
        }

        // Check explicit capability mapping
        return match ($capability) {
            self::CAP_VIEW_REVENUE => (bool) data_get($permissions, 'accounting'),
            self::CAP_VIEW_PAYROLL => (bool) data_get($permissions, 'hr'),
            self::CAP_MANAGE_PAYROLL => $this->canEditSellerModule('hr'),
            self::CAP_MANAGE_INVENTORY => $this->canEditSellerModule('products') || $this->canEditSellerModule('procurement'),
            self::CAP_DISPATCH_ORDERS => $this->canEditSellerModule('orders'),
            self::CAP_MANAGE_STAFF => $this->canManageStaffAccounts(),
            default => false,
        };
    }

    public function requiresStaffPasswordChange(): bool
    {
        return $this->isStaff() && $this->must_change_password;
    }

    public function isWorkspaceAccessEnabled(): bool
    {
        if (!$this->isStaff()) {
            return true;
        }

        if ($this->isPlanWorkspaceSuspended()) {
            return false;
        }

        $permissions = is_array($this->staff_module_permissions) ? $this->staff_module_permissions : [];

        if (!array_key_exists(self::STAFF_WORKSPACE_ACCESS_FLAG, $permissions)) {
            return true;
        }

        return (bool) $permissions[self::STAFF_WORKSPACE_ACCESS_FLAG];
    }

    public function isPlanWorkspaceSuspended(): bool
    {
        return $this->isStaff() && $this->staff_plan_suspended_at !== null;
    }

    public function getStaffUserLevel(): string
    {
        if (!$this->isStaff()) {
            return self::STAFF_MANAGER_USER_LEVEL;
        }

        if ($this->hasStaffManagementPermission()) {
            return self::STAFF_MANAGER_USER_LEVEL;
        }

        $permissions = is_array($this->staff_module_permissions) ? $this->staff_module_permissions : [];

        return static::normalizeStaffUserLevel($permissions[self::STAFF_USER_LEVEL_FLAG] ?? null);
    }

    public function isStaffManager(): bool
    {
        return $this->isStaff() && $this->getStaffUserLevel() === self::STAFF_MANAGER_USER_LEVEL;
    }

    public function getStaffModuleAccessLevel(string $module): ?string
    {
        if ($this->isSellerOwner()) {
            return self::STAFF_ACCESS_PERMISSION_CAN_EDIT;
        }

        if (!$this->isStaff()) {
            return null;
        }

        $permissions = is_array($this->staff_module_permissions) ? $this->staff_module_permissions : [];

        if (array_key_exists($module, $permissions)) {
            $rawValue = $permissions[$module];

            if ($rawValue === true || $rawValue === 1 || $rawValue === '1') {
                return $this->resolveLegacyStaffModuleAccessLevel();
            }

            if ($rawValue === false || $rawValue === 0 || $rawValue === '0' || $rawValue === null || $rawValue === '') {
                return null;
            }

            $explicit = static::normalizeStaffModuleAccessLevel($rawValue);

            if ($explicit !== null) {
                return $explicit;
            }
        }

        $presetKey = $this->staff_role_preset_key ?: 'custom';
        $presetModules = app(SellerEntitlementService::class)->getRolePresetDefaults()[$presetKey] ?? [];

        if (in_array($module, $presetModules, true)) {
            return $this->resolveLegacyStaffModuleAccessLevel();
        }

        if ($module === 'team_messages') {
            $seller = $this->getEffectiveSeller();

            if ($seller?->isPremiumTier()) {
                return self::STAFF_ACCESS_PERMISSION_CAN_EDIT;
            }
        }

        return null;
    }

    protected function resolveLegacyStaffModuleAccessLevel(): string
    {
        $permissions = is_array($this->staff_module_permissions) ? $this->staff_module_permissions : [];

        if (array_key_exists(self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG, $permissions)) {
            return static::normalizeStaffAccessPermissionLevel($permissions[self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG]);
        }

        if (array_key_exists(self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG, $permissions)) {
            return (bool) $permissions[self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG]
                ? self::STAFF_ACCESS_PERMISSION_CAN_EDIT
                : self::STAFF_ACCESS_PERMISSION_READ_ONLY;
        }

        return static::normalizeStaffUserLevel($permissions[self::STAFF_USER_LEVEL_FLAG] ?? null) === self::STAFF_MANAGER_USER_LEVEL
            ? self::STAFF_ACCESS_PERMISSION_CAN_EDIT
            : self::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    public function getStaffAccessPermissionLevel(): string
    {
        if ($this->isSellerOwner()) {
            return self::STAFF_ACCESS_PERMISSION_CAN_EDIT;
        }

        if (!$this->isStaff()) {
            return self::STAFF_ACCESS_PERMISSION_READ_ONLY;
        }

        return $this->resolveLegacyStaffModuleAccessLevel();
    }

    public function hasStaffManagementPermission(): bool
    {
        return $this->getStaffModuleAccessLevel('hr') === self::STAFF_ACCESS_PERMISSION_CAN_EDIT;
    }

    public function hasCompletedStaffSecurityGate(): bool
    {
        if (!$this->isStaff()) {
            return true;
        }

        return $this->hasVerifiedEmail() && !$this->requiresStaffPasswordChange();
    }

    public function getEffectiveSeller(): ?self
    {
        if ($this->isSellerOwner()) {
            return $this;
        }

        if ($this->isStaff()) {
            return $this->sellerOwner;
        }

        return null;
    }

    public function getEffectiveSellerId(): ?int
    {
        return $this->getEffectiveSeller()?->id;
    }
}
