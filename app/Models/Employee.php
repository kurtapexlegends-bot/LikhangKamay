<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $employee_id
 * @property string|null $name
 * @property string|null $role
 * @property float|string|null $salary
 * @property string|null $status
 * @property string|null $join_date
 * @property-read \App\Models\User|null $user
 * @property-read \App\Models\User|null $loginAccount
 */
class Employee extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $dates = ['deleted_at'];

    protected $fillable = [
        'user_id',
        'employee_id',
        'name',
        'role',
        'salary',
        'status',
        'join_date'
    ];

    // Optional: Relationship back to the Seller
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function loginAccount()
    {
        return $this->hasOne(User::class, 'employee_id');
    }
}
