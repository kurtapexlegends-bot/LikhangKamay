<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'shop_name',
        'bio',
        'banner_image',
        // 'shop_slug', // REMOVED: Auto-generated
        // 'is_verified', // REMOVED: Managed by email verification
        // Artisan Setup Fields
        'phone_number',
        'street_address',
        'city',
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

    public function isBuyer(): bool
    {
        return $this->role === 'buyer' || $this->role === null;
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
        return $this->isArtisan() && $this->isApproved() && $this->setup_completed_at !== null;
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
        if (!$this->isArtisan()) {
            return false;
        }

        if (in_array($module, $this->getStandardSellerModules(), true)) {
            return true;
        }

        if (!$this->isPremiumTier()) {
            return false;
        }

        if ($module === 'sponsorships') {
            return $this->isEliteTier();
        }

        if ($this->isEliteTier()) {
            return in_array($module, $this->getAllSellerModules(), true);
        }

        $enabled = $this->getEnabledToggleableSellerModules();

        if ($module === 'stock_requests') {
            return in_array('procurement', $enabled, true);
        }

        return in_array($module, $enabled, true);
    }

    /**
     * Entitlements used by seller sidebar and server-side module access checks.
     *
     * @return array<string, mixed>
     */
    public function getSellerSidebarEntitlements(): array
    {
        $standardModules = $this->getStandardSellerModules();
        $toggleableModules = $this->isPremiumTier() ? $this->getToggleableSellerModules() : [];
        $enabledToggleableModules = $this->getEnabledToggleableSellerModules();

        if ($this->isEliteTier()) {
            $visibleModules = $this->getAllSellerModules();
        } elseif ($this->isPremiumTier()) {
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
            'tierLabel' => $this->getSellerTierLabel(),
            'visibleModules' => array_values(array_unique($visibleModules)),
            'toggleableModules' => $toggleableModules,
            'enabledToggleableModules' => $enabledToggleableModules,
            'showGear' => $this->isPremiumTier(),
            'allModulesUnlocked' => $this->isEliteTier(),
        ];
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
    
    public function sponsorshipRequests()
    {
        return $this->hasMany(\App\Models\SponsorshipRequest::class);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            if ($user->role === 'artisan' && !empty($user->shop_name)) {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            }
        });

        static::updating(function ($user) {
            if ($user->isDirty('shop_name') && !empty($user->shop_name) && empty($user->shop_slug)) {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'shop_slug';
    }
}
