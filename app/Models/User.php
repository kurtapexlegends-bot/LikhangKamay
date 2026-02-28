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
        // 'role', // REMOVED: Managed by system
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

    // ========== RELATIONSHIPS ==========

    public function products()
    {
        return $this->hasMany(\App\Models\Product::class);
    }

    public function addresses()
    {
        return $this->hasMany(\App\Models\UserAddress::class);
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
            if ($user->isDirty('shop_name') && !empty($user->shop_name)) {
                $user->shop_slug = \Illuminate\Support\Str::slug($user->shop_name . '-' . \Illuminate\Support\Str::random(6));
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'shop_slug';
    }
}