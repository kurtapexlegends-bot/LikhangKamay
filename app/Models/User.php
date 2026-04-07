<?php

namespace App\Models;

use App\Services\SellerEntitlementService;
use App\Models\UserAddress;
use App\Support\PersonName;
use App\Support\StructuredAddress;
use Illuminate\Database\Schema\Builder as SchemaBuilder;
use Illuminate\Support\Str;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;

class User extends Authenticatable implements AuthenticatableContract, MustVerifyEmail
{
    use HasFactory, Notifiable;

    public const STAFF_WORKSPACE_ACCESS_FLAG = '__workspace_access_enabled';
    public const STAFF_USER_LEVEL_FLAG = '__staff_user_level';
    public const STAFF_MANAGE_STAFF_ACCOUNTS_FLAG = '__manage_staff_accounts';
    public const STAFF_ACCESS_PERMISSION_LEVEL_FLAG = '__staff_access_permission_level';
    public const DEFAULT_STAFF_USER_LEVEL = 'standard';
    public const STAFF_MANAGER_USER_LEVEL = 'manager';
    public const STAFF_ONLY_USER_LEVEL_ALIASES = ['staff', 'staff_only', 'standard_staff'];
    public const STAFF_ACCESS_PERMISSION_READ_ONLY = 'read_only';
    public const STAFF_ACCESS_PERMISSION_UPDATE = 'update_access';
    public const STAFF_ACCESS_PERMISSION_FULL = 'full_access';

    protected static ?bool $hasSplitNameColumns = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'seller_owner_id',
        'staff_role_preset_key',
        'staff_module_permissions',
        'must_change_password',
        'staff_plan_suspended_at',
        'created_by_user_id',
        'employee_id',
        'shop_name',
        'bio',
        'banner_image',
        // 'shop_slug', // REMOVED: Auto-generated
        // 'is_verified', // REMOVED: Managed by email verification
        // Artisan Setup Fields
        'phone_number',
        'street_address',
        'city',
        'barangay',
        'region',
        'zip_code',
        'business_permit',
        'dti_registration',
        'valid_id',
        'tin_id',
        'setup_completed_at',
        'saved_address',
        // Artisan Approval Fields
        'artisan_status',
        'artisan_rejection_reason',
        'approved_at',
        'approved_by',
        // Social Auth Fields
        'social_provider',
        'social_id',
        'avatar',
        'email_verified_at',
        'last_seen_at',
        'overtime_rate',
        'payroll_working_days',
        'default_absences',
        'default_undertime',
        'default_overtime',
        'base_funds',
        'premium_tier',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'setup_completed_at' => 'datetime',
            'approved_at' => 'datetime',
            'modules_enabled' => 'array',
            'staff_module_permissions' => 'array',
            'must_change_password' => 'boolean',
            'staff_plan_suspended_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Send the email verification notification using custom branded template.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new \App\Notifications\VerifyEmailNotification);
    }

    /**
     * Send the password reset notification using custom branded template.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    // ========== ROLE HELPERS ==========

    public function isAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isArtisan(): bool
    {
        return $this->role === 'artisan';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isSellerOwner(): bool
    {
        return $this->isArtisan();
    }

    public function isBuyer(): bool
    {
        return $this->role === 'buyer' || $this->role === null;
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
            self::STAFF_ACCESS_PERMISSION_UPDATE,
            self::STAFF_ACCESS_PERMISSION_FULL,
        ];
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
        return in_array($level, self::staffAccessPermissionLevels(), true)
            ? $level
            : self::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    public function getStaffAccessPermissionLevel(): string
    {
        if ($this->isSellerOwner()) {
            return self::STAFF_ACCESS_PERMISSION_FULL;
        }

        if (!$this->isStaff()) {
            return self::STAFF_ACCESS_PERMISSION_READ_ONLY;
        }

        $permissions = is_array($this->staff_module_permissions) ? $this->staff_module_permissions : [];

        if (array_key_exists(self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG, $permissions)) {
            return static::normalizeStaffAccessPermissionLevel($permissions[self::STAFF_ACCESS_PERMISSION_LEVEL_FLAG]);
        }

        if (array_key_exists(self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG, $permissions)) {
            return (bool) $permissions[self::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG]
                ? self::STAFF_ACCESS_PERMISSION_FULL
                : self::STAFF_ACCESS_PERMISSION_READ_ONLY;
        }

        return static::normalizeStaffUserLevel($permissions[self::STAFF_USER_LEVEL_FLAG] ?? null) === self::STAFF_MANAGER_USER_LEVEL
            ? self::STAFF_ACCESS_PERMISSION_FULL
            : self::STAFF_ACCESS_PERMISSION_READ_ONLY;
    }

    public function hasStaffManagementPermission(): bool
    {
        return $this->getStaffAccessPermissionLevel() !== self::STAFF_ACCESS_PERMISSION_READ_ONLY;
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
            'super_premium' => 50,
            'premium' => 10,
            default => 3,
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
            'wallet',
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

        if (!$this->isWorkspaceAccessEnabled() || !$this->hasStaffManagementPermission()) {
            return false;
        }

        return in_array('hr', app(SellerEntitlementService::class)->getGrantedStaffModules($this), true);
    }

    public function canCreateStaffAccounts(): bool
    {
        if (!$this->canUpdateStaffAccounts()) {
            return false;
        }

        return $this->getStaffAccessPermissionLevel() === self::STAFF_ACCESS_PERMISSION_FULL;
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
        $defaultAddress = $this->getDefaultAddress();
        $candidates = [];
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

    // ========== RELATIONSHIPS ==========

    public function products()
    {
        return $this->hasMany(\App\Models\Product::class);
    }

    public function addresses()
    {
        return $this->hasMany(\App\Models\UserAddress::class);
    }

    public function wallet()
    {
        return $this->hasOne(\App\Models\Wallet::class);
    }

    public function sellerWalletWithdrawalRequests()
    {
        return $this->hasMany(\App\Models\SellerWalletWithdrawalRequest::class);
    }
    
    public function sponsorshipRequests()
    {
        return $this->hasMany(\App\Models\SponsorshipRequest::class);
    }

    public function sellerOwner()
    {
        return $this->belongsTo(self::class, 'seller_owner_id');
    }

    public function staffMembers()
    {
        return $this->hasMany(self::class, 'seller_owner_id')
            ->where('role', 'staff');
    }

    public function createdBy()
    {
        return $this->belongsTo(self::class, 'created_by_user_id');
    }

    public function employee()
    {
        return $this->belongsTo(\App\Models\Employee::class);
    }

    public function attendanceSessions()
    {
        return $this->hasMany(\App\Models\StaffAttendanceSession::class, 'staff_user_id');
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($user) {
            $firstNameChanged = $user->isDirty('first_name');
            $lastNameChanged = $user->isDirty('last_name');
            $nameChanged = $user->isDirty('name');

            if (!static::supportsSplitNameColumns()) {
                $normalized = PersonName::normalize(
                    $user->first_name,
                    $user->last_name,
                    $user->name,
                );

                if ($normalized['name'] !== '') {
                    $user->name = $normalized['name'];
                }

                unset($user->attributes['first_name'], $user->attributes['last_name']);

                return;
            }

            if ($nameChanged) {
                $normalized = PersonName::normalize(null, null, $user->name);
                $user->first_name = $normalized['first_name'];
                $user->last_name = $normalized['last_name'];

                return;
            }

            if ($firstNameChanged || $lastNameChanged) {
                $normalized = PersonName::normalize($user->first_name, $user->last_name);

                if ($normalized['name'] !== '') {
                    $user->name = $normalized['name'];
                }

                $user->first_name = $normalized['first_name'];
                $user->last_name = $normalized['last_name'];
            }
        });

        static::creating(function ($user) {
            if ($user->role === 'artisan' && !empty($user->shop_name)) {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            }
        });

        static::updating(function ($user) {
            // BUG-M6 Fix: Regenerate slug if empty and user is artisan
            if (empty($user->shop_slug) && !empty($user->shop_name) && $user->role === 'artisan') {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            } elseif ($user->isDirty('shop_name') && !empty($user->shop_name) && empty($user->shop_slug)) {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'shop_slug';
    }

    /**
     * @return array<string, mixed>
     */
    public static function persistableNameAttributes(array $normalizedName): array
    {
        $attributes = [
            'name' => $normalizedName['name'] ?? null,
        ];

        if (static::supportsSplitNameColumns()) {
            $attributes['first_name'] = $normalizedName['first_name'] ?? null;
            $attributes['last_name'] = $normalizedName['last_name'] ?? null;
        }

        return $attributes;
    }

    public static function supportsSplitNameColumns(): bool
    {
        if (static::$hasSplitNameColumns !== null) {
            return static::$hasSplitNameColumns;
        }

        try {
            /** @var SchemaBuilder $schema */
            $schema = Schema::connection((new static())->getConnectionName());
            static::$hasSplitNameColumns = $schema->hasColumns('users', ['first_name', 'last_name']);
        } catch (\Throwable) {
            static::$hasSplitNameColumns = false;
        }

        return static::$hasSplitNameColumns;
    }
}
