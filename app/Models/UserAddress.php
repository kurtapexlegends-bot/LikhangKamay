<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $label
 * @property string $address_type
 * @property string $recipient_name
 * @property string $phone_number
 * @property string $street_address
 * @property string $region
 * @property string $city
 * @property string $barangay
 * @property string|null $postal_code
 * @property string|null $full_address
 * @property bool $is_default
 */
class UserAddress extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'label',
        'address_type',
        'recipient_name',
        'phone_number',
        'street_address',
        'region',
        'city',
        'barangay',
        'postal_code',
        'full_address',
        'is_default',
    ];

    protected $casts = [
        'is_default' => \App\Casts\PostgresCompatibleBoolean::class,
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
