<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellerLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'address',
        'latitude',
        'longitude',
        'radius_meters',
        'enforce_strict_geofence',
        'daily_workplace_pin',
        'daily_pin_updated_at',
        'is_active',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'radius_meters' => 'integer',
        'enforce_strict_geofence' => 'boolean',
        'daily_pin_updated_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function getOrGenerateDailyPin(): string
    {
        if ($this->daily_workplace_pin && $this->daily_pin_updated_at && $this->daily_pin_updated_at->isToday()) {
            return $this->daily_workplace_pin;
        }

        $pin = str_pad((string) random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $this->update([
            'daily_workplace_pin' => $pin,
            'daily_pin_updated_at' => now(),
        ]);

        return $pin;
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'assigned_location_id');
    }
}
