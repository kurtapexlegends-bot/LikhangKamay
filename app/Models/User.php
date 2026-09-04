<?php

namespace App\Models;

use App\Services\SellerEntitlementService;
use App\Services\EmailVerificationCodeService;
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

use App\Traits\Searchable;
use App\Traits\HasTransformableImages;
use App\Models\Traits\ManagesStaffAccountFlags;
use App\Models\Traits\HasStaffCapabilities;
use App\Models\Traits\HasArtisanSubscriptions;
use App\Models\Traits\HasWorkspaceNotifications;

/**
 * @property int $id
 * @property string $name
 * @property string|null $first_name
 * @property string|null $last_name
 * @property string $email
 * @property string $password
 * @property string $role
 * @property int|null $seller_owner_id
 * @property string|null $shop_name
 * @property string|null $bio
 * @property string|null $avatar
 * @property string|null $phone_number
 * @property string|null $street_address
 * @property string|null $city
 * @property string|null $barangay
 * @property string|null $region
 * @property string|null $zip_code
 * @property string|null $business_permit
 * @property string|null $dti_registration
 * @property string|null $valid_id
 * @property string|null $tin_id
 * @property string|null $artisan_status
 * @property string|null $artisan_rejection_reason
 * @property string|null $premium_tier
 * @property string|null $payout_method
 * @property string|null $payout_account_name
 * @property string|null $payout_account_number
 * @property \Illuminate\Support\Carbon|null $setup_completed_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property bool $artisan_welcomed
 * @property array|null $staff_module_permissions
 * @property bool $must_change_password
 * @property \Illuminate\Support\Carbon|null $staff_plan_suspended_at
 * @property array|null $document_flags
 * @property int|null $employee_id
 * @property string|null $staff_role_preset_key
 * @property-read bool $can_edit_hr_records
 * @property-read bool $can_access_accounting
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class User extends Authenticatable implements AuthenticatableContract, MustVerifyEmail
{
    use HasFactory, Notifiable, HasTransformableImages, Searchable;
    use ManagesStaffAccountFlags, HasStaffCapabilities, HasArtisanSubscriptions, HasWorkspaceNotifications;

    protected static ?bool $hasSplitNameColumns = null;

    // Artisan Setup Fields
    protected $appends = ['avatar_url', 'banner_image_url'];

    public function getAvatarUrlAttribute()
    {
        if (!$this->avatar) return null;
        
        // Use Supabase Transformation to request a 200px width version
        return $this->getTransformedUrl($this->avatar, [
            'width' => 200,
            'height' => 200,
            'resize' => 'cover',
            'quality' => 80,
            'format' => 'webp'
        ]);
    }

    public function getBannerImageUrlAttribute()
    {
        if (!$this->banner_image) return null;
        
        return $this->getTransformedUrl($this->banner_image, [
            'width' => 1200,
            'quality' => 85,
            'format' => 'webp'
        ]);
    }

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
        'current_session_id',
        'current_device_uuid',
        'banned_at',
        'ban_reason',
        'warning_count',
        'warning_reason',
        'warned_at',
        'suspended_until',
        'suspension_reason',
        'suspended_at',
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
        'artisan_welcomed',
        // Payout Details
        'payout_method',
        'payout_account_name',
        'payout_account_number',
        // Social Auth Fields
        'social_provider',
        'social_id',
        'avatar',
        'email_verified_at',
        'last_seen_at',
        'overtime_rate',
        'overtime_multiplier',
        'payroll_factor_method',
        'rest_day_ot_multiplier',
        'holiday_ot_multiplier',
        'payroll_working_days',
        'default_absences',
        'default_undertime',
        'default_overtime',
        'base_funds',
        'premium_tier',
        'subscription_expires_at',
        'subscription_cancelled_at',
        'pending_downgrade_tier',
        'document_flags',
        'auto_reply_on_completion',
        'auto_reply_completion_message',
        'shift_start_time',
        'shift_end_time',
        'grace_period_minutes',
        'earliest_clock_in_minutes',
        'enforce_strict_shift_window',
        'break_window_start',
        'break_window_end',
        'break_allowance_minutes',
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
            'email_verification_code_expires_at' => 'datetime',
            'email_verification_code_sent_at' => 'datetime',
            'password' => 'hashed',
            'setup_completed_at' => 'datetime',
            'approved_at' => 'datetime',
            'subscription_expires_at' => 'datetime',
            'subscription_cancelled_at' => 'datetime',
            'modules_enabled' => 'array',
            'staff_module_permissions' => 'array',
            'must_change_password' => \App\Casts\PostgresCompatibleBoolean::class,
            'staff_plan_suspended_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'grace_period_minutes' => 'integer',
            'earliest_clock_in_minutes' => 'integer',
            'enforce_strict_shift_window' => \App\Casts\PostgresCompatibleBoolean::class,
            'break_allowance_minutes' => 'integer',
            'document_flags' => 'array',
            'banned_at' => 'datetime',
            'warning_count' => 'integer',
            'warned_at' => 'datetime',
            'suspended_until' => 'datetime',
            'suspended_at' => 'datetime',
            'auto_reply_on_completion' => \App\Casts\PostgresCompatibleBoolean::class,
        ];
    }

    /**
     * Disciplinary action audit logs relationship.
     */
    public function disciplinaryLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\UserDisciplinaryLog::class, 'user_id')->latest('created_at');
    }

    /**
     * Check if user is currently banned.
     */
    public function isBanned(): bool
    {
        return !is_null($this->banned_at);
    }

    /**
     * Check if user is currently under temporary suspension.
     */
    public function isSuspended(): bool
    {
        return !is_null($this->suspended_until) && $this->suspended_until->isFuture();
    }

    /**
     * Check if user has active warning notices.
     */
    public function isWarned(): bool
    {
        return ($this->warning_count ?? 0) > 0;
    }

    /**
     * Calculate days remaining in active temporary suspension.
     */
    public function daysRemainingSuspension(): int
    {
        if (!$this->isSuspended()) {
            return 0;
        }

        return max(1, (int) ceil(now()->floatDiffInDays($this->suspended_until, false)));
    }

    /**
     * Send the email verification notification using custom branded template.
     */
    public function sendEmailVerificationNotification(): void
    {
        [$code, $expiresAt] = app(EmailVerificationCodeService::class)->issue($this);
        $this->notifyNow(new \App\Notifications\VerifyEmailNotification($code, $expiresAt));
    }

    /**
     * Send the password reset notification using custom branded template.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notifyNow(new \App\Notifications\ResetPasswordNotification($token));
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

    public function isBuyer(): bool
    {
        return $this->role === 'buyer' || $this->role === null;
    }

    public function isSellerOwner(): bool
    {
        return $this->isArtisan();
    }

    // ========== RELATIONSHIPS ==========

    public function products()
    {
        return $this->hasMany(\App\Models\Product::class);
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function wishlistProducts()
    {
        return $this->belongsToMany(Product::class, 'wishlists', 'user_id', 'product_id')->withTimestamps();
    }

    public function followedShops()
    {
        return $this->hasMany(FollowedShop::class, 'user_id');
    }

    public function followingShops()
    {
        return $this->belongsToMany(User::class, 'followed_shops', 'user_id', 'shop_id')->withTimestamps();
    }

    public function shopFollowers()
    {
        return $this->belongsToMany(User::class, 'followed_shops', 'shop_id', 'user_id')->withTimestamps();
    }

    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }

    public function sponsorshipRequests()
    {
        return $this->hasMany(\App\Models\SponsorshipRequest::class);
    }

    public function complianceAgreements()
    {
        return $this->hasMany(\App\Models\SellerComplianceAgreement::class);
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

    public function driverDeliveries()
    {
        return $this->hasMany(\App\Models\OrderDelivery::class, 'driver_user_id');
    }

    public function sellerLocations()
    {
        return $this->hasMany(\App\Models\SellerLocation::class, 'user_id');
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
                $user->shop_slug = Str::slug($user->shop_name . '-' . Str::random(6));
            }
        });

        static::updating(function ($user) {
            // BUG-M6 Fix: Regenerate slug if empty and user is artisan
            if (empty($user->shop_slug) && !empty($user->shop_name) && $user->role === 'artisan') {
                $user->shop_slug = Str::slug($user->shop_name . '-' . Str::random(6));
            } elseif ($user->isDirty('shop_name') && !empty($user->shop_name) && empty($user->shop_slug)) {
                $user->shop_slug = Str::slug($user->shop_name . '-' . Str::random(6));
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

    protected static function booted()
    {
        static::saved(function ($user) {
            if ($user->role === 'artisan' || $user->getOriginal('role') === 'artisan') {
                \Illuminate\Support\Facades\Cache::forget('approved_artisans_list');
                \Illuminate\Support\Facades\Cache::forget('approved_artisans_search_list');
                \Illuminate\Support\Facades\Cache::forget('home_top_sellers');
            }
        });

        static::deleted(function ($user) {
            if ($user->role === 'artisan' || $user->getOriginal('role') === 'artisan') {
                \Illuminate\Support\Facades\Cache::forget('approved_artisans_list');
                \Illuminate\Support\Facades\Cache::forget('approved_artisans_search_list');
                \Illuminate\Support\Facades\Cache::forget('home_top_sellers');
            }
        });
    }
}
