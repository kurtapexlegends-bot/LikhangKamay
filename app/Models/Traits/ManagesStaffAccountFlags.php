<?php

namespace App\Models\Traits;

trait ManagesStaffAccountFlags
{
    public const STAFF_WORKSPACE_ACCESS_FLAG = '__workspace_access_enabled';
    public const STAFF_USER_LEVEL_FLAG = '__staff_user_level';
    public const STAFF_MANAGE_STAFF_ACCOUNTS_FLAG = '__manage_staff_accounts';
    public const STAFF_ACCESS_PERMISSION_LEVEL_FLAG = '__staff_access_permission_level';
    public const DEFAULT_STAFF_USER_LEVEL = 'standard';
    public const STAFF_MANAGER_USER_LEVEL = 'manager';
    public const STAFF_ONLY_USER_LEVEL_ALIASES = ['staff', 'staff_only', 'standard_staff'];
    public const STAFF_ACCESS_PERMISSION_READ_ONLY = 'read_only';
    public const STAFF_ACCESS_PERMISSION_CAN_EDIT = 'can_edit';
    public const STAFF_ACCESS_PERMISSION_UPDATE = 'can_edit';
    public const STAFF_ACCESS_PERMISSION_FULL = 'can_edit';

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function withWorkspaceAccessFlag(?array $permissions, bool $enabled): array
    {
        $normalized = static::stripWorkspaceAccessFlag($permissions);
        $normalized[self::STAFF_WORKSPACE_ACCESS_FLAG] = $enabled;

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function stripWorkspaceAccessFlag(?array $permissions): array
    {
        $normalized = is_array($permissions) ? $permissions : [];
        unset($normalized[self::STAFF_WORKSPACE_ACCESS_FLAG]);

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function withStaffUserLevelFlag(?array $permissions, ?string $level): array
    {
        $normalized = static::stripStaffUserLevelFlag($permissions);
        $normalized[self::STAFF_USER_LEVEL_FLAG] = static::normalizeStaffUserLevel($level);

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function stripStaffUserLevelFlag(?array $permissions): array
    {
        $normalized = is_array($permissions) ? $permissions : [];
        unset($normalized[self::STAFF_USER_LEVEL_FLAG]);

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function stripStaffControlFlags(?array $permissions): array
    {
        return static::stripManageStaffAccountsFlag(
            static::stripStaffAccessPermissionLevelFlag(
                static::stripStaffUserLevelFlag(static::stripWorkspaceAccessFlag($permissions))
            )
        );
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function withManageStaffAccountsFlag(?array $permissions, bool $enabled): array
    {
        $normalized = static::stripManageStaffAccountsFlag($permissions);
        $normalized[self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG] = $enabled;

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function stripManageStaffAccountsFlag(?array $permissions): array
    {
        $normalized = is_array($permissions) ? $permissions : [];
        unset($normalized[self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG]);

        return $normalized;
    }

    /**
     * @return array<int, string>
     */
    public static function staffAccessPermissionLevels(): array
    {
        return [
            self::STAFF_ACCESS_PERMISSION_READ_ONLY,
            self::STAFF_ACCESS_PERMISSION_CAN_EDIT,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function staffModuleAccessLevels(): array
    {
        return static::staffAccessPermissionLevels();
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function withStaffAccessPermissionLevelFlag(?array $permissions, ?string $level): array
    {
        $normalized = static::stripStaffAccessPermissionLevelFlag($permissions);
        $normalized[self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG] = static::normalizeStaffAccessPermissionLevel($level);

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $permissions
     * @return array<string, mixed>
     */
    public static function stripStaffAccessPermissionLevelFlag(?array $permissions): array
    {
        $normalized = is_array($permissions) ? $permissions : [];
        unset($normalized[self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG]);

        return $normalized;
    }

    public static function normalizeStaffAccessPermissionLevel(mixed $level): string
    {
        return match ($level) {
            self::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            self::STAFF_ACCESS_PERMISSION_UPDATE,
            self::STAFF_ACCESS_PERMISSION_FULL,
            'update_access',
            'full_access' => self::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            self::STAFF_ACCESS_PERMISSION_READ_ONLY => self::STAFF_ACCESS_PERMISSION_READ_ONLY,
            default => self::STAFF_ACCESS_PERMISSION_READ_ONLY,
        };
    }

    public static function normalizeStaffModuleAccessLevel(mixed $level): ?string
    {
        if ($level === null || $level === false || $level === '' || $level === 0 || $level === '0') {
            return null;
        }

        if ($level === true || $level === 1 || $level === '1') {
            return self::STAFF_ACCESS_PERMISSION_CAN_EDIT;
        }

        return in_array($level, static::staffModuleAccessLevels(), true)
            ? $level
            : static::normalizeStaffAccessPermissionLevel($level);
    }

    public static function normalizeStaffUserLevel(mixed $level): string
    {
        if (in_array($level, self::STAFF_ONLY_USER_LEVEL_ALIASES, true)) {
            return self::DEFAULT_STAFF_USER_LEVEL;
        }

        return in_array($level, static::staffUserLevels(), true)
            ? $level
            : self::DEFAULT_STAFF_USER_LEVEL;
    }

    /**
     * @return array<int, string>
     */
    public static function staffUserLevels(): array
    {
        return [
            self::DEFAULT_STAFF_USER_LEVEL,
            self::STAFF_MANAGER_USER_LEVEL,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function staffUserLevelValidationValues(): array
    {
        return array_values(array_unique([
            ...static::staffUserLevels(),
            ...self::STAFF_ONLY_USER_LEVEL_ALIASES,
        ]));
    }
}
